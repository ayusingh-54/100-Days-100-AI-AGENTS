/**
 * Memory Module Index
 * 
 * Exports all memory functionality for the Slack AI Assistant.
 * 
 * QUICK START:
 * ------------
 * 
 * 1. Initialize memory:
 *    ```typescript
 *    import { initializeMemory } from './memory-ai';
 *    await initializeMemory();
 *    ```
 * 
 * 2. Store memories from conversation:
 *    ```typescript
 *    import { addMemory } from './memory-ai';
 *    await addMemory(messages, userId);
 *    ```
 * 
 * 3. Retrieve relevant memories:
 *    ```typescript
 *    import { searchMemory, buildMemoryContext } from './memory-ai';
 *    const memories = await searchMemory(query, userId);
 *    const context = buildMemoryContext(memories);
 *    ```
 */

export {
  initializeMemory,
  addMemory,
  searchMemory,
  getAllMemories,
  deleteMemory,
  deleteAllMemories,
  buildMemoryContext,
  isMemoryEnabled,
  getMemoryStatus,
  type MemoryItem,
} from './mem0-client.js';
