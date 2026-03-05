/**
 * Vector Store Module
 * 
 * This module manages the ChromaDB vector database for storing and searching
 * message embeddings. ChromaDB is a local vector database that allows us to
 * perform similarity searches without needing external cloud services.
 * 
 * WHY CHROMADB?
 * -------------
 * - Runs locally (no cloud dependency)
 * - Persistent storage (survives restarts)
 * - Easy to set up and use
 * - Good performance for small-medium datasets (< 1M documents)
 * - Free and open source
 * 
 * For larger scale (> 1M documents), consider:
 * - Pinecone (cloud, managed)
 * - Weaviate (self-hosted or cloud)
 * - Milvus (self-hosted)
 * 
 * HOW IT WORKS:
 * -------------
 * 1. Store: Save embedding + text + metadata
 * 2. Search: Find vectors closest to a query vector
 * 3. Filter: Narrow results by metadata (channel, user, date)
 * 
 * DATA MODEL:
 * -----------
 * Each document in the store has:
 * - id: Unique identifier (Slack message timestamp)
 * - embedding: Vector representation (1536 floats)
 * - text: Original message text
 * - metadata: Channel, user, timestamp, etc.
 * 
 * NOTE: We use an in-memory store with manual persistence for simplicity.
 * For production with large datasets, consider running a ChromaDB server.
 */

import { config } from '../config/index.js';
import { createModuleLogger } from '../utils/logger.js';
import { cosineSimilarity } from './embeddings.js';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';

const logger = createModuleLogger('vectorstore');

// Collection name for Slack messages
const COLLECTION_NAME = 'slack_messages';

/**
 * Document metadata stored alongside embeddings.
 * This enables filtering searches by channel, user, time, etc.
 */
export interface DocumentMetadata {
  // Core message info
  channelId: string;
  channelName: string;
  userId: string;
  userName: string;
  timestamp: string;      // ISO format
  messageTs: string;      // Slack timestamp (unique ID)
  
  // Optional context
  threadTs?: string;      // Parent thread timestamp
  isThread?: boolean;     // Is this a thread reply?
  
  // For filtering
  indexedAt: string;      // When we indexed this
}

/**
 * Document structure for storage.
 */
export interface Document {
  id: string;
  text: string;
  embedding: number[];
  metadata: DocumentMetadata;
}

/**
 * Search result with similarity score.
 */
export interface SearchResult {
  id: string;
  text: string;
  score: number;          // Cosine similarity (0-1)
  metadata: DocumentMetadata;
}

/**
 * Simple in-memory vector store with file persistence.
 * This is a lightweight alternative to running a ChromaDB server.
 */
class SimpleVectorStore {
  private documents: Map<string, Document> = new Map();
  private persistPath: string;
  private initialized: boolean = false;

  constructor(persistPath: string) {
    this.persistPath = persistPath;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Ensure directory exists
    const dir = dirname(this.persistPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    // Load existing data if available
    if (existsSync(this.persistPath)) {
      try {
        const data = readFileSync(this.persistPath, 'utf-8');
        const parsed = JSON.parse(data);
        this.documents = new Map(Object.entries(parsed));
        logger.info(`Loaded ${this.documents.size} documents from disk`);
      } catch (error: any) {
        logger.warn(`Could not load existing data: ${error.message}`);
        this.documents = new Map();
      }
    }

    this.initialized = true;
  }

  private persist(): void {
    try {
      const data = Object.fromEntries(this.documents);
      writeFileSync(this.persistPath, JSON.stringify(data));
    } catch (error: any) {
      logger.error(`Failed to persist data: ${error.message}`);
    }
  }

  async add(documents: Document[]): Promise<void> {
    for (const doc of documents) {
      this.documents.set(doc.id, doc);
    }
    this.persist();
  }

  async update(documents: Document[]): Promise<void> {
    for (const doc of documents) {
      if (this.documents.has(doc.id)) {
        this.documents.set(doc.id, doc);
      }
    }
    this.persist();
  }

  async delete(ids: string[]): Promise<void> {
    for (const id of ids) {
      this.documents.delete(id);
    }
    this.persist();
  }

  async search(
    queryEmbedding: number[],
    options: {
      limit?: number;
      channelId?: string;
      channelName?: string;
      userId?: string;
    } = {}
  ): Promise<SearchResult[]> {
    const { limit = 10, channelId, channelName, userId } = options;

    // Calculate similarity for all documents
    const results: SearchResult[] = [];

    for (const doc of this.documents.values()) {
      // Apply filters (case-insensitive for channel and user names)
      if (channelId && doc.metadata.channelId !== channelId) continue;
      if (channelName && doc.metadata.channelName.toLowerCase() !== channelName.toLowerCase()) continue;
      if (userId && doc.metadata.userId !== userId) continue;

      // Calculate cosine similarity
      const score = cosineSimilarity(queryEmbedding, doc.embedding);

      results.push({
        id: doc.id,
        text: doc.text,
        score,
        metadata: doc.metadata,
      });
    }

    // Sort by score descending and return top results
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit);
  }

  async get(ids: string[]): Promise<Document[]> {
    const results: Document[] = [];
    for (const id of ids) {
      const doc = this.documents.get(id);
      if (doc) results.push(doc);
    }
    return results;
  }

  async exists(id: string): Promise<boolean> {
    return this.documents.has(id);
  }

  async count(): Promise<number> {
    return this.documents.size;
  }

  async clear(): Promise<void> {
    this.documents.clear();
    this.persist();
  }
}

// Store instance
let store: SimpleVectorStore | null = null;

/**
 * Initialize the vector store connection.
 * Must be called before any other operations.
 */
export async function initializeVectorStore(): Promise<void> {
  if (store) {
    logger.debug('Vector store already initialized');
    return;
  }

  try {
    logger.info('Initializing vector store...');

    const persistPath = join(config.rag.vectorDbPath, 'vectors.json');
    store = new SimpleVectorStore(persistPath);
    await store.initialize();

    const count = await store.count();
    logger.info(`Vector store initialized. Collection has ${count} documents.`);
  } catch (error: any) {
    logger.error(`Failed to initialize vector store: ${error.message}`);
    throw new Error(`Vector store initialization failed: ${error.message}`);
  }
}

/**
 * Add documents to the vector store.
 */
export async function addDocuments(documents: Document[]): Promise<void> {
  if (!store) {
    await initializeVectorStore();
  }

  if (documents.length === 0) {
    logger.debug('No documents to add');
    return;
  }

  await store!.add(documents);
  logger.info(`Added ${documents.length} documents to vector store`);
}

/**
 * Update existing documents in the vector store.
 */
export async function updateDocuments(documents: Document[]): Promise<void> {
  if (!store) {
    await initializeVectorStore();
  }

  if (documents.length === 0) {
    return;
  }

  await store!.update(documents);
  logger.info(`Updated ${documents.length} documents`);
}

/**
 * Delete documents from the vector store.
 */
export async function deleteDocuments(ids: string[]): Promise<void> {
  if (!store) {
    await initializeVectorStore();
  }

  if (ids.length === 0) {
    return;
  }

  await store!.delete(ids);
  logger.info(`Deleted ${ids.length} documents`);
}

/**
 * Search for similar documents using a query embedding.
 */
export async function search(
  queryEmbedding: number[],
  options: {
    limit?: number;
    channelId?: string;
    channelName?: string;
    userId?: string;
    afterDate?: string;
    beforeDate?: string;
  } = {}
): Promise<SearchResult[]> {
  if (!store) {
    await initializeVectorStore();
  }

  const results = await store!.search(queryEmbedding, options);
  logger.debug(`Search returned ${results.length} results`);
  return results;
}

/**
 * Get the total number of documents in the store.
 */
export async function getDocumentCount(): Promise<number> {
  if (!store) {
    await initializeVectorStore();
  }

  return store!.count();
}

/**
 * Check if a document exists in the store.
 */
export async function documentExists(id: string): Promise<boolean> {
  if (!store) {
    await initializeVectorStore();
  }

  return store!.exists(id);
}

/**
 * Get documents by their IDs.
 */
export async function getDocuments(ids: string[]): Promise<SearchResult[]> {
  if (!store) {
    await initializeVectorStore();
  }

  if (ids.length === 0) {
    return [];
  }

  const docs = await store!.get(ids);
  return docs.map(doc => ({
    id: doc.id,
    text: doc.text,
    score: 1.0,
    metadata: doc.metadata,
  }));
}

/**
 * Clear all documents from the store.
 */
export async function clearAll(): Promise<void> {
  if (!store) {
    await initializeVectorStore();
  }

  await store!.clear();
  logger.warn('Cleared all documents from vector store');
}
