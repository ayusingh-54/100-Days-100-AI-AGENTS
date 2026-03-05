/**
 * MCP Configuration
 * 
 * Loads MCP server configurations from:
 * 1. mcp-config.json file (if exists)
 * 2. Environment variables (fallback)
 * 
 * CONFIGURATION FILE FORMAT:
 * --------------------------
 * {
 *   "servers": [
 *     {
 *       "name": "github",
 *       "command": "npx",
 *       "args": ["-y", "@modelcontextprotocol/server-github"],
 *       "env": {
 *         "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_..."
 *       }
 *     },
 *     {
 *       "name": "notion",
 *       "command": "npx",
 *       "args": ["-y", "@modelcontextprotocol/server-notion"],
 *       "env": {
 *         "NOTION_API_TOKEN": "secret_..."
 *       }
 *     }
 *   ]
 * }
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { createModuleLogger } from '../utils/logger.js';

const logger = createModuleLogger('mcp-config');

export interface MCPServerConfig {
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

export interface MCPConfig {
  servers: MCPServerConfig[];
}

/**
 * Load MCP configuration.
 * 
 * Priority:
 * 1. mcp-config.json in project root
 * 2. Environment variables (MCP_GITHUB_TOKEN, MCP_NOTION_TOKEN)
 */
export function loadMCPConfig(): MCPConfig {
  // Try loading from config file first
  const configPath = join(process.cwd(), 'mcp-config.json');
  
  if (existsSync(configPath)) {
    try {
      const configContent = readFileSync(configPath, 'utf-8');
      const config = JSON.parse(configContent) as MCPConfig;
      logger.info(`Loaded MCP config from ${configPath}`);
      
      // Substitute environment variables in env values
      for (const server of config.servers) {
        if (server.env) {
          for (const [key, value] of Object.entries(server.env)) {
            if (value.startsWith('$')) {
              const envVar = value.substring(1);
              server.env[key] = process.env[envVar] || '';
            }
          }
        }
      }
      
      return config;
    } catch (error: any) {
      logger.error(`Failed to load MCP config: ${error.message}`);
    }
  }

  // Fallback: build config from environment variables
  logger.info('Building MCP config from environment variables');
  
  const servers: MCPServerConfig[] = [];

  // GitHub server
  const githubToken = process.env.GITHUB_PERSONAL_ACCESS_TOKEN || process.env.GITHUB_TOKEN;
  if (githubToken) {
    servers.push({
      name: 'github',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-github'],
      env: {
        GITHUB_PERSONAL_ACCESS_TOKEN: githubToken,
      },
    });
    logger.info('GitHub MCP server configured');
  } else {
    logger.warn('GitHub MCP server not configured (missing GITHUB_PERSONAL_ACCESS_TOKEN)');
  }

  // Notion server
  const notionToken = process.env.NOTION_API_TOKEN || process.env.NOTION_TOKEN;
  if (notionToken) {
    servers.push({
      name: 'notion',
      command: 'npx',
      args: ['-y', '@notionhq/notion-mcp-server'],
      env: {
        OPENAPI_MCP_HEADERS: JSON.stringify({
          'Authorization': `Bearer ${notionToken}`,
          'Notion-Version': '2022-06-28',
        }),
      },
    });
    logger.info('Notion MCP server configured');
  } else {
    logger.warn('Notion MCP server not configured (missing NOTION_API_TOKEN)');
  }

  return { servers };
}

/**
 * Validate MCP configuration.
 */
export function validateMCPConfig(config: MCPConfig): string[] {
  const errors: string[] = [];

  for (const server of config.servers) {
    if (!server.name) {
      errors.push('Server missing name');
    }
    if (!server.command) {
      errors.push(`Server ${server.name}: missing command`);
    }
  }

  return errors;
}
