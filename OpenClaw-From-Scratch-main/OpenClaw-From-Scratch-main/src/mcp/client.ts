/**
 * MCP (Model Context Protocol) Client Manager
 * 
 * Manages connections to MCP servers (GitHub, Notion, etc.)
 * and provides a unified interface for tool discovery and execution.
 * 
 * HOW IT WORKS:
 * -------------
 * 1. On startup, spawns configured MCP servers as child processes
 * 2. Communicates via stdio (stdin/stdout JSON-RPC)
 * 3. Discovers available tools from each server
 * 4. Routes tool calls to the appropriate server
 * 
 * EXAMPLE:
 * --------
 * User: "Create a GitHub issue for the login bug"
 * 
 * 1. Agent sees MCP tool: github_create_issue
 * 2. Agent calls: executeMCPTool('github', 'create_issue', {...})
 * 3. MCP client sends request to GitHub server
 * 4. Server creates issue via GitHub API
 * 5. Returns: "Created issue #42"
 */

import { spawn, ChildProcess } from 'child_process';
import { createModuleLogger } from '../utils/logger.js';
import { MCPServerConfig, loadMCPConfig } from './config.js';

const logger = createModuleLogger('mcp-client');

// JSON-RPC message types
interface JSONRPCRequest {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params?: Record<string, unknown>;
}

interface JSONRPCResponse {
  jsonrpc: '2.0';
  id: number;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

// MCP Tool definition
export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

// Connected MCP server instance
interface MCPServer {
  name: string;
  config: MCPServerConfig;
  process: ChildProcess;
  tools: MCPTool[];
  requestId: number;
  pendingRequests: Map<number, {
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
  }>;
  buffer: string;
}

// Active MCP servers
const servers: Map<string, MCPServer> = new Map();

/**
 * Initialize all configured MCP servers.
 */
export async function initializeMCP(): Promise<void> {
  logger.info('Initializing MCP servers...');
  
  const config = loadMCPConfig();
  
  if (config.servers.length === 0) {
    logger.warn('No MCP servers configured');
    return;
  }

  for (const serverConfig of config.servers) {
    try {
      await connectServer(serverConfig);
    } catch (error: any) {
      logger.error(`Failed to connect to MCP server ${serverConfig.name}: ${error.message}`);
    }
  }

  const connectedCount = servers.size;
  logger.info(`MCP initialized: ${connectedCount}/${config.servers.length} servers connected`);
}

/**
 * Connect to a single MCP server.
 */
async function connectServer(config: MCPServerConfig): Promise<void> {
  logger.info(`Connecting to MCP server: ${config.name}`);

  // Merge environment variables
  const env = {
    ...process.env,
    ...config.env,
  };

  // Spawn the server process
  const proc = spawn(config.command, config.args || [], {
    env,
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  const server: MCPServer = {
    name: config.name,
    config,
    process: proc,
    tools: [],
    requestId: 0,
    pendingRequests: new Map(),
    buffer: '',
  };

  // Handle stdout (responses from server)
  proc.stdout?.on('data', (data: Buffer) => {
    handleServerOutput(server, data.toString());
  });

  // Handle stderr (server logs)
  proc.stderr?.on('data', (data: Buffer) => {
    logger.debug(`[${config.name}] ${data.toString().trim()}`);
  });

  // Handle process exit
  proc.on('exit', (code) => {
    logger.warn(`MCP server ${config.name} exited with code ${code}`);
    servers.delete(config.name);
  });

  proc.on('error', (error) => {
    logger.error(`MCP server ${config.name} error: ${error.message}`);
    servers.delete(config.name);
  });

  servers.set(config.name, server);

  // Wait for process to start
  await new Promise(resolve => setTimeout(resolve, 500));

  // Initialize the connection
  try {
    await sendRequest(server, 'initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'slack-ai-assistant',
        version: '2.0.0',
      },
    });

    // Send initialized notification
    sendNotification(server, 'notifications/initialized', {});

    // Discover available tools
    const toolsResponse = await sendRequest(server, 'tools/list', {}) as { tools: MCPTool[] };
    server.tools = toolsResponse.tools || [];
    
    logger.info(`MCP server ${config.name} connected with ${server.tools.length} tools`);
    server.tools.forEach(tool => {
      logger.debug(`  - ${tool.name}: ${tool.description?.substring(0, 50)}...`);
    });

  } catch (error: any) {
    logger.error(`Failed to initialize MCP server ${config.name}: ${error.message}`);
    proc.kill();
    servers.delete(config.name);
    throw error;
  }
}

/**
 * Handle output from MCP server.
 */
function handleServerOutput(server: MCPServer, data: string): void {
  server.buffer += data;

  // Process complete JSON-RPC messages (newline-delimited)
  const lines = server.buffer.split('\n');
  server.buffer = lines.pop() || ''; // Keep incomplete line in buffer

  for (const line of lines) {
    if (!line.trim()) continue;

    try {
      const message = JSON.parse(line) as JSONRPCResponse;
      
      if (message.id !== undefined) {
        const pending = server.pendingRequests.get(message.id);
        if (pending) {
          server.pendingRequests.delete(message.id);
          
          if (message.error) {
            pending.reject(new Error(message.error.message));
          } else {
            pending.resolve(message.result);
          }
        }
      }
    } catch (error) {
      logger.debug(`[${server.name}] Non-JSON output: ${line}`);
    }
  }
}

/**
 * Send a JSON-RPC request to an MCP server.
 */
function sendRequest(server: MCPServer, method: string, params: Record<string, unknown>): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const id = ++server.requestId;
    
    const request: JSONRPCRequest = {
      jsonrpc: '2.0',
      id,
      method,
      params,
    };

    server.pendingRequests.set(id, { resolve, reject });

    const message = JSON.stringify(request) + '\n';
    server.process.stdin?.write(message);

    // Timeout after 30 seconds
    setTimeout(() => {
      if (server.pendingRequests.has(id)) {
        server.pendingRequests.delete(id);
        reject(new Error(`Request timeout: ${method}`));
      }
    }, 30000);
  });
}

/**
 * Send a JSON-RPC notification (no response expected).
 */
function sendNotification(server: MCPServer, method: string, params: Record<string, unknown>): void {
  const notification = {
    jsonrpc: '2.0',
    method,
    params,
  };

  const message = JSON.stringify(notification) + '\n';
  server.process.stdin?.write(message);
}

/**
 * Get all available tools from all connected MCP servers.
 * Returns tools with server prefix (e.g., "github_create_issue").
 */
export function getAllMCPTools(): Array<MCPTool & { serverName: string }> {
  const allTools: Array<MCPTool & { serverName: string }> = [];

  for (const [serverName, server] of servers) {
    for (const tool of server.tools) {
      allTools.push({
        ...tool,
        serverName,
        // Prefix tool name with server name for uniqueness
        name: `${serverName}_${tool.name}`,
      });
    }
  }

  return allTools;
}

/**
 * Execute a tool on an MCP server.
 * 
 * @param serverName - Name of the MCP server
 * @param toolName - Name of the tool (without server prefix)
 * @param args - Tool arguments
 */
export async function executeMCPTool(
  serverName: string,
  toolName: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const server = servers.get(serverName);
  
  if (!server) {
    throw new Error(`MCP server not connected: ${serverName}`);
  }

  logger.info(`Executing MCP tool: ${serverName}/${toolName}`);
  logger.debug(`Arguments: ${JSON.stringify(args)}`);

  try {
    const result = await sendRequest(server, 'tools/call', {
      name: toolName,
      arguments: args,
    });

    logger.debug(`Tool result: ${JSON.stringify(result)}`);
    return result;

  } catch (error: any) {
    logger.error(`MCP tool execution failed: ${error.message}`);
    throw error;
  }
}

/**
 * Parse a prefixed tool name (e.g., "github_create_issue") 
 * into server name and tool name.
 */
export function parseToolName(prefixedName: string): { serverName: string; toolName: string } | null {
  for (const serverName of servers.keys()) {
    if (prefixedName.startsWith(`${serverName}_`)) {
      return {
        serverName,
        toolName: prefixedName.substring(serverName.length + 1),
      };
    }
  }
  return null;
}

/**
 * Check if MCP is initialized with any servers.
 */
export function isMCPEnabled(): boolean {
  return servers.size > 0;
}

/**
 * Get list of connected server names.
 */
export function getConnectedServers(): string[] {
  return Array.from(servers.keys());
}

/**
 * Shutdown all MCP servers.
 */
export async function shutdownMCP(): Promise<void> {
  logger.info('Shutting down MCP servers...');

  for (const [name, server] of servers) {
    try {
      server.process.kill();
      logger.debug(`Stopped MCP server: ${name}`);
    } catch (error: any) {
      logger.error(`Error stopping MCP server ${name}: ${error.message}`);
    }
  }

  servers.clear();
  logger.info('MCP servers shutdown complete');
}
