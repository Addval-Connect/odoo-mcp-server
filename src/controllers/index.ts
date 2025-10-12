/**
 * MCP Server Controllers
 */

import { ToolRegistry } from '../models/index.js';
import { McpToolResponse } from '../types/index.js';

export class McpServerController {
  private toolRegistry: ToolRegistry;

  constructor() {
    this.toolRegistry = new ToolRegistry();
    this.initializeTools();
  }

  private initializeTools(): void {
    // Tools are automatically registered in ToolRegistry constructor
    // The OdooTools are registered via registerOdooTools() method
    console.error('[MCP] Initialized tools:', this.toolRegistry.getToolNames());
  }

  async handleToolCall(name: string, args: Record<string, any>): Promise<McpToolResponse> {
    if (!this.toolRegistry.hasTool(name)) {
      throw new Error(`Unknown tool: ${name}`);
    }

    try {
      return await this.toolRegistry.executeTool(name, args);
    } catch (error) {
      throw new Error(`Tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  getAvailableTools() {
    return this.toolRegistry.getTools();
  }

  registerTool(name: string, definition: any, handler: any): void {
    this.toolRegistry.register(name, definition, handler);
  }
}