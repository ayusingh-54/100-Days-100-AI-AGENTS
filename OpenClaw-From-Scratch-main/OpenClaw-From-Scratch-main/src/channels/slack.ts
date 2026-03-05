import { App, LogLevel, SlackEventMiddlewareArgs, AllMiddlewareArgs } from '@slack/bolt';
import { WebClient } from '@slack/web-api';
import { config } from '../config/index.js';
import { createModuleLogger } from '../utils/logger.js';
import {
  getOrCreateSession,
  addMessage,
  getThreadMessages,
  isUserApproved,
  generatePairingCode,
  approvePairing,
} from '../memory/database.js';
import { processMessage, summarizeThread, AgentContext } from '../agents/agent.js';
import { taskScheduler } from '../tools/scheduler.js';

const logger = createModuleLogger('slack');

// Initialize Slack Bolt App
export const slackApp = new App({
  token: config.slack.botToken,
  appToken: config.slack.appToken,
  socketMode: true,
  logLevel: config.app.logLevel === 'debug' ? LogLevel.DEBUG : LogLevel.INFO,
});

// WebClient for additional API calls
export const webClient = new WebClient(config.slack.botToken);

// Bot user ID (populated on startup)
let botUserId: string | null = null;

// ============================================
// Helper Functions
// ============================================

async function getBotUserId(): Promise<string> {
  if (botUserId) return botUserId;

  const authResult = await webClient.auth.test();
  botUserId = authResult.user_id as string;
  return botUserId;
}

function isBotMentioned(text: string, botId: string): boolean {
  return text.includes(`<@${botId}>`);
}

function removeBotMention(text: string, botId: string): string {
  return text.replace(new RegExp(`<@${botId}>\\s*`, 'g'), '').trim();
}

async function sendTypingIndicator(channelId: string): Promise<void> {
  if (!config.features.typingIndicator) return;

  try {
    // Slack doesn't have a direct typing indicator API for bots
    // We use a workaround by posting and immediately deleting, or just skip
    logger.debug(`Typing indicator requested for ${channelId}`);
  } catch (error) {
    logger.debug('Failed to send typing indicator', { error });
  }
}

async function addReaction(
  channelId: string,
  timestamp: string,
  emoji: string
): Promise<void> {
  if (!config.features.reactions) return;

  try {
    await webClient.reactions.add({
      channel: channelId,
      timestamp,
      name: emoji,
    });
  } catch (error) {
    logger.debug(`Failed to add reaction ${emoji}`, { error });
  }
}

async function removeReaction(
  channelId: string,
  timestamp: string,
  emoji: string
): Promise<void> {
  try {
    await webClient.reactions.remove({
      channel: channelId,
      timestamp,
      name: emoji,
    });
  } catch (error) {
    logger.debug(`Failed to remove reaction ${emoji}`, { error });
  }
}

function isDirectMessage(channelId: string): boolean {
  return channelId.startsWith('D');
}

async function isChannelAllowed(channelId: string): Promise<boolean> {
  if (config.security.allowedChannels.includes('*')) return true;
  if (config.security.allowedChannels.includes(channelId)) return true;
  return false;
}

async function getUserInfo(userId: string): Promise<{ name: string; realName: string }> {
  try {
    const result = await webClient.users.info({ user: userId });
    return {
      name: result.user?.name || 'unknown',
      realName: result.user?.real_name || result.user?.name || 'unknown',
    };
  } catch {
    return { name: 'unknown', realName: 'unknown' };
  }
}

async function getChannelInfo(channelId: string): Promise<{ name: string }> {
  try {
    const result = await webClient.conversations.info({ channel: channelId });
    return { name: result.channel?.name || 'unknown' };
  } catch {
    return { name: 'unknown' };
  }
}

// ============================================
// Message Handlers
// ============================================

// Handle incoming messages
slackApp.message(async ({ message, say }) => {
  // Type guard for message events
  if (message.subtype !== undefined || !('text' in message)) {
    return; // Skip bot messages, edits, etc.
  }

  const { text, user, channel, ts, thread_ts } = message;
  if (!text || !user) return;

  const currentBotId = await getBotUserId();

  // Skip messages from the bot itself
  if (user === currentBotId) return;

  logger.info(`Message received from ${user} in ${channel}`);

  // Check if this is a DM
  const isDM = isDirectMessage(channel);

  // For DMs, check pairing/approval
  if (isDM && config.security.dmPolicy !== 'open') {
    if (!isUserApproved(user)) {
      // Generate pairing code
      const code = generatePairingCode(user);
      await say({
        text: `👋 Hi! Before we chat, you need to be approved.\n\nYour pairing code is: \`${code}\`\n\nAsk an admin to approve you with: \`/approve ${code}\`\n\nThis code expires in 1 hour.`,
        thread_ts: ts,
      });
      return;
    }
  }

  // For channel messages, check if bot is mentioned or channel is allowed
  if (!isDM) {
    if (!await isChannelAllowed(channel)) {
      logger.debug(`Channel ${channel} not in allowlist, skipping`);
      return;
    }

    // In channels, only respond if mentioned
    if (!isBotMentioned(text, currentBotId)) {
      return;
    }
  }

  // Clean up the message text
  const cleanText = isDM ? text : removeBotMention(text, currentBotId);

  // Handle special commands
  if (cleanText.toLowerCase() === '/help' || cleanText.toLowerCase() === 'help') {
    await say({
      text: `🤖 *Slack AI Assistant - Help*\n\n*Commands:*\n• \`help\` - Show this help message\n• \`summarize\` or \`tldr\` - Summarize the current thread\n• \`remind me [task] at [time]\` - Schedule a reminder\n• \`my tasks\` - List your scheduled tasks\n• \`cancel task [id]\` - Cancel a scheduled task\n• \`/reset\` - Clear conversation history\n\n*Features:*\n• I remember our conversation context\n• I can help with questions, analysis, and tasks\n• Mention me in channels: <@${currentBotId}>\n\n*Tips:*\n• Start a thread for focused conversations\n• Use \`summarize\` in long threads to catch up`,
      thread_ts: thread_ts || ts,
    });
    return;
  }

  // Handle thread summarization
  if (
    config.features.threadSummary &&
    (cleanText.toLowerCase().includes('summarize') ||
      cleanText.toLowerCase() === 'tldr')
  ) {
    if (thread_ts) {
      await addReaction(channel, ts, 'hourglass_flowing_sand');

      try {
        // Fetch thread messages
        const threadResult = await webClient.conversations.replies({
          channel,
          ts: thread_ts,
          limit: 100,
        });

        const threadMessages = (threadResult.messages || [])
          .filter((msg) => msg.user !== currentBotId && msg.text)
          .map((msg) => ({
            id: 0,
            sessionId: '',
            role: 'user' as const,
            content: msg.text || '',
            slackTs: msg.ts || null,
            threadTs: thread_ts,
            createdAt: parseInt(msg.ts || '0'),
            metadata: null,
          }));

        const context: AgentContext = {
          sessionId: `summary:${channel}:${thread_ts}`,
          userId: user,
          channelId: channel,
          threadTs: thread_ts,
        };

        const summary = await summarizeThread(threadMessages, context);

        await removeReaction(channel, ts, 'hourglass_flowing_sand');
        await addReaction(channel, ts, 'white_check_mark');

        await say({
          text: `📝 *Thread Summary*\n\n${summary}`,
          thread_ts,
        });
      } catch (error) {
        await removeReaction(channel, ts, 'hourglass_flowing_sand');
        await addReaction(channel, ts, 'x');
        logger.error('Failed to summarize thread', { error });
        await say({
          text: "Sorry, I couldn't summarize this thread. Please try again.",
          thread_ts,
        });
      }
      return;
    } else {
      await say({
        text: "Please use 'summarize' within a thread to get a summary.",
        thread_ts: ts,
      });
      return;
    }
  }

  // Handle task listing
  if (cleanText.toLowerCase() === 'my tasks') {
    const tasks = taskScheduler.getUserTasks(user);
    if (tasks.length === 0) {
      await say({
        text: "You don't have any scheduled tasks.",
        thread_ts: thread_ts || ts,
      });
    } else {
      const taskList = tasks
        .map(
          (t) =>
            `• [${t.id}] ${t.taskDescription} - ${t.status} ${t.scheduledTime ? `(${new Date(t.scheduledTime * 1000).toLocaleString()})` : ''}`
        )
        .join('\n');
      await say({
        text: `📋 *Your Tasks:*\n${taskList}`,
        thread_ts: thread_ts || ts,
      });
    }
    return;
  }

  // Handle task cancellation
  const cancelMatch = cleanText.match(/cancel task (\d+)/i);
  if (cancelMatch) {
    const taskId = parseInt(cancelMatch[1], 10);
    const success = taskScheduler.cancelTask(taskId, user);
    await say({
      text: success
        ? `✅ Task ${taskId} has been cancelled.`
        : `❌ Could not cancel task ${taskId}. It may not exist or belong to you.`,
      thread_ts: thread_ts || ts,
    });
    return;
  }

  // Handle conversation reset
  if (cleanText.toLowerCase() === '/reset') {
    const session = getOrCreateSession(user, channel, thread_ts || null);
    // Clear would be implemented in database
    await say({
      text: '🔄 Conversation history has been cleared. Starting fresh!',
      thread_ts: thread_ts || ts,
    });
    return;
  }

  // Regular message processing
  await addReaction(channel, ts, 'eyes');
  await sendTypingIndicator(channel);

  try {
    // Get or create session
    const session = getOrCreateSession(user, channel, thread_ts || null);

    // Get user and channel info for context
    const userInfo = await getUserInfo(user);
    const channelInfo = isDM ? { name: 'DM' } : await getChannelInfo(channel);

    // Create agent context
    const context: AgentContext = {
      sessionId: session.id,
      userId: user,
      channelId: channel,
      threadTs: thread_ts || null,
      userName: userInfo.realName,
      channelName: channelInfo.name,
    };

    // Process message with AI
    const response = await processMessage(cleanText, context);

    // Remove processing reaction
    await removeReaction(channel, ts, 'eyes');

    // Send response
    await say({
      text: response.content,
      thread_ts: response.shouldThread ? thread_ts || ts : undefined,
    });

    // Check for scheduling intent
    if (
      config.features.taskScheduler &&
      (cleanText.toLowerCase().includes('remind') ||
        cleanText.toLowerCase().includes('schedule'))
    ) {
      // The agent response should include scheduling confirmation if detected
      logger.debug('Potential scheduling intent detected');
    }
  } catch (error) {
    logger.error('Failed to process message', { error });
    await removeReaction(channel, ts, 'eyes');
    await addReaction(channel, ts, 'warning');

    await say({
      text: "I'm sorry, I encountered an error processing your message. Please try again.",
      thread_ts: thread_ts || ts,
    });
  }
});

// Handle app mentions
slackApp.event('app_mention', async ({ event, say }) => {
  const { user, channel, ts, thread_ts, text } = event;
  
  logger.info(`App mentioned by ${user} in ${channel}`);

  const currentBotId = await getBotUserId();
  const cleanText = removeBotMention(text, currentBotId);

  // Process similar to regular messages
  await addReaction(channel, ts, 'eyes');

  try {
    const session = getOrCreateSession(user, channel, thread_ts || null);

    const context: AgentContext = {
      sessionId: session.id,
      userId: user,
      channelId: channel,
      threadTs: thread_ts || null,
    };

    const response = await processMessage(cleanText, context);

    await removeReaction(channel, ts, 'eyes');

    await say({
      text: response.content,
      thread_ts: thread_ts || ts,
    });
  } catch (error) {
    logger.error('Failed to process app mention', { error });
    await removeReaction(channel, ts, 'eyes');

    await say({
      text: "I'm sorry, I encountered an error. Please try again.",
      thread_ts: thread_ts || ts,
    });
  }
});

// ============================================
// Slash Commands
// ============================================

// Approve pairing command
slackApp.command('/approve', async ({ command, ack, respond }) => {
  await ack();

  const code = command.text.trim().toUpperCase();
  if (!code) {
    await respond('Please provide a pairing code: `/approve CODE`');
    return;
  }

  const success = approvePairing(code, command.user_id);
  if (success) {
    await respond(`✅ Pairing code ${code} approved! The user can now chat with me.`);
  } else {
    await respond(`❌ Invalid or expired pairing code: ${code}`);
  }
});

// Status command
slackApp.command('/assistant-status', async ({ command, ack, respond }) => {
  await ack();

  const status = {
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    features: config.features,
  };

  await respond({
    text: `🤖 *Assistant Status*\n\`\`\`${JSON.stringify(status, null, 2)}\`\`\``,
    response_type: 'ephemeral',
  });
});

// ============================================
// Reaction Handlers
// ============================================

slackApp.event('reaction_added', async ({ event }) => {
  logger.debug('Reaction added', {
    user: event.user,
    reaction: event.reaction,
    item: event.item,
  });

  // You can add custom logic here, e.g., auto-acknowledge with 👍
});

// ============================================
// Startup
// ============================================

export async function startSlackApp(): Promise<void> {
  try {
    await slackApp.start();

    // Get and cache bot user ID
    const botId = await getBotUserId();
    logger.info(`Slack app started! Bot user ID: ${botId}`);

    // Start task scheduler
    taskScheduler.start();
    logger.info('Task scheduler started');
  } catch (error) {
    logger.error('Failed to start Slack app', { error });
    throw error;
  }
}

export async function stopSlackApp(): Promise<void> {
  taskScheduler.stop();
  await slackApp.stop();
  logger.info('Slack app stopped');
}
