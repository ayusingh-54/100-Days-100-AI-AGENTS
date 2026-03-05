/**
 * RAG Module Index
 * 
 * Exports all RAG (Retrieval Augmented Generation) functionality.
 * 
 * QUICK START:
 * ------------
 * 
 * 1. Initialize the RAG system:
 *    ```typescript
 *    import { initializeVectorStore, startIndexer } from './rag';
 *    
 *    await initializeVectorStore();
 *    startIndexer(); // Background indexing
 *    ```
 * 
 * 2. Search for relevant context:
 *    ```typescript
 *    import { retrieve, buildContextString, shouldUseRAG } from './rag';
 *    
 *    if (shouldUseRAG(userQuery)) {
 *      const results = await retrieve(userQuery);
 *      const context = buildContextString(results.results);
 *      // Add context to LLM prompt
 *    }
 *    ```
 * 
 * 3. Manually index a message:
 *    ```typescript
 *    import { indexSingleMessage } from './rag';
 *    
 *    await indexSingleMessage(message, channelId, channelName);
 *    ```
 */

// Embeddings - Convert text to vectors
export { 
  createEmbedding, 
  createEmbeddings, 
  cosineSimilarity,
  preprocessText,
  getEmbeddingConfig,
} from './embeddings.js';

// Vector Store - Store and search vectors
export {
  initializeVectorStore,
  addDocuments,
  updateDocuments,
  deleteDocuments,
  search,
  getDocumentCount,
  documentExists,
  getDocuments,
  clearAll,
  type Document,
  type DocumentMetadata,
  type SearchResult,
} from './vectorstore.js';

// Indexer - Background message indexing
export {
  startIndexer,
  stopIndexer,
  runIndex,
  indexChannelManually,
  indexSingleMessage,
  getIndexerStatus,
} from './indexer.js';

// Retriever - Semantic search
export {
  retrieve,
  retrieveContext,
  buildContextString,
  shouldUseRAG,
  parseQueryFilters,
  type RetrievalOptions,
  type RetrievedDocument,
  type RetrievalResponse,
} from './retriever.js';
