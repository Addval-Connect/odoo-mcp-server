# 🧪 ChatGPT MCP Integration - Test Plan

## Quick Start Test (5 Minuten)

### 1. Server Health Check
```bash
curl http://localhost:3001/health
```
**Erwartetes Ergebnis**: `{"status": "healthy", ...}`

### 2. Initialize Session
```bash
SESSION_ID=$(curl -s -i -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -H "MCP-Protocol-Version: 2024-11-05" \
  -d '{"jsonrpc": "2.0", "method": "initialize", "params": {"protocolVersion": "2024-11-05", "capabilities": {}, "clientInfo": {"name": "chatgpt", "version": "1.0.0"}}, "id": 1}' \
  | grep -i "mcp-session-id" | cut -d' ' -f2 | tr -d '\r')

echo "Session ID: $SESSION_ID"
```
**Erwartetes Ergebnis**: UUID (z.B. `f3048905-9c92-46bf-a92c-acc2997deb1a`)

### 3. Test odoo_ping (Canary)
```bash
curl -s -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -H "MCP-Protocol-Version: 2024-11-05" \
  -d '{"jsonrpc": "2.0", "method": "tools/call", "params": {"name": "odoo_ping", "arguments": {}}, "id": 2}' \
  | jq '.result.content[0].text | fromjson'
```
**Erwartetes Ergebnis**:
```json
{
  "ok": true,
  "connected": true,
  "server": "18.0-20250807",
  "protocol": 1
}
```

### 4. Test odoo_search_read (Small Payload - limit=5)
```bash
curl -s -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -H "MCP-Protocol-Version: 2024-11-05" \
  -d '{"jsonrpc": "2.0", "method": "tools/call", "params": {"name": "odoo_search_read", "arguments": {"model": "res.partner", "domain": [], "fields": ["name", "email"], "limit": 5}}, "id": 3}' \
  | jq -r '.result.content[0].text'
```
**Erwartetes Ergebnis**: Sanitierte Liste von max. 5 Partners

### 5. List All Tools
```bash
curl -s -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -H "MCP-Protocol-Version: 2024-11-05" \
  -d '{"jsonrpc": "2.0", "method": "tools/list", "params": {}, "id": 4}' \
  | jq '.result.tools | length'
```
**Erwartetes Ergebnis**: `13` (12 Odoo Tools + 1 echo)

---

## Progressive Load Test

### Test 1: Tiny Payload (limit=5)
```bash
curl -s -X POST http://localhost:3001/mcp \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{"jsonrpc": "2.0", "method": "tools/call", "params": {"name": "odoo_search_read", "arguments": {"model": "res.partner", "domain": [], "fields": ["name"], "limit": 5}}, "id": 10}'
```
✅ **Sollte**: Schnell (<1s) und stabil sein

### Test 2: Small Payload (limit=10)
```bash
curl -s -X POST http://localhost:3001/mcp \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{"jsonrpc": "2.0", "method": "tools/call", "params": {"name": "odoo_search_read", "arguments": {"model": "res.partner", "domain": [], "fields": ["name", "email", "phone"], "limit": 10}}, "id": 11}'
```
✅ **Sollte**: Stabil, ~2-3s

### Test 3: Medium Payload (limit=25)
```bash
curl -s -X POST http://localhost:3001/mcp \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{"jsonrpc": "2.0", "method": "tools/call", "params": {"name": "odoo_search_read", "arguments": {"model": "res.partner", "domain": [], "limit": 25}}, "id": 12}'
```
⚠️ **Sollte**: Funktionieren, aber bei ChatGPT auf Stabilität achten

### Test 4: Default Payload (limit=50)
```bash
curl -s -X POST http://localhost:3001/mcp \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{"jsonrpc": "2.0", "method": "tools/call", "params": {"name": "odoo_search_read", "arguments": {"model": "res.partner", "domain": [], "limit": 50}}, "id": 13}'
```
⚠️ **ChatGPT**: Könnte kritisch sein - beobachten

### Test 5: Max Payload (limit=200)
```bash
curl -s -X POST http://localhost:3001/mcp \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{"jsonrpc": "2.0", "method": "tools/call", "params": {"name": "odoo_search_read", "arguments": {"model": "res.partner", "domain": [], "limit": 200}}, "id": 14}'
```
🔴 **Nur für Stress-Test** - bei ChatGPT wahrscheinlich zu viel

---

## Parallel Request Test

### 2 Simultane Requests
```bash
# Terminal 1
curl -s -X POST http://localhost:3001/mcp \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{"jsonrpc": "2.0", "method": "tools/call", "params": {"name": "odoo_ping", "arguments": {}}, "id": 20}' &

# Terminal 2 (sofort danach)
curl -s -X POST http://localhost:3001/mcp \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{"jsonrpc": "2.0", "method": "tools/call", "params": {"name": "odoo_ping", "arguments": {}}, "id": 21}' &

wait
```
✅ **Sollte**: Beide Requests erfolgreich

---

## ChatGPT-Spezifische Tests

### Test: Tools Discovery
In ChatGPT Custom Action:
1. "List all available tools"
2. Erwartung: Sieht 13 Tools inkl. `odoo_ping`

### Test: Ping First
In ChatGPT:
1. "Check if Odoo server is connected"
2. Erwartung: Nutzt `odoo_ping` Tool
3. Response: JSON mit ok=true

### Test: Small Search
In ChatGPT:
1. "Find 3 partner companies in Odoo"
2. Erwartung: Nutzt `odoo_search_read` mit limit=3
3. Response: Liste von max. 3 Companies

### Test: Action Refresh
In ChatGPT Actions UI:
1. Click "Aktualisieren der Aktionen"
2. Erwartung: ✅ Erfolgreich (kein Fehler)
3. Alle 13 Tools sichtbar

---

## Error Handling Tests

### Test: Invalid Session
```bash
curl -s -X POST http://localhost:3001/mcp \
  -H "Mcp-Session-Id: invalid-uuid-123" \
  -d '{"jsonrpc": "2.0", "method": "tools/list", "params": {}, "id": 30}'
```
**Erwartetes Ergebnis**: JSON-RPC Error (nicht Server-Crash)

### Test: Missing Session
```bash
curl -s -X POST http://localhost:3001/mcp \
  -d '{"jsonrpc": "2.0", "method": "tools/list", "params": {}, "id": 31}'
```
**Erwartetes Ergebnis**: 400 Bad Request oder JSON-RPC Error

### Test: Invalid Tool
```bash
curl -s -X POST http://localhost:3001/mcp \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{"jsonrpc": "2.0", "method": "tools/call", "params": {"name": "nonexistent_tool", "arguments": {}}, "id": 32}'
```
**Erwartetes Ergebnis**: Tool not found Error

### Test: Over-Limit
```bash
curl -s -X POST http://localhost:3001/mcp \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{"jsonrpc": "2.0", "method": "tools/call", "params": {"name": "odoo_search_read", "arguments": {"model": "res.partner", "limit": 999}}, "id": 33}'
```
**Erwartetes Ergebnis**: Automatisch auf 200 begrenzt (Sanitizer)

---

## Performance Benchmarks

### Latency Check
```bash
time curl -s http://localhost:3001/health > /dev/null
```
**Target**: < 100ms

### Ping Latency
```bash
time curl -s -X POST http://localhost:3001/mcp \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{"jsonrpc": "2.0", "method": "tools/call", "params": {"name": "odoo_ping", "arguments": {}}, "id": 40}' > /dev/null
```
**Target**: < 500ms

### Small Search Latency
```bash
time curl -s -X POST http://localhost:3001/mcp \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{"jsonrpc": "2.0", "method": "tools/call", "params": {"name": "odoo_search_read", "arguments": {"model": "res.partner", "limit": 5}}, "id": 41}' > /dev/null
```
**Target**: < 2s

---

## Success Criteria

### ✅ Phase 1: Server Stability
- [x] Health endpoint responds
- [x] Initialize creates session
- [x] odoo_ping returns ok:true
- [x] No console.log in STDOUT

### ✅ Phase 2: Payload Safety
- [x] search_read respects limit=5
- [x] No binary fields in response
- [x] Relations normalized to {id, name}
- [x] Strings truncated at 10k chars

### ⏳ Phase 3: ChatGPT Integration
- [ ] Action refresh succeeds
- [ ] Tools list shows 13 tools
- [ ] odoo_ping call works
- [ ] search_read with limit=5 works

### ⏳ Phase 4: Progressive Load
- [ ] limit=10 stable
- [ ] limit=25 stable
- [ ] limit=50 tested

### ⏳ Phase 5: Production Readiness
- [ ] 2 parallel requests work
- [ ] Error handling robust
- [ ] < 2s average response time
- [ ] No crashes over 100 requests

---

## Troubleshooting Guide

### Problem: odoo_ping returns ok:false
**Check**: `curl http://localhost:8069/web/health` → Odoo server up?
**Fix**: Restart Odoo or check network

### Problem: search_read gives empty array
**Check**: `SELECT count(*) FROM res_partner;` in Odoo DB
**Fix**: Create test data

### Problem: ChatGPT Action Refresh fails
**Check**: `curl http://localhost:3001/mcp/tools` → Returns JSON?
**Fix**: Check STDERR logs: `tail -f mcp-server.log`

### Problem: Large payloads still crash
**Check**: Are binary fields still included?
**Fix**: Verify sanitizer: Add more BINARY_FIELDS to set

---

**Test Status**: 🟢 Lokal getestet & funktioniert
**Next**: ChatGPT Custom Action konfigurieren
