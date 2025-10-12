# 🔌 MCP Server Transport Modes

Der Odoo MCP Server unterstützt jetzt **zwei Transport-Modi**:

## 1. HTTP Transport (Standard)

**Verwendung**: Für REST APIs, Web-Clients, ChatGPT, etc.

### Start:
```bash
# Explizit
MCP_TRANSPORT=http ./start.sh

# Oder Standard (ohne MCP_TRANSPORT)
./start.sh
```

### Features:
- ✅ REST API Endpoints
- ✅ Session Management via Headers
- ✅ Health Checks
- ✅ API Documentation
- ✅ CORS Support
- ✅ Parallel Requests

### Endpoints:
```
POST   /mcp              - JSON-RPC 2.0 (initialize, tools/list, tools/call)
GET    /mcp              - SSE Stream
DELETE /mcp              - Session Termination
GET    /mcp/tools        - List Tools (REST)
POST   /mcp/tools/:name  - Execute Tool (REST)
GET    /health           - Health Check
GET    /info             - Server Info
GET    /docs             - API Docs
```

### Zugriff:
```bash
curl http://localhost:3001/health
```

---

## 2. STDIO Transport (Neu!)

**Verwendung**: Für Claude Desktop, MCP Clients, CLI Tools

### Start:
```bash
MCP_TRANSPORT=stdio node dist/http-mcp-server.js
```

### Features:
- ✅ JSON-RPC über stdin/stdout
- ✅ Claude Desktop kompatibel
- ✅ Session-less (zustandslos)
- ✅ Reine Protokoll-Kommunikation
- ✅ Keine HTTP-Overhead

### Protokoll:
```
STDIN  → JSON-RPC Request
STDOUT → JSON-RPC Response
STDERR → Logging (nicht im Protokoll)
```

### Beispiel (Manuell):
```bash
echo '{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}},"id":1}' | \
MCP_TRANSPORT=stdio node dist/http-mcp-server.js
```

**Response** (auf stdout):
```json
{
  "jsonrpc": "2.0",
  "result": {
    "protocolVersion": "2024-11-05",
    "capabilities": {"tools": {...}},
    "serverInfo": {"name": "odoo-mcp-http-server", "version": "1.0.0"}
  },
  "id": 1
}
```

---

## Claude Desktop Integration

### 1. Erstelle Start-Script
```bash
#!/bin/bash
# mcp-stdio-server.sh

cd /Users/michaelweinheimer/projects/odoo-mcp/odoo-mcp

# Setze Environment
export ODOO_URL="http://192.168.178.10:8069"
export ODOO_DATABASE="grafikwichtel"
export ODOO_USERNAME="mcp-client@gw42.de"
export ODOO_PASSWORD="Rfvm1310&Odoo"
export ODOO_TRANSPORT="jsonrpc"
export MCP_TRANSPORT="stdio"
export MCP_MINIMAL_MODE="false"
export MCP_SIMPLIFY_SCHEMA="false"

# Start STDIO Mode
exec node dist/http-mcp-server.js 2> mcp-stdio.log
```

Mache es ausführbar:
```bash
chmod +x mcp-stdio-server.sh
```

### 2. Konfiguriere Claude Desktop

`~/Library/Application Support/Claude/claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "odoo": {
      "command": "/Users/michaelweinheimer/projects/odoo-mcp/odoo-mcp/mcp-stdio-server.sh"
    }
  }
}
```

### 3. Starte Claude Desktop neu

Claude erkennt automatisch den MCP Server und lädt die Tools.

---

## Vergleich: HTTP vs STDIO

| Feature | HTTP | STDIO |
|---------|------|-------|
| **Verwendung** | Web APIs, ChatGPT | Claude Desktop, CLI |
| **Transport** | HTTP/REST | stdin/stdout |
| **Sessions** | Header-basiert | Session-less |
| **Port** | 3001 | - |
| **Parallel** | ✅ Ja | ❌ Sequenziell |
| **Dokumentation** | `/docs` Endpoint | - |
| **Health Checks** | `/health` Endpoint | - |
| **Overhead** | HTTP Headers | Minimal |
| **Debugging** | Browser, curl | Pipes, logs |

---

## Logging

### HTTP Mode:
- Server-Events: STDERR
- HTTP-Requests: STDERR
- Responses: HTTP Body

### STDIO Mode:
- Server-Events: STDERR (`mcp-stdio.log`)
- Protocol: STDOUT (rein)
- Errors: STDERR

**Wichtig**: STDOUT ist in STDIO-Mode **protokollrein** - kein `console.log()` erlaubt!

---

## Environment Variables

| Variable | HTTP | STDIO | Beschreibung |
|----------|------|-------|--------------|
| `MCP_TRANSPORT` | `http` (default) | `stdio` | Transport-Modus |
| `MCP_HTTP_PORT` | `3001` | - | HTTP Port |
| `ODOO_URL` | ✅ | ✅ | Odoo Server URL |
| `ODOO_DATABASE` | ✅ | ✅ | Datenbank Name |
| `ODOO_USERNAME` | ✅ | ✅ | Benutzername |
| `ODOO_PASSWORD` | ✅ | ✅ | Passwort |
| `ODOO_TRANSPORT` | ✅ | ✅ | jsonrpc/xmlrpc |
| `MCP_MINIMAL_MODE` | ✅ | ✅ | true/false |
| `MCP_SIMPLIFY_SCHEMA` | ✅ | ✅ | true/false |

---

## Testing

### HTTP Mode Test:
```bash
# Start Server
MCP_TRANSPORT=http ./start.sh

# Test Health
curl http://localhost:3001/health

# Test Initialize
curl -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -H "MCP-Protocol-Version: 2024-11-05" \
  -d '{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}},"id":1}'
```

### STDIO Mode Test:
```bash
# Start Server in STDIO
MCP_TRANSPORT=stdio node dist/http-mcp-server.js &
SERVER_PID=$!

# Send Initialize
echo '{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}},"id":1}' | \
nc localhost 0

# Send Tools List
echo '{"jsonrpc":"2.0","method":"tools/list","params":{},"id":2}' | \
nc localhost 0

# Stop Server
kill $SERVER_PID
```

---

## Troubleshooting

### HTTP Mode:
```bash
# Check if server is running
curl http://localhost:3001/health

# Check logs
tail -f mcp-server.log
```

### STDIO Mode:
```bash
# Check stderr logs
tail -f mcp-stdio.log

# Test with echo/pipe
echo '{"jsonrpc":"2.0","method":"tools/list","params":{},"id":1}' | \
MCP_TRANSPORT=stdio node dist/http-mcp-server.js
```

### Common Issues:

**Problem**: STDIO mode gibt keine Response
- **Check**: STDOUT verschmutzt durch console.log?
- **Fix**: Alle console.log durch console.error ersetzen ✅

**Problem**: HTTP mode antwortet nicht
- **Check**: Port 3001 belegt?
- **Fix**: `lsof -i :3001` → Process killen

**Problem**: Claude Desktop sieht keine Tools
- **Check**: Start-Script ausführbar? Pfade korrekt?
- **Fix**: `chmod +x mcp-stdio-server.sh` und Pfade prüfen

---

## Migration

### Von HTTP zu STDIO:
```bash
# Stoppe HTTP Server
pkill -f "node.*http-mcp-server"

# Starte STDIO Mode
MCP_TRANSPORT=stdio node dist/http-mcp-server.js
```

### Von STDIO zu HTTP:
```bash
# Stoppe STDIO Process
pkill -f "node.*http-mcp-server"

# Starte HTTP Mode
./start.sh
```

---

**Status**: 
- ✅ HTTP Transport: Voll funktionsfähig
- ✅ STDIO Transport: Implementiert & getestet
- ✅ Beide Modi nutzen gleiche Controller & Tools
- ✅ Session Management je nach Transport-Modus
