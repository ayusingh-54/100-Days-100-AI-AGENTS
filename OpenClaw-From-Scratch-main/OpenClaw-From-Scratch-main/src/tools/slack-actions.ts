import { WebClient } from '@slack/web-api';
import { config } from '../config/index.js';
import { createModuleLogger } from '../utils/logger.js';

const logger = createModuleLogger('slack-actions');

// Initialize Slack client with logging
const webClient = new WebClient(config.slack.botToken, {
  logLevel: config.app.logLevel === 'debug' ? 'DEBUG' : 'INFO',
});

// User client for reminders (requires xoxp- token)
const userClient = config.slack.userToken 
  ? new WebClient(config.slack.userToken)
  : null;

// Log the token prefix for debugging (safe - doesn't expose full token)
logger.info(`Slack client initialized with token: ${config.slack.botToken.substring(0, 10)}...`);
if (userClient) {
  logger.info(`User client initialized for reminders: ${config.slack.userToken!.substring(0, 10)}...`);
} else {
  logger.warn('No SLACK_USER_TOKEN configured - reminders will use scheduled DMs instead');
}

// ============================================
// Types
// ============================================

export interface SlackMessage {
  ts: string;
  user: string;
  userName?: string;
  text: string;
  threadTs?: string;
  timestamp: Date;
  reactions?: { name: string; count: number }[];
}

export interface SlackChannel {
  id: string;
  name: string;
  isPrivate: boolean;
  isMember: boolean;
}

export interface SlackUser {
  id: string;
  name: string;
  realName: string;
  email?: string;
}

// ============================================
// User Operations
// ============================================

/**
 * Get user info by ID
 */
export async function getUserInfo(userId: string): Promise<SlackUser | null> {
  try {
    const result = await webClient.users.info({ user: userId });
    if (!result.user) return null;

    return {
      id: result.user.id!,
      name: result.user.name || 'unknown',
      realName: result.user.real_name || result.user.name || 'unknown',
      email: result.user.profile?.email,
    };
  } catch (error) {
    logger.error(`Failed to get user info for ${userId}`, { error });
    return null;
  }
}

/**
 * Find user by name, email, or display name
 */
export async function findUser(query: string): Promise<SlackUser | null> {
  try {
    const result = await webClient.users.list({});
    const users = result.members || [];

    // Search by name, real_name, or email
    const queryLower = query.toLowerCase().replace('@', '');
    const found = users.find(
      (u) =>
        u.name?.toLowerCase() === queryLower ||
        u.real_name?.toLowerCase().includes(queryLower) ||
        u.profile?.display_name?.toLowerCase() === queryLower ||
        u.profile?.email?.toLowerCase() === queryLower
    );

    if (!found) return null;

    return {
      id: found.id!,
      name: found.name || 'unknown',
      realName: found.real_name || found.name || 'unknown',
      email: found.profile?.email,
    };
  } catch (error) {
    logger.error(`Failed to find user: ${query}`, { error });
    return null;
  }
}

/**
 * List all users in workspace
 */
export async function listUsers(): Promise<SlackUser[]> {
  try {
    const result = await webClient.users.list({});
    return (result.members || [])
      .filter((u) => !u.is_bot && !u.deleted && u.id !== 'USLACKBOT')
      .map((u) => ({
        id: u.id!,
        name: u.name || 'unknown',
        realName: u.real_name || u.name || 'unknown',
        email: u.profile?.email,
      }));
  } catch (error) {
    logger.error('Failed to list users', { error });
    return [];
  }
}

// ============================================
// Channel Operations
// ============================================

/**
 * List all channels the bot has access to
 */
export async function listChannels(): Promise<SlackChannel[]> {
  try {
    // Get all public and private channels
    const result = await webClient.conversations.list({
      types: 'public_channel,private_channel',
      exclude_archived: true,
      limit: 200,
    });

    const channels = (result.channels || []).map((c) => ({
      id: c.id!,
      name: c.name || 'unknown',
      isPrivate: c.is_private || false,
      isMember: c.is_member || false,
    }));
    
    logger.info(`Found ${channels.length} channels, ${channels.filter(c => c.isMember).length} where bot is member`);
    
    return channels;
  } catch (error: any) {
    logger.error('Failed to list channels', { error: error?.data || error });
    return [];
  }
}

/**
 * Find channel by name
 */
export async function findChannel(nameOrId: string): Promise<SlackChannel | null> {
  const channels = await listChannels();
  const searchTerm = nameOrId.toLowerCase().replace('#', '').trim();
  
  logger.info(`Searching for channel: "${searchTerm}" among ${channels.length} channels`);
  
  // Try to match by name first
  let found = channels.find((c) => c.name.toLowerCase() === searchTerm);
  
  // If not found, try to match by ID (case-insensitive for convenience)
  if (!found) {
    found = channels.find((c) => c.id.toLowerCase() === searchTerm);
  }
  
  if (found) {
    logger.info(`Found channel: ${found.name} (ID: ${found.id}, isMember: ${found.isMember})`);
  } else {
    logger.warn(`Channel not found: "${searchTerm}". Available: ${channels.map(c => c.name).join(', ')}`);
  }
  
  return found || null;
}

// ============================================
// Message Sending
// ============================================

/**
 * Send a direct message to a user
 */
export async function sendDirectMessage(
  userId: string,
  message: string
): Promise<{ success: boolean; ts?: string; error?: string }> {
  try {
    logger.info(`Opening DM channel with user: ${userId}`);
    
    // Open DM channel with user
    const dmResult = await webClient.conversations.open({ users: userId });
    if (!dmResult.channel?.id) {
      logger.error(`Could not open DM channel with ${userId}`);
      return { success: false, error: 'Could not open DM channel with this user' };
    }

    logger.info(`DM channel opened: ${dmResult.channel.id}, sending message...`);
    
    // Send message
    const msgResult = await webClient.chat.postMessage({
      channel: dmResult.channel.id,
      text: message,
    });

    logger.info(`DM sent successfully to ${userId}, ts: ${msgResult.ts}`);
    return { success: true, ts: msgResult.ts };
  } catch (error: any) {
    const slackError = error?.data?.error || error?.message || String(error);
    logger.error(`Failed to send DM to ${userId}: ${slackError}`, { error: error?.data || error });
    
    const errorMessages: Record<string, string> = {
      'user_not_found': 'User not found.',
      'cannot_dm_bot': 'Cannot send direct messages to bot users.',
      'missing_scope': `Missing permission: ${error?.data?.needed}. Add im:write scope.`,
    };
    
    const friendlyError = errorMessages[slackError] || `Failed to send DM: ${slackError}`;
    return { success: false, error: friendlyError };
  }
}

/**
 * Send a message to a channel
 */
export async function sendChannelMessage(
  channelId: string,
  message: string,
  threadTs?: string
): Promise<{ success: boolean; ts?: string; error?: string }> {
  try {
    logger.info(`Attempting to post message to channel: ${channelId}`);
    
    const result = await webClient.chat.postMessage({
      channel: channelId,
      text: message,
      thread_ts: threadTs,
    });

    logger.info(`Message sent successfully to ${channelId}, ts: ${result.ts}`);
    return { success: true, ts: result.ts };
  } catch (error: any) {
    const slackError = error?.data?.error || error?.message || String(error);
    logger.error(`Failed to send message to ${channelId}: ${slackError}`, { 
      error: error?.data || error 
    });
    
    // Provide helpful error messages
    const errorMessages: Record<string, string> = {
      'channel_not_found': 'Channel not found. The channel may not exist or the bot cannot see it.',
      'not_in_channel': 'Bot is not a member of this channel. Use /invite @AI Assistant in the channel.',
      'is_archived': 'This channel is archived and cannot receive messages.',
      'msg_too_long': 'Message is too long. Try a shorter message.',
      'no_text': 'Message cannot be empty.',
      'restricted_action': 'Bot does not have permission to post in this channel.',
      'missing_scope': `Missing permission scope: ${error?.data?.needed || 'unknown'}`,
      'invalid_auth': 'Invalid bot token. Check SLACK_BOT_TOKEN in .env file.',
      'account_inactive': 'Bot account is inactive.',
    };
    
    const friendlyError = errorMessages[slackError] || `Slack API error: ${slackError}`;
    return { success: false, error: friendlyError };
  }
}

/**
 * Send message to user or channel by name
 */
export async function sendMessage(
  target: string,
  message: string
): Promise<{ success: boolean; ts?: string; error?: string }> {
  logger.info(`sendMessage called with target: "${target}"`);
  
  // Check if it's a channel (starts with # or C)
  if (target.startsWith('#') || target.startsWith('C')) {
    const channelName = target.replace('#', '');
    logger.info(`Looking for channel: ${channelName}`);
    
    const channel = await findChannel(channelName);
    if (!channel) {
      logger.error(`Channel not found: ${target}`);
      return { success: false, error: `Channel not found: ${target}. Use "list channels" to see available channels.` };
    }
    
    logger.info(`Found channel: ${channel.name} (ID: ${channel.id}, isMember: ${channel.isMember})`);
    
    if (!channel.isMember) {
      return { 
        success: false, 
        error: `I'm not a member of #${channel.name}. Please invite me with: /invite @AI Assistant` 
      };
    }
    
    return sendChannelMessage(channel.id, message);
  }

  // Otherwise, treat as user
  logger.info(`Looking for user: ${target}`);
  let user = await findUser(target);
  if (!user && target.startsWith('U')) {
    // It's a user ID
    const userInfo = await getUserInfo(target);
    if (userInfo) user = userInfo;
  }

  if (!user) {
    logger.error(`User not found: ${target}`);
    return { success: false, error: `User not found: ${target}. Use "list users" to see available users.` };
  }

  logger.info(`Found user: ${user.realName} (ID: ${user.id})`);
  return sendDirectMessage(user.id, message);
}

// ============================================
// Conversation History Retrieval
// ============================================

/**
 * Get conversation history from a channel
 */
export async function getChannelHistory(
  channelId: string,
  limit: number = 50
): Promise<SlackMessage[]> {
  try {
    logger.info(`Fetching conversation history for channel: ${channelId}, limit: ${limit}`);
    
    const result = await webClient.conversations.history({
      channel: channelId,
      limit,
    });

    logger.info(`Got ${result.messages?.length || 0} messages from channel ${channelId}`);

    const messages: SlackMessage[] = [];

    for (const msg of result.messages || []) {
      if (!msg.text || msg.subtype) continue; // Skip system messages

      // Get user name
      let userName = 'unknown';
      if (msg.user) {
        const userInfo = await getUserInfo(msg.user);
        userName = userInfo?.realName || userInfo?.name || 'unknown';
      }

      messages.push({
        ts: msg.ts!,
        user: msg.user || 'unknown',
        userName,
        text: msg.text,
        threadTs: msg.thread_ts,
        timestamp: new Date(parseFloat(msg.ts!) * 1000),
        reactions: msg.reactions?.map((r) => ({ name: r.name!, count: r.count! })),
      });
    }

    return messages.reverse(); // Oldest first
  } catch (error: any) {
    const slackError = error?.data?.error || error?.message || String(error);
    logger.error(`Failed to get history for ${channelId}: ${slackError}`, { error: error?.data || error });
    
    // Throw with a helpful message
    if (slackError === 'channel_not_found') {
      throw new Error('Channel not found or bot does not have access');
    }
    if (slackError === 'not_in_channel') {
      throw new Error('Bot is not a member of this channel. Use /invite @AI Assistant');
    }
    if (slackError === 'missing_scope') {
      throw new Error(`Missing permission: ${error?.data?.needed}. Add channels:history or groups:history scope.`);
    }
    
    throw new Error(slackError);
  }
}

/**
 * Get DM history with a specific user
 */
export async function getDMHistory(
  userId: string,
  limit: number = 50
): Promise<SlackMessage[]> {
  try {
    // Open/get DM channel
    const dmResult = await webClient.conversations.open({ users: userId });
    if (!dmResult.channel?.id) {
      logger.error(`Could not open DM channel with ${userId}`);
      return [];
    }

    return getChannelHistory(dmResult.channel.id, limit);
  } catch (error) {
    logger.error(`Failed to get DM history with ${userId}`, { error });
    return [];
  }
}

/**
 * Get conversation history with a user by name
 */
export async function getConversationWith(
  userName: string,
  limit: number = 50
): Promise<{ user: SlackUser | null; messages: SlackMessage[] }> {
  const user = await findUser(userName);
  if (!user) {
    return { user: null, messages: [] };
  }

  const messages = await getDMHistory(user.id, limit);
  return { user, messages };
}

/**
 * Get thread replies
 */
export async function getThreadReplies(
  channelId: string,
  threadTs: string,
  limit: number = 100
): Promise<SlackMessage[]> {
  try {
    const result = await webClient.conversations.replies({
      channel: channelId,
      ts: threadTs,
      limit,
    });

    const messages: SlackMessage[] = [];

    for (const msg of result.messages || []) {
      if (!msg.text) continue;

      let userName = 'unknown';
      if (msg.user) {
        const userInfo = await getUserInfo(msg.user);
        userName = userInfo?.realName || userInfo?.name || 'unknown';
      }

      messages.push({
        ts: msg.ts!,
        user: msg.user || 'unknown',
        userName,
        text: msg.text,
        threadTs: msg.thread_ts,
        timestamp: new Date(parseFloat(msg.ts!) * 1000),
      });
    }

    return messages;
  } catch (error) {
    logger.error(`Failed to get thread replies`, { error });
    return [];
  }
}

// ============================================
// Search
// ============================================

/**
 * Search messages (requires search:read scope - user token)
 * Note: Bot tokens can't search, so we do manual filtering
 */
export async function searchMessages(
  query: string,
  channelId?: string,
  limit: number = 20
): Promise<SlackMessage[]> {
  try {
    // If channel specified, search within that channel
    if (channelId) {
      const history = await getChannelHistory(channelId, 200);
      const queryLower = query.toLowerCase();
      return history
        .filter((msg) => msg.text.toLowerCase().includes(queryLower))
        .slice(0, limit);
    }

    // Otherwise search across all accessible channels
    const channels = await listChannels();
    const memberChannels = channels.filter((c) => c.isMember);

    const results: SlackMessage[] = [];
    const queryLower = query.toLowerCase();

    for (const channel of memberChannels.slice(0, 10)) {
      // Limit to 10 channels
      const history = await getChannelHistory(channel.id, 100);
      const matches = history.filter((msg) =>
        msg.text.toLowerCase().includes(queryLower)
      );
      results.push(...matches);

      if (results.length >= limit) break;
    }

    return results.slice(0, limit);
  } catch (error) {
    logger.error(`Failed to search messages: ${query}`, { error });
    return [];
  }
}

// ============================================
// Message Formatting Helpers
// ============================================

/**
 * Format messages for AI context
 */
export function formatMessagesForContext(messages: SlackMessage[]): string {
  return messages
    .map((msg) => {
      const time = msg.timestamp.toLocaleString();
      return `[${time}] ${msg.userName}: ${msg.text}`;
    })
    .join('\n');
}

/**
 * Create a permalink to a message
 */
export async function getMessagePermalink(
  channelId: string,
  messageTs: string
): Promise<string | null> {
  try {
    const result = await webClient.chat.getPermalink({
      channel: channelId,
      message_ts: messageTs,
    });
    return result.permalink || null;
  } catch (error) {
    logger.error('Failed to get permalink', { error });
    return null;
  }
}

// ============================================
// Scheduled Messages
// ============================================

/**
 * Schedule a message to be sent later
 */
export async function scheduleMessage(
  target: string,
  message: string,
  sendAt: Date
): Promise<{ success: boolean; scheduledMessageId?: string; error?: string }> {
  try {
    // Convert Date to Unix timestamp (seconds)
    const postAt = Math.floor(sendAt.getTime() / 1000);
    const now = Math.floor(Date.now() / 1000);
    
    logger.info(`scheduleMessage called:`);
    logger.info(`  Target: ${target}`);
    logger.info(`  Message: ${message}`);
    logger.info(`  Send at: ${sendAt.toISOString()} (Unix: ${postAt})`);
    logger.info(`  Now: ${new Date().toISOString()} (Unix: ${now})`);
    logger.info(`  Difference: ${postAt - now} seconds`);
    
    // Ensure it's in the future (at least 1 minute from now)
    if (postAt <= now + 60) {
      logger.error(`Time too soon: postAt=${postAt}, now+60=${now + 60}`);
      return { success: false, error: `Scheduled time must be at least 1 minute in the future. You specified ${sendAt.toISOString()} but current time is ${new Date().toISOString()}` };
    }

    let channelId: string;

    // Clean up target - remove # prefix if present
    const cleanTarget = target.replace(/^#/, '').trim();
    
    // Check if it's a channel ID (starts with C) or channel name
    if (cleanTarget.startsWith('C') && cleanTarget.length > 8) {
      // It's already a channel ID
      channelId = cleanTarget;
      logger.info(`  Using channel ID directly: ${channelId}`);
    } else if (target.startsWith('@') || target.startsWith('U')) {
      // It's a user
      const userTarget = target.replace(/^@/, '');
      const user = await findUser(userTarget);
      if (!user) {
        return { success: false, error: `User not found: ${target}` };
      }
      const dmResult = await webClient.conversations.open({ users: user.id });
      if (!dmResult.channel?.id) {
        return { success: false, error: 'Could not open DM channel' };
      }
      channelId = dmResult.channel.id;
      logger.info(`  Resolved DM channel: ${channelId} for user ${user.realName}`);
    } else {
      // It's a channel name - look it up
      const channel = await findChannel(cleanTarget);
      if (!channel) {
        return { success: false, error: `Channel not found: ${target}` };
      }
      if (!channel.isMember) {
        return { success: false, error: `I'm not a member of #${channel.name}. Please invite me first.` };
      }
      channelId = channel.id;
      logger.info(`  Resolved channel: ${channel.name} (${channelId})`);
    }

    logger.info(`Calling Slack chat.scheduleMessage API with channel: ${channelId}`);

    const result = await webClient.chat.scheduleMessage({
      channel: channelId,
      text: message,
      post_at: postAt,
    });

    logger.info(`Message scheduled successfully, ID: ${result.scheduled_message_id}`);
    return { success: true, scheduledMessageId: result.scheduled_message_id };
  } catch (error: any) {
    const slackError = error?.data?.error || error?.message || String(error);
    logger.error(`Failed to schedule message: ${slackError}`, { error: error?.data || error });
    
    const errorMessages: Record<string, string> = {
      'time_in_past': 'The scheduled time is in the past. Please choose a future time.',
      'time_too_far': 'The scheduled time is too far in the future (max 120 days).',
      'channel_not_found': 'Channel not found.',
      'not_in_channel': 'Bot is not a member of this channel.',
      'invalid_time': 'Invalid time format.',
    };
    
    return { success: false, error: errorMessages[slackError] || slackError };
  }
}

/**
 * List scheduled messages
 */
export async function listScheduledMessages(
  channelId?: string
): Promise<{ id: string; channelId: string; text: string; postAt: Date }[]> {
  try {
    const result = await webClient.chat.scheduledMessages.list({
      channel: channelId,
    });

    return (result.scheduled_messages || []).map((msg: any) => ({
      id: msg.id,
      channelId: msg.channel_id,
      text: msg.text,
      postAt: new Date(msg.post_at * 1000),
    }));
  } catch (error: any) {
    logger.error('Failed to list scheduled messages', { error: error?.data || error });
    return [];
  }
}

/**
 * Delete a scheduled message
 */
export async function deleteScheduledMessage(
  channelId: string,
  scheduledMessageId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await webClient.chat.deleteScheduledMessage({
      channel: channelId,
      scheduled_message_id: scheduledMessageId,
    });
    return { success: true };
  } catch (error: any) {
    const slackError = error?.data?.error || error?.message || String(error);
    logger.error(`Failed to delete scheduled message: ${slackError}`);
    return { success: false, error: slackError };
  }
}

// ============================================
// Reminders
// ============================================

/**
 * Set a reminder for a user
 * Requires user token (xoxp-) with reminders:write scope
 * Falls back to scheduled DM if no user token
 */
export async function setReminder(
  userId: string,
  text: string,
  time: Date | string
): Promise<{ success: boolean; reminderId?: string; error?: string; fallbackUsed?: boolean }> {
  // If no user token, return error indicating fallback should be used
  if (!userClient) {
    logger.warn('No user token available for reminders API');
    return { 
      success: false, 
      error: 'NO_USER_TOKEN',
      fallbackUsed: false 
    };
  }

  try {
    // Time can be a Date or a natural language string like "in 5 minutes", "tomorrow at 9am"
    let timeParam: string | number;
    
    if (time instanceof Date) {
      timeParam = Math.floor(time.getTime() / 1000);
    } else {
      // Natural language time - Slack can parse this
      timeParam = time;
    }

    logger.info(`Setting reminder for user ${userId}: "${text}" at ${time}`);

    const result = await userClient.reminders.add({
      user: userId,
      text: text,
      time: timeParam,
    });

    logger.info(`Reminder set successfully, ID: ${result.reminder?.id}`);
    return { success: true, reminderId: result.reminder?.id };
  } catch (error: any) {
    const slackError = error?.data?.error || error?.message || String(error);
    logger.error(`Failed to set reminder: ${slackError}`, { error: error?.data || error });
    
    const errorMessages: Record<string, string> = {
      'cannot_parse': 'Could not understand the time. Try "in 5 minutes" or "tomorrow at 9am".',
      'time_in_past': 'The reminder time is in the past.',
      'user_not_found': 'User not found.',
      'missing_scope': 'Missing permission: reminders:write. Please add this scope to the Slack app.',
      'not_allowed_token_type': 'Reminders require a User Token (xoxp-). Please configure SLACK_USER_TOKEN.',
    };
    
    return { success: false, error: errorMessages[slackError] || slackError };
  }
}

/**
 * List reminders for a user
 * Requires user token (xoxp-) with reminders:read scope
 */
export async function listReminders(): Promise<{ id: string; text: string; time: Date; complete: boolean }[]> {
  if (!userClient) {
    logger.warn('No user token available for reminders API');
    return [];
  }

  try {
    const result = await userClient.reminders.list();
    
    return (result.reminders || []).map((r: any) => ({
      id: r.id,
      text: r.text,
      time: new Date(r.time * 1000),
      complete: r.complete_ts > 0,
    }));
  } catch (error: any) {
    logger.error('Failed to list reminders', { error: error?.data || error });
    return [];
  }
}

/**
 * Delete a reminder
 * Requires user token (xoxp-) with reminders:write scope
 */
export async function deleteReminder(
  reminderId: string
): Promise<{ success: boolean; error?: string }> {
  if (!userClient) {
    return { success: false, error: 'No user token configured for reminders' };
  }

  try {
    await userClient.reminders.delete({ reminder: reminderId });
    return { success: true };
  } catch (error: any) {
    const slackError = error?.data?.error || error?.message || String(error);
    logger.error(`Failed to delete reminder: ${slackError}`);
    return { success: false, error: slackError };
  }
}
