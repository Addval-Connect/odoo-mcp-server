/**
 * MCP Server Utilities and Formatters
 */

import { McpToolResponse } from '../types/index.js';

export const formatResponse = (content: string): McpToolResponse => {
  return {
    content: [
      {
        type: 'text',
        text: content,
      },
    ],
  };
};

export const formatError = (error: string | Error): McpToolResponse => {
  const errorMessage = error instanceof Error ? error.message : error;
  return {
    content: [
      {
        type: 'text',
        text: `Error: ${errorMessage}`,
      },
    ],
  };
};

export const formatSuccess = (message: string, data?: any): McpToolResponse => {
  let content = `Success: ${message}`;
  if (data) {
    content += `\nData: ${JSON.stringify(data, null, 2)}`;
  }
  
  return {
    content: [
      {
        type: 'text',
        text: content,
      },
    ],
  };
};

export const logServerEvent = (event: string, details?: any): void => {
  const timestamp = new Date().toISOString();
  const message = details 
    ? `[${timestamp}] ${event}: ${JSON.stringify(details)}`
    : `[${timestamp}] ${event}`;
  
  console.error(message); // Using console.error to write to stderr for MCP logging
};