#!/bin/bash

# =============================================================================
# MCP STDIO Server Start Script for Claude Desktop
# =============================================================================
# This script starts the Odoo MCP Server in STDIO mode for Claude Desktop
# Logs are written to mcp-stdio.log (STDERR only)
# =============================================================================

# Navigate to project directory
cd "$(dirname "$0")"

# Load environment from .env.local if exists
if [ -f ".env.local" ]; then
  export $(cat .env.local | grep -v '^#' | xargs)
fi

# Set Odoo connection (override with your values or use .env.local)
export ODOO_URL="${ODOO_URL:-http://192.168.178.10:8069}"
export ODOO_DATABASE="${ODOO_DATABASE:-grafikwichtel}"
export ODOO_USERNAME="${ODOO_USERNAME:-mcp-client@gw42.de}"
export ODOO_PASSWORD="${ODOO_PASSWORD:-Rfvm1310&Odoo}"
export ODOO_TRANSPORT="${ODOO_TRANSPORT:-jsonrpc}"

# MCP Configuration
export MCP_TRANSPORT="stdio"
export MCP_MINIMAL_MODE="${MCP_MINIMAL_MODE:-false}"
export MCP_SIMPLIFY_SCHEMA="${MCP_SIMPLIFY_SCHEMA:-false}"

# Start MCP Server in STDIO mode
# IMPORTANT: All logs go to STDERR (redirected to file)
# STDOUT is kept clean for JSON-RPC protocol
exec node dist/http-mcp-server.js 2>> mcp-stdio.log
