/**
 * mem0 Memory Client
 * 
 * This module integrates mem0.ai for long-term user memory.
 * mem0 automatically extracts facts from conversations and stores them,
 * enabling personalized AI experiences across sessions.
 * 
 * HOW IT WORKS:
 * -------------
 * 1. After each conversation, we pass messages to mem0
 * 2. mem0 uses an LLM to extract facts (e.g., "User is working on Q4 launch")
 * 3. Facts are stored in a vector database for semantic retrieval
 * 4. Before responding, we retrieve relevant memories for context
 * 
 * EXAMPLE:
 * --------
 * Conversation: "I'm Alex, a senior engineer working on payments"
 * 
 * mem0 extracts:
 * - "Name is Alex"
 * - "Role is senior engineer"
 * - "Working on payments project"
 * 
 * Later query: "What should I focus on?"
 * Retrieves: memories about current project → personalized response
 */

import { config } from '../config/index.js';
import { createModuleLogger } from '../utils/logger.js';

const logger = createModuleLogger('mem0-client');

// Types for mem0 responses
export interface MemoryItem {
  id: string;
  memory: string;
  userId?: string;
  metadata?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
  score?: number;  // For search results
}

export interface AddMemoryResult {
  results: MemoryItem[];
}

export interface SearchMemoryResult {
  results: MemoryItem[];
}

// Memory client instance
let memoryInstance: any = null;
let isInitialized = false;

/**
 * Initialize the mem0 memory client.
 * 
 * Uses mem0 Cloud API with MEM0_API_KEY.
 */
export async function initializeMemory(): Promise<void> {
  if (isInitialized) {
    logger.debug('Memory already initialized');
    return;
  }

  try {
    logger.info('Initializing mem0 cloud client...');

    const apiKey = process.env.MEM0_API_KEY;
    if (!apiKey) {
      throw new Error('MEM0_API_KEY environment variable is required');
    }

    // Import mem0ai MemoryClient for cloud API
    const mem0Module = await import('mem0ai');
    const MemoryClient = mem0Module.default || mem0Module.MemoryClient;
    
    if (!MemoryClient) {
      throw new Error('MemoryClient not found in mem0ai package');
    }

    // Initialize cloud client
    memoryInstance = new MemoryClient({ apiKey });
    
    isInitialized = true;
    logger.info('✅ mem0 cloud client initialized');
  } catch (error: any) {
    logger.error(`Failed to initialize mem0: ${error.message}`);
    logger.error(`Stack: ${error.stack}`);
    logger.warn('Memory features will be disabled');
    isInitialized = false;
  }
}

/**
 * Add memories from a conversation.
 * mem0 will automatically extract facts from the messages.
 * 
 * @param messages - Conversation messages
 * @param userId - Slack user ID
 * @param metadata - Optional metadata
 * 
 * @example
 * await addMemory([
 *   { role: 'user', content: "I'm working on the API redesign" },
 *   { role: 'assistant', content: "Great! How can I help with the API?" }
 * ], 'U12345');
 * // Extracts: "User is working on API redesign"
 */
export async function addMemory(
  messages: Array<{ role: string; content: string }>,
  userId: string,
  metadata?: Record<string, unknown>
): Promise<MemoryItem[]> {
  if (!isInitialized || !memoryInstance) {
    logger.warn('Memory not initialized, skipping add');
    return [];
  }

  try {
    logger.debug(`Adding memories for user ${userId}`);

    const result = await memoryInstance.add(messages, {
      user_id: userId,  // Cloud API uses user_id
      metadata: {
        source: 'slack',
        ...metadata,
      },
    });

    const memories = result?.results || result || [];
    
    if (memories.length > 0) {
      logger.info(`Stored ${memories.length} memories for user ${userId}`);
      memories.forEach((m: MemoryItem) => {
        logger.debug(`  - ${m.memory}`);
      });
    }

    return memories;
  } catch (error: any) {
    logger.error(`Failed to add memory: ${error.message}`);
    return [];
  }
}

/**
 * Search for relevant memories.
 * Uses semantic search to find memories related to the query.
 * 
 * @param query - Search query
 * @param userId - Slack user ID
 * @param limit - Max results
 * 
 * @example
 * const memories = await searchMemory("current project", "U12345");
 * // Returns: [{ memory: "User is working on API redesign", score: 0.89 }]
 */
export async function searchMemory(
  query: string,
  userId: string,
  limit: number = 5
): Promise<MemoryItem[]> {
  if (!isInitialized || !memoryInstance) {
    logger.warn('Memory not initialized, skipping search');
    return [];
  }

  try {
    logger.debug(`Searching memories for user ${userId}: "${query.substring(0, 50)}..."`);

    const result = await memoryInstance.search(query, {
      user_id: userId,  // Cloud API uses user_id
      limit,
    });

    const memories = result?.results || [];
    
    logger.debug(`Found ${memories.length} relevant memories`);

    return memories;
  } catch (error: any) {
    logger.error(`Failed to search memory: ${error.message}`);
    return [];
  }
}

/**
 * Get all memories for a user.
 * 
 * @param userId - Slack user ID
 */
export async function getAllMemories(userId: string): Promise<MemoryItem[]> {
  if (!isInitialized || !memoryInstance) {
    logger.warn('Memory not initialized, skipping getAll');
    return [];
  }

  try {
    logger.debug(`Getting all memories for user ${userId}`);

    const result = await memoryInstance.getAll({ user_id: userId });  // Cloud API uses user_id
    const memories = result?.results || result || [];
    
    logger.debug(`User ${userId} has ${memories.length} memories`);

    return memories;
  } catch (error: any) {
    logger.error(`Failed to get memories: ${error.message}`);
    return [];
  }
}

/**
 * Delete a specific memory.
 * 
 * @param memoryId - Memory ID to delete
 */
export async function deleteMemory(memoryId: string): Promise<boolean> {
  if (!isInitialized || !memoryInstance) {
    logger.warn('Memory not initialized, skipping delete');
    return false;
  }

  try {
    logger.debug(`Deleting memory: ${memoryId}`);
    await memoryInstance.delete(memoryId);
    logger.info(`Deleted memory: ${memoryId}`);
    return true;
  } catch (error: any) {
    logger.error(`Failed to delete memory: ${error.message}`);
    return false;
  }
}

/**
 * Delete all memories for a user.
 * 
 * @param userId - Slack user ID
 */
export async function deleteAllMemories(userId: string): Promise<boolean> {
  if (!isInitialized || !memoryInstance) {
    logger.warn('Memory not initialized, skipping deleteAll');
    return false;
  }

  try {
    logger.debug(`Deleting all memories for user ${userId}`);
    await memoryInstance.deleteAll({ user_id: userId });  // Cloud API uses user_id
    logger.info(`Deleted all memories for user ${userId}`);
    return true;
  } catch (error: any) {
    logger.error(`Failed to delete all memories: ${error.message}`);
    return false;
  }
}

/**
 * Build a context string from memories for the LLM.
 * 
 * @param memories - Array of memories
 * @returns Formatted context string
 */
export function buildMemoryContext(memories: MemoryItem[]): string {
  if (memories.length === 0) {
    return '';
  }

  const header = '## What I Remember About You\n\n';
  const items = memories.map((m, i) => `${i + 1}. ${m.memory}`).join('\n');
  const footer = '\n\nUse this context to personalize your responses.';

  return header + items + footer;
}

/**
 * Check if memory is initialized and available.
 */
export function isMemoryEnabled(): boolean {
  return isInitialized && memoryInstance !== null;
}

/**
 * Get memory system status.
 */
export function getMemoryStatus(): {
  enabled: boolean;
  initialized: boolean;
} {
  return {
    enabled: config.memory?.enabled ?? true,
    initialized: isInitialized,
  };
}
