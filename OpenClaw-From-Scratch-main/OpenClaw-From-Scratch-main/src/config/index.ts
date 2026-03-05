import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

// Configuration schema with validation
const ConfigSchema = z.object({
  // Slack Configuration
  slack: z.object({
    botToken: z.string().min(1, 'SLACK_BOT_TOKEN is required'),
    appToken: z.string().min(1, 'SLACK_APP_TOKEN is required'),
    userToken: z.string().optional(), // For reminders API (xoxp-...)
    signingSecret: z.string().optional(),
  }),

  // AI Model Configuration
  ai: z.object({
    anthropicApiKey: z.string().optional(),
    openaiApiKey: z.string().optional(),
    defaultModel: z.string().default('claude-sonnet-4-20250514'),
  }),

  // RAG Configuration
  rag: z.object({
    enabled: z.boolean().default(true),
    embeddingModel: z.string().default('text-embedding-3-small'),
    vectorDbPath: z.string().default('./data/chroma'),
    indexIntervalHours: z.number().default(1),
    maxResults: z.number().default(10),
    minSimilarity: z.number().default(0.5),
  }),

  // Memory Configuration (mem0)
  memory: z.object({
    enabled: z.boolean().default(true),
    extractionModel: z.string().default('gpt-4o-mini'),
  }),

  // Application Settings
  app: z.object({
    logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    databasePath: z.string().default('./data/assistant.db'),
    maxHistoryMessages: z.number().default(50),
    sessionTimeoutMinutes: z.number().default(60),
  }),

  // Security Settings
  security: z.object({
    dmPolicy: z.enum(['open', 'pairing', 'allowlist']).default('pairing'),
    allowedUsers: z.array(z.string()).default(['*']),
    allowedChannels: z.array(z.string()).default(['*']),
  }),

  // Feature Flags
  features: z.object({
    threadSummary: z.boolean().default(true),
    taskScheduler: z.boolean().default(true),
    reactions: z.boolean().default(true),
    typingIndicator: z.boolean().default(true),
  }),
});

export type Config = z.infer<typeof ConfigSchema>;

function parseArrayFromEnv(value: string | undefined): string[] {
  if (!value) return ['*'];
  return value.split(',').map((s) => s.trim());
}

function loadConfig(): Config {
  const rawConfig = {
    slack: {
      botToken: process.env.SLACK_BOT_TOKEN || '',
      appToken: process.env.SLACK_APP_TOKEN || '',
      userToken: process.env.SLACK_USER_TOKEN, // For reminders API
      signingSecret: process.env.SLACK_SIGNING_SECRET,
    },
    ai: {
      anthropicApiKey: process.env.ANTHROPIC_API_KEY,
      openaiApiKey: process.env.OPENAI_API_KEY,
      defaultModel: process.env.DEFAULT_MODEL || 'claude-sonnet-4-20250514',
    },
    rag: {
      enabled: process.env.RAG_ENABLED !== 'false',
      embeddingModel: process.env.RAG_EMBEDDING_MODEL || 'text-embedding-3-small',
      vectorDbPath: process.env.RAG_VECTOR_DB_PATH || './data/chroma',
      indexIntervalHours: parseInt(process.env.RAG_INDEX_INTERVAL_HOURS || '1', 10),
      maxResults: parseInt(process.env.RAG_MAX_RESULTS || '10', 10),
      minSimilarity: parseFloat(process.env.RAG_MIN_SIMILARITY || '0.5'),
    },
    memory: {
      enabled: process.env.MEMORY_ENABLED !== 'false',
      extractionModel: process.env.MEMORY_EXTRACTION_MODEL || 'gpt-4o-mini',
    },
    app: {
      logLevel: process.env.LOG_LEVEL || 'info',
      databasePath: process.env.DATABASE_PATH || './data/assistant.db',
      maxHistoryMessages: parseInt(process.env.MAX_HISTORY_MESSAGES || '50', 10),
      sessionTimeoutMinutes: parseInt(process.env.SESSION_TIMEOUT_MINUTES || '60', 10),
    },
    security: {
      dmPolicy: process.env.DM_POLICY || 'pairing',
      allowedUsers: parseArrayFromEnv(process.env.ALLOWED_USERS),
      allowedChannels: parseArrayFromEnv(process.env.ALLOWED_CHANNELS),
    },
    features: {
      threadSummary: process.env.ENABLE_THREAD_SUMMARY !== 'false',
      taskScheduler: process.env.ENABLE_TASK_SCHEDULER !== 'false',
      reactions: process.env.ENABLE_REACTIONS !== 'false',
      typingIndicator: process.env.ENABLE_TYPING_INDICATOR !== 'false',
    },
  };

  const result = ConfigSchema.safeParse(rawConfig);

  if (!result.success) {
    console.error('Configuration validation failed:');
    result.error.errors.forEach((err) => {
      console.error(`  - ${err.path.join('.')}: ${err.message}`);
    });
    process.exit(1);
  }

  // Validate that at least one AI provider is configured
  if (!result.data.ai.anthropicApiKey && !result.data.ai.openaiApiKey) {
    console.error('At least one AI provider (Anthropic or OpenAI) must be configured');
    process.exit(1);
  }

  return result.data;
}

export const config = loadConfig();
