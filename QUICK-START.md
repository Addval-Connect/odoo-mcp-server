# 🚀 Quick Start Guide

Das `start.sh` Script richtet automatisch alles ein und startet den Odoo MCP Server mit einem öffentlichen Cloudflare Tunnel.

## Verwendung

```bash
# Einfach ausführen - alles wird automatisch eingerichtet
./start.sh
```

## Was macht das Script?

1. **🔧 Abhängigkeiten prüfen/installieren:**
   - Node.js (≥18.0.0)  
   - Cloudflared CLI
   - npm Packages

2. **📋 Konfiguration laden:**
   - `.env.local` (falls vorhanden)
   - `config.local.json` (falls vorhanden)
   - Fallback auf Standard-Werte

3. **🏗️ Projekt vorbereiten:**
   - TypeScript kompilieren
   - Dependencies installieren

4. **🚀 Services starten:**
   - MCP Server (HTTP Mode auf Port 3001)
   - Cloudflare Tunnel (öffentlicher Zugang)

5. **📊 Monitoring:**
   - Echtzeit-Logs anzeigen
   - Service-Status überwachen
   - Graceful Shutdown bei Ctrl+C

## Ausgabe Beispiel

```
🚀 Odoo MCP Server Setup & Start
============================================================

ℹ️  Node.js already installed: v18.17.0
✅ Cloudflared already installed: 2024.1.5
✅ Dependencies already installed
✅ Project built successfully
✅ Configuration loaded from .env.local
✅ MCP Server started (PID: 12345)
✅ MCP Server is ready!
✅ Cloudflare tunnel started (PID: 12346)
✅ Tunnel available at: https://abc123.trycloudflare.com

🔗 Your Odoo MCP Server is now accessible via:
https://abc123.trycloudflare.com

📚 Quick API Examples:

1. Check server health:
curl https://abc123.trycloudflare.com/health

2. List all available tools:
curl https://abc123.trycloudflare.com/tools

3. Connect to your Odoo instance:
curl -X POST https://abc123.trycloudflare.com/tools/odoo_connect \
  -H "Content-Type: application/json" \
  -d '{"url": "...", "database": "...", ...}'
```

## Konfiguration

Das Script lädt automatisch Konfiguration aus:

### 1. `.env.local` (empfohlen)
```bash
ODOO_URL=http://192.168.178.10:8069
ODOO_DATABASE=odoo
ODOO_USERNAME=admin
ODOO_PASSWORD=Rfvm1310&Odoo
ODOO_TRANSPORT=jsonrpc
MCP_HTTP_PORT=3001
```

### 2. `config.local.json` (alternative)
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
    "httpPort": 3001
  }
}
```

## Unterstützte Betriebssysteme

- ✅ **macOS** (mit Homebrew oder direkte Installation)
- ✅ **Linux** (Ubuntu/Debian)
- ⚠️ **Windows** (WSL empfohlen)

## Troubleshooting

### Port bereits verwendet
```bash
# Andere Anwendung auf Port 3001 finden und beenden
lsof -ti:3001 | xargs kill -9
./start.sh
```

### Cloudflared Installation fehlgeschlagen
```bash
# Manuelle Installation von: 
# https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/
```

### Node.js zu alt
```bash
# macOS mit Homebrew
brew update && brew upgrade node

# Linux
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

## Logs

Das Script erstellt folgende Log-Dateien:
- `cloudflared.log` - Cloudflare Tunnel Logs
- Console Output - MCP Server Logs

## Services beenden

```bash
# Einfach Ctrl+C drücken - alle Services werden sauber beendet
^C
⚠️  Shutting down services...
ℹ️  MCP Server stopped
ℹ️  Cloudflare Tunnel stopped
```

## Sicherheitshinweise

⚠️ **Der Cloudflare Tunnel macht Ihren MCP Server öffentlich zugänglich!**

- Verwenden Sie starke Odoo-Credentials
- Überwachen Sie die Zugriffe
- Beenden Sie den Tunnel nach der Nutzung
- Für Produktion: Verwenden Sie authentifizierte Tunnel