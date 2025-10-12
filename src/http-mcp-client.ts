#!/usr/bin/env node

/**
 * HTTP MCP Client - Universal MCP Client über HTTP
 * Ermöglicht die Interaktion mit HTTP-basierten MCP Servern
 */

import axios from 'axios';

export class HttpMcpClient {
  private baseUrl: string;
  private initialized: boolean = false;
  
  constructor(baseUrl: string = 'http://localhost:3001') {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
  }

  /**
   * Initialize MCP session
   */
  async initialize(): Promise<void> {
    try {
      const response = await axios.post(`${this.baseUrl}/mcp/initialize`, {});
      
      if (response.data.success) {
        this.initialized = true;
        console.log('✅ MCP session initialized');
        console.log('📋 Server Info:', response.data.result.serverInfo);
        console.log('🔧 Protocol Version:', response.data.result.protocolVersion);
      } else {
        throw new Error('Initialization failed');
      }
    } catch (error) {
      throw new Error(`Failed to initialize MCP session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * List available tools
   */
  async listTools(): Promise<any[]> {
    this.ensureInitialized();
    
    try {
      const response = await axios.get(`${this.baseUrl}/mcp/tools`);
      
      if (response.data.success) {
        return response.data.tools;
      } else {
        throw new Error('Failed to list tools');
      }
    } catch (error) {
      throw new Error(`Failed to list tools: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Execute a tool
   */
  async executeTool(toolName: string, args: any = {}): Promise<any> {
    this.ensureInitialized();
    
    try {
      const response = await axios.post(`${this.baseUrl}/mcp/tools/${toolName}`, args);
      
      if (response.data.success) {
        return response.data.result;
      } else {
        throw new Error(response.data.error || 'Tool execution failed');
      }
    } catch (error) {
      if (error instanceof Error && 'response' in error) {
        const axiosError = error as any;
        const errorMessage = axiosError.response?.data?.error || axiosError.message;
        throw new Error(`Tool execution failed: ${errorMessage}`);
      }
      throw new Error(`Tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Execute multiple tools in batch
   */
  async executeBatch(tools: Array<{ name: string, args?: any }>): Promise<any[]> {
    this.ensureInitialized();
    
    try {
      const response = await axios.post(`${this.baseUrl}/mcp/batch`, { tools });
      
      if (response.data.success) {
        return response.data.results;
      } else {
        throw new Error('Batch execution failed');
      }
    } catch (error) {
      throw new Error(`Batch execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get server information
   */
  async getServerInfo(): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/info`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get server info: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check server health
   */
  async healthCheck(): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/health`);
      return response.data;
    } catch (error) {
      throw new Error(`Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('MCP client not initialized. Call initialize() first.');
    }
  }
}

// CLI Interface wenn direkt ausgeführt
async function main() {
  const args = process.argv.slice(2);
  const serverUrl = args.find(arg => arg.startsWith('--url='))?.split('=')[1] || 'http://localhost:3001';
  
  console.log('🌍 HTTP MCP Client');
  console.log('📍 Server URL:', serverUrl);
  console.log('');

  const client = new HttpMcpClient(serverUrl);

  try {
    // Health Check
    console.log('🏥 Health Check...');
    const health = await client.healthCheck();
    console.log('✅ Server is healthy:', health.status);
    console.log('');

    // Initialize
    console.log('🚀 Initializing MCP session...');
    await client.initialize();
    console.log('');

    // List Tools
    console.log('🔧 Available Tools:');
    const tools = await client.listTools();
    tools.forEach((tool, index) => {
      console.log(`${index + 1}. ${tool.name} - ${tool.description}`);
    });
    console.log('');

    // Test Echo Tool
    console.log('🧪 Testing Echo Tool...');
    const echoResult = await client.executeTool('echo', { message: 'Hello HTTP MCP!' });
    console.log('📝 Echo Result:', echoResult.content[0].text);
    console.log('');

    // Batch Test
    console.log('⚡ Batch Test...');
    const batchResults = await client.executeBatch([
      { name: 'echo', args: { message: 'Batch message 1' } },
      { name: 'echo', args: { message: 'Batch message 2' } }
    ]);
    
    batchResults.forEach((result, index) => {
      if (result.success) {
        console.log(`📦 Batch ${index + 1}: ${result.result.content[0].text}`);
      } else {
        console.log(`❌ Batch ${index + 1} failed: ${result.error}`);
      }
    });
    console.log('');

    // Server Info
    console.log('ℹ️ Server Information:');
    const info = await client.getServerInfo();
    console.log('   Name:', info.name);
    console.log('   Version:', info.version);
    console.log('   Protocol:', `${info.protocol.name} v${info.protocol.version}`);
    console.log('   Transport:', info.protocol.transport);
    console.log('');

    console.log('🎉 All tests completed successfully!');

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

// Run CLI if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export default HttpMcpClient;