#!/usr/bin/env node
/**
 * Odoo MCP Server - STDIO Entry Point
 * Starts the MCP server in STDIO mode for Claude Desktop integration
 */

import { HttpMcpServer } from './http-mcp-server.js';

// Create and start server
const server = new HttpMcpServer();

// Start STDIO mode (uses stdin/stdout for MCP protocol)
server.startStdio().catch(error => {
  console.error('[FATAL] Failed to start Odoo MCP Server in STDIO mode:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.error('[SHUTDOWN] Received SIGINT, shutting down gracefully');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error('[SHUTDOWN] Received SIGTERM, shutting down gracefully');
  process.exit(0);
});
