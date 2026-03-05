/**
 * MCP Tool Converter
 * 
 * Converts MCP tool definitions to OpenAI function call format.
 * This allows the LLM to see and use MCP tools alongside Slack tools.
 * 
 * MCP Tool Format:
 * {
 *   name: "create_issue",
 *   description: "Create a GitHub issue",
 *   inputSchema: {
 *     type: "object",
 *     properties: { ... },
 *     required: [...]
 *   }
 * }
 * 
 * OpenAI Function Format:
 * {
 *   type: "function",
 *   function: {
 *     name: "github_create_issue",
 *     description: "Create a GitHub issue",
 *     parameters: {
 *       type: "object",
 *       properties: { ... },
 *       required: [...]
 *     }
 *   }
 * }
 */

import OpenAI from 'openai';
import { MCPTool } from './client.js';

/**
 * Convert a single MCP tool to OpenAI function format.
 */
export function mcpToolToOpenAI(
  tool: MCPTool & { serverName: string }
): OpenAI.Chat.ChatCompletionTool {
  return {
    type: 'function',
    function: {
      name: tool.name, // Already prefixed with server name
      description: formatDescription(tool.description, tool.serverName),
      parameters: tool.inputSchema || {
        type: 'object',
        properties: {},
      },
    },
  };
}

/**
 * Convert multiple MCP tools to OpenAI function format.
 */
export function mcpToolsToOpenAI(
  tools: Array<MCPTool & { serverName: string }>
): OpenAI.Chat.ChatCompletionTool[] {
  return tools.map(mcpToolToOpenAI);
}

/**
 * Format tool description with server context.
 */
function formatDescription(description: string | undefined, serverName: string): string {
  const serverLabel = serverName.charAt(0).toUpperCase() + serverName.slice(1);
  const baseDesc = description || 'No description available';
  return `[${serverLabel}] ${baseDesc}`;
}

/**
 * Format MCP tool result for display.
 */
export function formatMCPResult(result: unknown): string {
  if (!result) {
    return 'Operation completed successfully.';
  }

  // Handle MCP content array format
  if (typeof result === 'object' && 'content' in (result as Record<string, unknown>)) {
    const content = (result as { content: Array<{ type: string; text?: string }> }).content;
    
    if (Array.isArray(content)) {
      return content
        .filter(item => item.type === 'text' && item.text)
        .map(item => item.text)
        .join('\n\n');
    }
  }

  // Handle plain object
  if (typeof result === 'object') {
    return JSON.stringify(result, null, 2);
  }

  // Handle string
  return String(result);
}
