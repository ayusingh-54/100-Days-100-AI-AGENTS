/**
 * Retriever Module
 * 
 * This module handles semantic search over the indexed Slack messages.
 * It transforms user queries into relevant context for the LLM.
 * 
 * WHY A RETRIEVER?
 * ----------------
 * The retriever is the "R" in RAG - it's responsible for:
 * 1. Understanding what the user is asking
 * 2. Finding relevant historical messages
 * 3. Ranking and filtering results
 * 4. Providing context to the LLM
 * 
 * RETRIEVAL STRATEGIES:
 * ---------------------
 * 
 * 1. BASIC RETRIEVAL:
 *    Query → Embed → Vector Search → Top K Results
 *    Simple but effective for most cases.
 * 
 * 2. HYBRID RETRIEVAL:
 *    Combines vector search with keyword search.
 *    Better for specific terms that might not embed well.
 * 
 * 3. CONTEXTUAL RETRIEVAL:
 *    Includes surrounding messages for context.
 *    Better for understanding threaded conversations.
 * 
 * 4. FILTERED RETRIEVAL:
 *    Narrows search by metadata (channel, user, date).
 *    Essential for scoped queries like "What did John say?"
 * 
 * RERANKING:
 * ----------
 * After initial retrieval, results can be reranked using:
 * - Cross-encoder models (more accurate, slower)
 * - LLM-based scoring (flexible, expensive)
 * - Reciprocal Rank Fusion (for hybrid search)
 * 
 * EXAMPLE FLOW:
 * -------------
 * User: "What was the decision about the new database?"
 *   ↓
 * Embed query → Vector search → Find similar messages
 *   ↓
 * Results: [
 *   "We decided to go with PostgreSQL for its JSON support" (0.89)
 *   "The database migration will happen next quarter" (0.82)
 *   "MongoDB was considered but rejected" (0.78)
 * ]
 *   ↓
 * Provide to LLM as context
 */

import { config } from '../config/index.js';
import { createModuleLogger } from '../utils/logger.js';
import { createEmbedding, preprocessText } from './embeddings.js';
import { search, SearchResult, getDocuments } from './vectorstore.js';

const logger = createModuleLogger('retriever');

/**
 * Retrieval options for customizing search behavior.
 */
export interface RetrievalOptions {
  // Number of results to return
  limit?: number;
  
  // Minimum similarity score (0-1)
  minScore?: number;
  
  // Filter by channel name
  channelName?: string;
  
  // Filter by channel ID
  channelId?: string;
  
  // Filter by user ID
  userId?: string;
  
  // Include surrounding messages for context
  includeContext?: boolean;
  
  // Number of messages before/after to include
  contextWindow?: number;
}

/**
 * Retrieved document with optional context.
 */
export interface RetrievedDocument {
  // Core content
  text: string;
  score: number;
  
  // Metadata
  channelName: string;
  userName: string;
  timestamp: string;
  messageId: string;
  
  // Optional context (surrounding messages)
  contextBefore?: string[];
  contextAfter?: string[];
  
  // Is this a thread reply?
  isThread: boolean;
  
  // Formatted for LLM context
  formatted: string;
}

/**
 * Retrieval response with metadata.
 */
export interface RetrievalResponse {
  query: string;
  results: RetrievedDocument[];
  totalFound: number;
  searchTimeMs: number;
}

/**
 * Retrieve relevant documents for a query.
 * This is the main function for semantic search.
 * 
 * @param query - User's natural language query
 * @param options - Search options
 * @returns Retrieved documents with relevance scores
 * 
 * @example
 * const results = await retrieve("What was decided about pricing?");
 * console.log(results.results[0].formatted);
 * // "[Jan 15 in #pricing] John: We decided to increase prices by 10%"
 */
export async function retrieve(
  query: string,
  options: RetrievalOptions = {}
): Promise<RetrievalResponse> {
  const startTime = Date.now();
  
  const {
    limit = 10,
    minScore = 0.3,  // Lowered default for better recall
    channelName,
    channelId,
    userId,
    includeContext = false,
    contextWindow = 2,
  } = options;

  logger.info(`Retrieving for query: "${query.substring(0, 50)}..."${channelName ? ` in #${channelName}` : ''}`);

  try {
    // 1. Preprocess and embed the query
    const processedQuery = preprocessText(query) || query;
    logger.debug(`Processed query: "${processedQuery.substring(0, 50)}..."`);
    
    const queryEmbedding = await createEmbedding(processedQuery);

    // 2. Search the vector store
    const searchResults = await search(queryEmbedding, {
      limit: limit * 2, // Get extra for filtering
      channelId,
      channelName,
      userId,
    });

    // 3. Filter by minimum score
    const filteredResults = searchResults.filter(r => r.score >= minScore);

    // 4. Transform to retrieved documents
    const retrievedDocs: RetrievedDocument[] = [];

    for (const result of filteredResults.slice(0, limit)) {
      const doc: RetrievedDocument = {
        text: result.text,
        score: result.score,
        channelName: result.metadata.channelName,
        userName: result.metadata.userName,
        timestamp: result.metadata.timestamp,
        messageId: result.metadata.messageTs,
        isThread: result.metadata.isThread || false,
        formatted: formatForLLM(result),
      };

      // TODO: Add context retrieval if needed
      // This would fetch messages before/after from the same channel
      
      retrievedDocs.push(doc);
    }

    const searchTimeMs = Date.now() - startTime;

    logger.info(`Retrieved ${retrievedDocs.length} documents in ${searchTimeMs}ms`);

    return {
      query,
      results: retrievedDocs,
      totalFound: filteredResults.length,
      searchTimeMs,
    };
  } catch (error: any) {
    logger.error(`Retrieval failed: ${error.message}`);
    throw error;
  }
}

/**
 * Format a search result for LLM context.
 * Creates a readable string that includes all relevant metadata.
 * 
 * @param result - Search result to format
 * @returns Formatted string for LLM
 */
function formatForLLM(result: SearchResult): string {
  const date = new Date(result.metadata.timestamp);
  const dateStr = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
  
  const threadIndicator = result.metadata.isThread ? ' (thread reply)' : '';
  
  return `[${dateStr} in #${result.metadata.channelName}${threadIndicator}] ${result.metadata.userName}: ${result.text}`;
}

/**
 * Build context string for LLM from retrieved documents.
 * Creates a formatted block of relevant historical messages.
 * 
 * @param docs - Retrieved documents
 * @returns Formatted context string
 * 
 * @example
 * const context = buildContextString(results.results);
 * // Returns:
 * // "## Relevant Slack History
 * //  
 * // [Jan 15 in #engineering] John: We should use PostgreSQL
 * // [Jan 16 in #engineering] Sarah: Agreed, the JSON support is great
 * // ..."
 */
export function buildContextString(docs: RetrievedDocument[]): string {
  if (docs.length === 0) {
    return '';
  }

  const header = '## Relevant Slack History\n\nThe following messages from your Slack workspace may be relevant:\n\n';
  
  const messages = docs
    .map((doc, i) => `${i + 1}. ${doc.formatted}`)
    .join('\n');

  const footer = '\n\n---\nUse this context to inform your response, citing specific messages when relevant.';

  return header + messages + footer;
}

/**
 * Retrieve and build context in one step.
 * Convenience function for common use case.
 * 
 * @param query - User query
 * @param options - Retrieval options
 * @returns Context string ready for LLM
 */
export async function retrieveContext(
  query: string,
  options: RetrievalOptions = {}
): Promise<string> {
  const results = await retrieve(query, options);
  return buildContextString(results.results);
}

/**
 * Determine if a query would benefit from RAG.
 * Not all queries need historical context.
 * 
 * HEURISTICS:
 * -----------
 * - Questions about past events → YES
 * - "What did X say about Y?" → YES
 * - Simple greetings → NO
 * - General knowledge questions → NO
 * - Task execution ("send message") → NO
 * 
 * @param query - User query
 * @returns Whether RAG should be used
 */
export function shouldUseRAG(query: string): boolean {
  const lowerQuery = query.toLowerCase();
  
  // Indicators that RAG would help
  const ragIndicators = [
    'what did',
    'who said',
    'when did',
    'why did',
    'how did',
    'decision about',
    'discussed',
    'mentioned',
    'talked about',
    'conversation about',
    'history of',
    'remember when',
    'last time',
    'before',
    'previously',
    'what was',
    'find messages',
    'search for',
    'look up',
  ];

  // Indicators that RAG is not needed
  const noRagIndicators = [
    'send message',
    'post to',
    'schedule',
    'remind me',
    'set reminder',
    'hello',
    'hi',
    'hey',
    'thanks',
    'help',
    'what can you do',
    'list channels',
    'list users',
  ];

  // Check for no-RAG indicators first
  for (const indicator of noRagIndicators) {
    if (lowerQuery.includes(indicator)) {
      return false;
    }
  }

  // Check for RAG indicators
  for (const indicator of ragIndicators) {
    if (lowerQuery.includes(indicator)) {
      return true;
    }
  }

  // Default: use RAG for question-like queries
  return lowerQuery.includes('?') || 
         lowerQuery.startsWith('what ') ||
         lowerQuery.startsWith('who ') ||
         lowerQuery.startsWith('when ') ||
         lowerQuery.startsWith('where ') ||
         lowerQuery.startsWith('why ') ||
         lowerQuery.startsWith('how ');
}

/**
 * Parse query for metadata filters.
 * Extracts channel, user, and time filters from natural language.
 * 
 * @param query - User query
 * @returns Extracted filters
 * 
 * @example
 * parseQueryFilters("What did John say in #engineering?")
 * // { userName: "John", channelName: "engineering" }
 */
export function parseQueryFilters(query: string): {
  channelName?: string;
  userName?: string;
  timeFilter?: 'today' | 'week' | 'month' | 'all';
} {
  const filters: {
    channelName?: string;
    userName?: string;
    timeFilter?: 'today' | 'week' | 'month' | 'all';
  } = {};

  // Extract channel name - handle Slack formatting <#C123|name>
  const slackChannelMatch = query.match(/<#[A-Z0-9]+\|([^>]+)>/);
  if (slackChannelMatch) {
    filters.channelName = slackChannelMatch[1];
  } else {
    // Try regular #channel format
    const channelMatch = query.match(/#(\w+[-\w]*)/);
    if (channelMatch) {
      filters.channelName = channelMatch[1];
    } else {
      // Try to find channel name mentioned as "in X channel" or "from X channel"
      const inChannelMatch = query.match(/(?:in|from)\s+(\w+[-\w]*)\s+channel/i);
      if (inChannelMatch) {
        filters.channelName = inChannelMatch[1];
      }
    }
  }

  // Extract user name (after "did X say", "@X", etc.)
  const slackUserMatch = query.match(/<@([A-Z0-9]+)>/);
  if (slackUserMatch) {
    filters.userName = slackUserMatch[1];  // User ID
  } else {
    const userMatch = query.match(/(?:did\s+|@)(\w+)\s+say/i) ||
                     query.match(/@(\w+)/);
    if (userMatch) {
      filters.userName = userMatch[1];
    }
  }

  // Extract time filter
  if (query.includes('today')) {
    filters.timeFilter = 'today';
  } else if (query.includes('this week') || query.includes('past week')) {
    filters.timeFilter = 'week';
  } else if (query.includes('this month') || query.includes('past month')) {
    filters.timeFilter = 'month';
  }

  return filters;
}
