#!/usr/bin/env node

import { HttpMcpClient } from '../http-mcp-client.js';

// Parse command line arguments
const args = process.argv.slice(2);
const urlArg = args.find(arg => arg.startsWith('--url='));
const url = urlArg ? urlArg.split('=')[1] : 'http://localhost:3001';

console.log(`🔗 Connecting to MCP server at: ${url}`);

const client = new HttpMcpClient(url);

// Example usage - list tools
client.initialize()
  .then(() => client.listTools())
  .then(tools => {
    console.log('📦 Available tools:');
    tools.forEach(tool => {
      console.log(`  • ${tool.name}: ${tool.description}`);
    });
  })
  .catch(console.error);