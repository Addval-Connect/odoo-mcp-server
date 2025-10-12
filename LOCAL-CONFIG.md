# Lokale Entwicklungskonfiguration

Diese Dateien sind **NICHT** im veröffentlichten npm-Package enthalten und dienen nur der lokalen Entwicklung.

## Konfigurationsdateien

### 1. `.env.local` (Environment Variables)
```bash
# Kopieren Sie diese Datei und passen Sie die Werte an:
ODOO_URL=http://192.168.178.10:8069
ODOO_DATABASE=odoo
ODOO_USERNAME=admin
ODOO_PASSWORD=Rfvm1310&Odoo
ODOO_TRANSPORT=jsonrpc
MCP_HTTP_PORT=3001
```

### 2. `config.local.json` (JSON Konfiguration)
```json
{
  "odoo": {
    "url": "http://192.168.178.10:8069",
    "database": "odoo",
    "username": "admin", 
    "password": "Rfvm1310&Odoo",
    "transport": "jsonrpc"
  },
  "mcp": {
    "httpPort": 3001,
    "logLevel": "info"
  }
}
```

## Lokale Entwicklungskommandos

```bash
# Server mit lokaler Konfiguration starten (HTTP-Modus - Standard)
npm run local

# Server mit lokaler Konfiguration starten (explizit HTTP-Modus)
npm run local:http

# Server mit lokaler Konfiguration starten (STDIO-Modus)
npm run local:stdio

# Build und Start mit lokaler Konfiguration
npm run local:dev

# Direkter Aufruf des Skripts (HTTP ist Standard)
node start-local.mjs

# Direkter Aufruf mit STDIO-Modus
node start-local.mjs --stdio
```

## So funktioniert es

1. Das `start-local.mjs` Skript lädt automatisch:
   - `.env.local` Umgebungsvariablen
   - `config.local.json` Konfiguration

2. Die Konfiguration wird als Umgebungsvariablen gesetzt

3. Der MCP Server wird mit der lokalen Konfiguration gestartet

4. Zeigt die geladene Konfiguration beim Start an

## Beispiel-Ausgabe

```
🚀 Starting Odoo MCP Server with local configuration...

✅ Loaded configuration from .env.local
✅ Loaded configuration from config.local.json

📋 Current Configuration:
   Odoo URL: http://localhost:8069
   Database: my_local_db
   Username: admin
   Transport: jsonrpc
   HTTP Port: 3001

📚 Available example configurations:
   - production: https://your-odoo-instance.com
   - docker_local: http://localhost:8069
   - legacy_xmlrpc: http://old-odoo-server:8069

🎯 Starting in HTTP mode...

[MCP Server starting up]
Odoo MCP HTTP Server running at http://localhost:3001
```

## Sicherheitshinweise

- ⚠️ Diese Dateien enthalten Passwörter und sind in `.gitignore` und `.npmignore`
- ✅ Sie werden **nicht** mit git committet
- ✅ Sie werden **nicht** mit npm veröffentlicht
- 🔒 Teilen Sie diese Dateien nicht öffentlich

## Schnellstart

1. Kopieren Sie die Beispieldateien:
   ```bash
   cp .env.local .env.local.backup  # Falls Sie eine Sicherung wollen
   ```

2. Bearbeiten Sie `.env.local` mit Ihren Odoo-Zugangsdaten

3. Starten Sie den Server (HTTP ist jetzt Standard):
   ```bash
   npm run local
   ```

4. Testen Sie die Verbindung:
   ```bash
   curl -X POST http://localhost:3001/tools/odoo_connect \
     -H "Content-Type: application/json" \
     -d '{}'  # Verwendet automatisch die lokale Konfiguration
   ```