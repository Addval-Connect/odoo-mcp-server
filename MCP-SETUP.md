# MCP Settings für VS Code

Diese Datei erklärt, wie Sie den Odoo MCP Server in VS Code konfigurieren.

## 1. VS Code Settings (settings.json)

Fügen Sie diese Konfiguration zu Ihrer VS Code `settings.json` hinzu:

```json
{
  "mcp.servers": {
    "odoo-mcp-server": {
      "command": "node",
      "args": ["./dist/index.js", "--stdio"],
      "cwd": "/Users/michaelweinheimer/projects/odoo-mcp/odoo-mcp",
      "env": {
        "ODOO_URL": "http://192.168.178.10:8069",
        "ODOO_DATABASE": "odoo", 
        "ODOO_USERNAME": "admin",
        "ODOO_PASSWORD": "Rfvm1310&Odoo",
        "ODOO_TRANSPORT": "jsonrpc"
      }
    }
  }
}
```

## 2. Alternative: Claude Desktop App

Für die Claude Desktop App, fügen Sie zu `~/Library/Application Support/Claude/claude_desktop_config.json` hinzu:

```json
{
  "mcpServers": {
    "odoo-mcp-server": {
      "command": "node",
      "args": ["/Users/michaelweinheimer/projects/odoo-mcp/odoo-mcp/dist/index.js", "--stdio"],
      "env": {
        "ODOO_URL": "http://192.168.178.10:8069",
        "ODOO_DATABASE": "odoo",
        "ODOO_USERNAME": "admin", 
        "ODOO_PASSWORD": "Rfvm1310&Odoo",
        "ODOO_TRANSPORT": "jsonrpc"
      }
    }
  }
}
```

## 3. HTTP Mode (Alternative)

Für HTTP-basierte Nutzung (empfohlen für Debugging):

```bash
# Server starten
npm run local

# In einem anderen Terminal testen:
curl http://localhost:3001/tools
```

## 4. Debugging

Um zu testen, ob der MCP Server korrekt funktioniert:

```bash
# 1. Build das Projekt
npm run build

# 2. Teste stdio mode direkt
echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | node dist/index.js --stdio

# 3. Teste HTTP mode
npm run local
curl http://localhost:3001/tools
```

## 5. Troubleshooting

### "Method not found" Fehler

1. Stellen Sie sicher, dass das Projekt gebaut wurde: `npm run build`
2. Prüfen Sie, ob die Tools korrekt registriert sind:
   ```bash
   echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | node dist/index.js --stdio
   ```
3. Prüfen Sie die VS Code MCP Extension Logs

### Verbindungsprobleme zu Odoo

1. Prüfen Sie die Odoo-URL und Credentials in `.env.local`
2. Testen Sie die Verbindung manuell:
   ```bash
   curl -X POST http://localhost:3001/tools/odoo_connect \
     -H "Content-Type: application/json" \
     -d '{"url":"http://192.168.178.10:8069","database":"odoo","username":"admin","password":"Rfvm1310&Odoo","transport":"jsonrpc"}'
   ```

## 6. Verfügbare Tools

Der Server stellt folgende Odoo-Tools bereit:
- `odoo_connect` - Verbindung zu Odoo herstellen
- `odoo_search_read` - Datensätze suchen und lesen
- `odoo_create` - Neue Datensätze erstellen
- `odoo_update` - Datensätze aktualisieren  
- `odoo_delete` - Datensätze löschen
- `odoo_call_method` - Eigene Methoden aufrufen
- `odoo_get_model_fields` - Modell-Felder abfragen
- `odoo_search` - Nur IDs suchen
- `odoo_read` - Datensätze nach ID lesen
- `odoo_version` - Odoo Version abfragen
- `odoo_list_databases` - Verfügbare Datenbanken auflisten
- `echo` - Test-Tool