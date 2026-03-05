/**
 * Embeddings Module
 * 
 * This module handles converting text into vector embeddings using OpenAI's
 * embedding API. Embeddings are numerical representations of text that capture
 * semantic meaning - similar texts will have similar embedding vectors.
 * 
 * WHY EMBEDDINGS?
 * ---------------
 * Traditional keyword search fails when:
 * - User says "payment issues" but messages say "billing problems"
 * - User asks about "deployment" but messages mention "releases"
 * 
 * Embeddings solve this by representing meaning, not just words.
 * "payment issues" and "billing problems" will have similar vectors
 * because they mean similar things.
 * 
 * HOW IT WORKS:
 * -------------
 * 1. Send text to OpenAI's embedding API
 * 2. Receive a vector of 1536 floating-point numbers
 * 3. Store vector in a vector database
 * 4. Compare vectors using cosine similarity to find similar content
 * 
 * EXAMPLE:
 * --------
 * Text: "The deployment failed due to memory issues"
 * Vector: [0.023, -0.041, 0.087, ..., 0.012] (1536 dimensions)
 * 
 * Similar text: "The release crashed because of RAM problems"
 * Vector: [0.025, -0.039, 0.085, ..., 0.014] (very close to above!)
 */

import OpenAI from 'openai';
import { config } from '../config/index.js';
import { createModuleLogger } from '../utils/logger.js';

const logger = createModuleLogger('embeddings');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: config.ai.openaiApiKey,
});

// Embedding model configuration
// text-embedding-3-small: Good balance of quality and cost
// text-embedding-3-large: Higher quality, more expensive
const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 1536;

// Rate limiting configuration
const MAX_BATCH_SIZE = 100; // OpenAI allows up to 2048, but we stay conservative
const RATE_LIMIT_DELAY_MS = 100; // Small delay between batches

/**
 * Create an embedding for a single text string.
 * 
 * @param text - The text to embed
 * @returns A vector of floating-point numbers representing the text
 * 
 * @example
 * const embedding = await createEmbedding("What is the deployment process?");
 * console.log(embedding.length); // 1536
 */
export async function createEmbedding(text: string): Promise<number[]> {
  if (!text || text.trim().length === 0) {
    logger.warn('Attempted to embed empty text');
    return new Array(EMBEDDING_DIMENSIONS).fill(0);
  }

  try {
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text,
    });

    const embedding = response.data[0].embedding;
    logger.debug(`Created embedding for text (${text.length} chars)`);
    
    return embedding;
  } catch (error: any) {
    logger.error(`Failed to create embedding: ${error.message}`);
    throw new Error(`Embedding failed: ${error.message}`);
  }
}

/**
 * Create embeddings for multiple texts in a batch.
 * More efficient than calling createEmbedding() multiple times.
 * 
 * WHY BATCH?
 * ----------
 * - Reduces API calls (cost and latency)
 * - OpenAI processes batches more efficiently
 * - Better for indexing large amounts of content
 * 
 * @param texts - Array of texts to embed
 * @returns Array of embeddings in the same order as inputs
 * 
 * @example
 * const embeddings = await createEmbeddings([
 *   "First message",
 *   "Second message",
 *   "Third message"
 * ]);
 * // embeddings[0] corresponds to "First message", etc.
 */
export async function createEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) {
    return [];
  }

  // Filter out empty texts but track their positions
  const validTexts: { index: number; text: string }[] = [];
  texts.forEach((text, index) => {
    if (text && text.trim().length > 0) {
      validTexts.push({ index, text });
    }
  });

  if (validTexts.length === 0) {
    return texts.map(() => new Array(EMBEDDING_DIMENSIONS).fill(0));
  }

  const results: number[][] = new Array(texts.length).fill(null);
  
  // Process in batches to respect rate limits
  for (let i = 0; i < validTexts.length; i += MAX_BATCH_SIZE) {
    const batch = validTexts.slice(i, i + MAX_BATCH_SIZE);
    
    try {
      logger.info(`Processing embedding batch ${Math.floor(i / MAX_BATCH_SIZE) + 1}/${Math.ceil(validTexts.length / MAX_BATCH_SIZE)}`);
      
      const response = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: batch.map(b => b.text),
      });

      // Map results back to original positions
      response.data.forEach((item, batchIndex) => {
        const originalIndex = batch[batchIndex].index;
        results[originalIndex] = item.embedding;
      });

      // Small delay between batches to avoid rate limits
      if (i + MAX_BATCH_SIZE < validTexts.length) {
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY_MS));
      }
    } catch (error: any) {
      logger.error(`Batch embedding failed: ${error.message}`);
      throw new Error(`Batch embedding failed: ${error.message}`);
    }
  }

  // Fill in zeros for empty texts
  for (let i = 0; i < results.length; i++) {
    if (results[i] === null) {
      results[i] = new Array(EMBEDDING_DIMENSIONS).fill(0);
    }
  }

  logger.info(`Created ${validTexts.length} embeddings`);
  return results;
}

/**
 * Calculate cosine similarity between two vectors.
 * 
 * WHAT IS COSINE SIMILARITY?
 * --------------------------
 * A measure of how similar two vectors are, ranging from -1 to 1:
 * - 1.0 = Identical meaning
 * - 0.0 = Completely unrelated
 * - -1.0 = Opposite meaning (rare with text embeddings)
 * 
 * For text embeddings, scores typically range from 0.3 to 0.95:
 * - > 0.85 = Very similar content
 * - 0.70-0.85 = Related content
 * - < 0.70 = Probably different topics
 * 
 * @param a - First embedding vector
 * @param b - Second embedding vector
 * @returns Similarity score between -1 and 1
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  
  if (magnitude === 0) {
    return 0;
  }

  return dotProduct / magnitude;
}

/**
 * Prepare text for embedding by cleaning and normalizing.
 * 
 * WHY PREPROCESSING?
 * ------------------
 * - Remove noise that doesn't add meaning
 * - Normalize format for consistent embeddings
 * - Improve retrieval quality
 * 
 * @param text - Raw text from Slack message
 * @returns Cleaned text ready for embedding
 */
export function preprocessText(text: string): string {
  let processed = text;

  // Remove Slack user mentions (<@U123ABC>) and replace with placeholder
  processed = processed.replace(/<@[A-Z0-9]+>/g, '@user');

  // Remove Slack channel mentions (<#C123ABC|channel-name>)
  processed = processed.replace(/<#[A-Z0-9]+\|([^>]+)>/g, '#$1');
  processed = processed.replace(/<#[A-Z0-9]+>/g, '#channel');

  // Remove URLs but keep a marker
  processed = processed.replace(/<https?:\/\/[^>]+>/g, '[link]');
  processed = processed.replace(/https?:\/\/\S+/g, '[link]');

  // Remove emoji codes :emoji_name:
  processed = processed.replace(/:[a-z0-9_+-]+:/g, '');

  // Normalize whitespace
  processed = processed.replace(/\s+/g, ' ').trim();

  // Remove very short messages (likely just reactions or acknowledgments)
  if (processed.length < 10) {
    return '';
  }

  return processed;
}

/**
 * Get embedding model information.
 * Useful for debugging and monitoring.
 */
export function getEmbeddingConfig() {
  return {
    model: EMBEDDING_MODEL,
    dimensions: EMBEDDING_DIMENSIONS,
    maxBatchSize: MAX_BATCH_SIZE,
  };
}
