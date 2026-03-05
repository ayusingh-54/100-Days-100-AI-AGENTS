/**
 * MCP (Model Context Protocol) Module
 * 
 * Provides integration with MCP servers like GitHub and Notion.
 * 
 * QUICK START:
 * ------------
 * 
 * 1. Configure MCP servers (see mcp-config.json or .env)
 * 
 * 2. Initialize MCP:
 *    ```typescript
 *    import { initializeMCP } from './mcp';
 *    await initializeMCP();
 *    ```
 * 
 * 3. Get available tools:
 *    ```typescript
 *    import { getAllMCPTools, mcpToolsToOpenAI } from './mcp';
 *    const mcpTools = getAllMCPTools();
 *    const openAITools = mcpToolsToOpenAI(mcpTools);
 *    ```
 * 
 * 4. Execute tools:
 *    ```typescript
 *    import { executeMCPTool, parseToolName } from './mcp';
 *    const parsed = parseToolName('github_create_issue');
 *    const result = await executeMCPTool(parsed.serverName, parsed.toolName, args);
 *    ```
 */

export {
  initializeMCP,
  shutdownMCP,
  getAllMCPTools,
  executeMCPTool,
  parseToolName,
  isMCPEnabled,
  getConnectedServers,
  type MCPTool,
} from './client.js';

export {
  loadMCPConfig,
  validateMCPConfig,
  type MCPServerConfig,
  type MCPConfig,
} from './config.js';

export {
  mcpToolToOpenAI,
  mcpToolsToOpenAI,
  formatMCPResult,
} from './tool-converter.js';
