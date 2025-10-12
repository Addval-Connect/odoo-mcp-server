#!/usr/bin/env node

/**
 * Odoo MCP Server CLI - HTTP Only
 * Starts the HTTP-based Model Context Protocol server for Odoo
 */

import { HttpMcpServer } from '../http-mcp-server.js';

// Parse command line arguments
const args = process.argv.slice(2);
const portArg = args.find(arg => arg.startsWith('--port='));
const port = portArg ? parseInt(portArg.split('=')[1]) : 3001;

console.log(`🚀 Starting Odoo MCP HTTP Server on port ${port}...`);

const server = new HttpMcpServer();
server.start().catch((error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});