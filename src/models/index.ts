/**
 * MCP Tool Models
 */

import { McpTool, ToolHandler, McpToolResponse } from '../types/index.js';
import { OdooTools } from './odoo-tools.js';

export class ToolRegistry {
  private tools: Map<string, { definition: McpTool; handler: ToolHandler }> = new Map();
  private odooTools: OdooTools;

  constructor() {
    this.odooTools = new OdooTools();
    this.registerOdooTools();
    this.registerExampleTools();
  }

  private registerOdooTools(): void {
    const odooTools = this.odooTools.getTools();
    for (const [name, tool] of Object.entries(odooTools)) {
      this.tools.set(name, tool);
    }
  }

  private registerExampleTools(): void {
    // Register example tools
    this.register('echo', {
      name: 'echo',
      description: 'Echo back the provided message',
      inputSchema: {
        type: 'object' as const,
        properties: {
          message: {
            type: 'string',
            description: 'The message to echo back',
          },
        },
        required: ['message'],
      },
    }, async (args: Record<string, any>): Promise<McpToolResponse> => {
      return {
        content: [
          {
            type: 'text',
            text: `Echo: ${args.message}`,
          },
        ],
      };
    });
  }

  register(name: string, definition: McpTool, handler: ToolHandler): void {
    this.tools.set(name, { definition, handler });
  }

  getTools(): McpTool[] {
    return Array.from(this.tools.values()).map(tool => tool.definition);
  }

  async executeTool(name: string, args: Record<string, any>): Promise<McpToolResponse> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool '${name}' not found`);
    }
    return tool.handler(args);
  }

  hasTool(name: string): boolean {
    return this.tools.has(name);
  }

  getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }
}

// Export the Odoo tools for direct use if needed
export { OdooTools } from './odoo-tools.js';
export { OdooApiClient } from './odoo-client.js';