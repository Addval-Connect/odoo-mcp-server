#!/bin/bash

# Start Odoo MCP Server for ChatGPT Access
# This starts the server in HTTP mode (not STDIO)

cd "$(dirname "$0")"

# Load environment variables from .env.local if it exists
if [ -f .env.local ]; then
  echo "📋 Loading environment from .env.local"
  export $(cat .env.local | grep -v '^#' | xargs)
fi

# Set Odoo connection details (ChatGPT-optimized)
export ODOO_URL="${ODOO_URL:-http://192.168.178.10:8069}"
export ODOO_DB="${ODOO_DB:-grafikwichtel}"
export ODOO_DATABASE="${ODOO_DB}"  # Fallback for old code
export ODOO_USERNAME="${ODOO_USERNAME:-mcp-client@gw42.de}"
export ODOO_PASSWORD="${ODOO_PASSWORD:-Rfvm1310&Odoo}"
export ODOO_TRANSPORT="${ODOO_TRANSPORT:-jsonrpc}"

# MCP Server Settings (HTTP mode, full features, ChatGPT-optimized)
export MCP_TRANSPORT="http"  # HTTP mode for ChatGPT access
export MCP_HTTP_PORT="3001"
export MCP_MINIMAL_MODE="false"
export MCP_SIMPLIFY_SCHEMA="false"

echo "🚀 Starting Odoo MCP Server for ChatGPT..."
echo "📡 HTTP Endpoint: http://localhost:3001"
echo "🔧 Mode: Full (13 tools + ChatGPT-optimized)"
echo "🔐 Odoo: ${ODOO_URL} → ${ODOO_DB}"
echo "👤 User: ${ODOO_USERNAME}"
echo ""
echo "⚡ ChatGPT Optimizations:"
echo "   • Default Limit: 10 records (max 100)"
echo "   • Request Timeout: 25 seconds"
echo "   • Response Size Check: <95KB"
echo "   • Binary Fields: Auto-removed"
echo "   • Session Management: Optional"
echo ""
echo "🌐 Ready for ChatGPT access via tunnel"
echo "   Run: cloudflared tunnel --url http://localhost:3001"
echo ""

# Start the server (logs to console)
exec node dist/http-mcp-server.js
