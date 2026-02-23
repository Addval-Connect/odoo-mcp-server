# Design: Per-Session Odoo Auth via HTTP Headers

**Date:** 2026-02-23
**Status:** Approved

## Problem

The server currently supports a single shared Odoo connection (via ENV vars or `odoo_connect` tool).
Clients connecting to the hosted MCP server cannot supply their own Odoo credentials without calling `odoo_connect` as a tool.

## Goal

Allow any MCP client to pass their Odoo credentials via HTTP request headers when connecting to the server. Each MCP session gets an isolated Odoo connection — no credentials shared between clients.

## Client Configuration

Clients configure four custom headers alongside the MCP server URL:

```json
{
  "mcpServers": {
    "odoo": {
      "type": "http",
      "url": "https://ai.addvalconnect.com/mcp",
      "headers": {
        "X-Odoo-URL":      "https://mi.odoo.com",
        "X-Odoo-DB":       "mydb",
        "X-Odoo-Username": "admin",
        "X-Odoo-Password": "secret"
      }
    }
  }
}
```

Optional header:
- `X-Odoo-Transport`: `jsonrpc` (default) | `xmlrpc` | `http`

## Architecture: Per-Session McpServerController (Approach A)

### Session State Change

```typescript
// Before
sessions: Map<string, { state: any; createdAt: Date }>

// After
sessions: Map<string, { state: any; createdAt: Date; controller?: McpServerController }>
```

### Flow

```
POST /mcp  (initialize, with X-Odoo-* headers)
  → extract credentials from headers
  → create new McpServerController
  → call odoo_connect with those credentials (auto-connect)
  → store controller in session state
  → return session ID

POST /mcp  (tools/call, with Mcp-Session-Id header)
  → look up session → get session.controller
  → execute tool via session controller (already connected to Odoo)
```

### Fallback Priority

1. Session header credentials (X-Odoo-* headers on initialize)
2. ENV vars auto-login (ODOO_URL, ODOO_DB, ODOO_USERNAME, ODOO_PASSWORD)
3. Manual `odoo_connect` tool call

### Files to Modify

- `src/http-mcp-server.ts` — session state type, initialize handler, processJsonRpcRequest signature
- No changes needed to `McpServerController`, `ToolRegistry`, or `OdooTools`

## Security Notes

- Headers are not stored in server access logs (unlike query params)
- Credentials stored in session memory only for the session lifetime
- Sessions should be cleaned up on DELETE /mcp or timeout
