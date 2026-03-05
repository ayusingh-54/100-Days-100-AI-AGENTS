/**
 * Manual Indexer Script
 * 
 * Run this script to manually trigger indexing of Slack messages.
 * Useful for:
 * - Initial indexing of historical messages
 * - Re-indexing after clearing the vector store
 * - Testing the indexer
 * 
 * Usage:
 *   npx tsx scripts/run-indexer.ts
 */

import 'dotenv/config';
import { initializeVectorStore, runIndex, getDocumentCount } from '../src/rag/index.js';
import { createModuleLogger } from '../src/utils/logger.js';

const logger = createModuleLogger('manual-indexer');

async function main() {
  logger.info('Starting manual indexing...');

  try {
    // Initialize vector store
    await initializeVectorStore();
    const beforeCount = await getDocumentCount();
    logger.info(`Documents before indexing: ${beforeCount}`);

    // Run indexer
    const result = await runIndex();
    
    // Get final count
    const afterCount = await getDocumentCount();
    
    logger.info('='.repeat(50));
    logger.info('Indexing Complete!');
    logger.info(`  • Documents indexed: ${result.indexed}`);
    logger.info(`  • Errors: ${result.errors}`);
    logger.info(`  • Total documents: ${afterCount}`);
    logger.info('='.repeat(50));

  } catch (error: any) {
    logger.error(`Indexing failed: ${error.message}`);
    process.exit(1);
  }

  process.exit(0);
}

main();
