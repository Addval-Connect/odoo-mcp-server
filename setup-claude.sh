#!/bin/bash

# =============================================================================
# Claude Desktop MCP Setup Script
# =============================================================================
# Dieses Script konfiguriert automatisch den Odoo MCP Server für Claude Desktop
# =============================================================================

set -e

# Farben für Output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_header() {
    echo -e "\n${PURPLE}🚀 $1${NC}"
    echo -e "${PURPLE}$(printf '=%.0s' {1..60})${NC}\n"
}

# =============================================================================
# Main Setup Function
# =============================================================================

setup_claude_desktop() {
    log_header "Claude Desktop MCP Setup"
    
    # Detect Claude Desktop config directory
    CLAUDE_CONFIG_DIR=""
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        CLAUDE_CONFIG_DIR="$HOME/Library/Application Support/Claude"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        CLAUDE_CONFIG_DIR="$HOME/.config/Claude"
    else
        log_error "Unsupported OS. Please configure Claude Desktop manually."
        exit 1
    fi
    
    log_info "Claude Desktop config directory: $CLAUDE_CONFIG_DIR"
    
    # Create config directory if it doesn't exist
    mkdir -p "$CLAUDE_CONFIG_DIR"
    
    # Get current project path
    PROJECT_PATH="$(pwd)"
    DIST_PATH="$PROJECT_PATH/dist/index.js"
    
    # Check if built project exists
    if [ ! -f "$DIST_PATH" ]; then
        log_warning "Project not built. Building now..."
        npm run build
        if [ ! -f "$DIST_PATH" ]; then
            log_error "Build failed. Please run 'npm run build' manually."
            exit 1
        fi
    fi
    
    # Load environment variables
    log_info "Loading configuration from .env.local..."
    
    # Default values
    ODOO_URL="${ODOO_URL:-http://localhost:8069}"
    ODOO_DATABASE="${ODOO_DATABASE:-odoo}"
    ODOO_USERNAME="${ODOO_USERNAME:-admin}"
    ODOO_PASSWORD="${ODOO_PASSWORD:-admin}"
    ODOO_TRANSPORT="${ODOO_TRANSPORT:-jsonrpc}"
    
    # Load .env.local if exists
    if [ -f ".env.local" ]; then
        while IFS='=' read -r key value; do
            # Skip comments and empty lines
            [[ $key =~ ^[[:space:]]*# ]] && continue
            [[ -z "$key" ]] && continue
            # Remove quotes and export
            value=$(echo "$value" | sed 's/^["'\'']\(.*\)["'\'']$/\1/')
            case "$key" in
                ODOO_URL) ODOO_URL="$value" ;;
                ODOO_DATABASE) ODOO_DATABASE="$value" ;;
                ODOO_USERNAME) ODOO_USERNAME="$value" ;;
                ODOO_PASSWORD) ODOO_PASSWORD="$value" ;;
                ODOO_TRANSPORT) ODOO_TRANSPORT="$value" ;;
            esac
        done < .env.local
        log_success "Configuration loaded from .env.local"
    else
        log_warning ".env.local not found, using default values"
    fi
    
    # Show configuration (ohne Passwort)
    log_info "Configuration to be used:"
    echo "   🌐 Odoo URL: $ODOO_URL"
    echo "   🗄️  Database: $ODOO_DATABASE"
    echo "   👤 Username: $ODOO_USERNAME"
    echo "   🔐 Password: $(echo $ODOO_PASSWORD | sed 's/./*/g')"
    echo "   🚀 Transport: $ODOO_TRANSPORT"
    echo "   📁 Project Path: $PROJECT_PATH"
    
    # Create Claude Desktop config
    CONFIG_FILE="$CLAUDE_CONFIG_DIR/claude_desktop_config.json"
    BRIDGE_PATH="$PROJECT_PATH/mcp-http-bridge.sh"
    
    log_info "Creating Claude Desktop configuration for HTTP MCP..."
    
    cat > "$CONFIG_FILE" << EOF
{
  "mcpServers": {
    "odoo-mcp-http-server": {
      "command": "bash",
      "args": [
        "$BRIDGE_PATH"
      ],
      "env": {
        "ODOO_URL": "$ODOO_URL",
        "ODOO_DATABASE": "$ODOO_DATABASE",
        "ODOO_USERNAME": "$ODOO_USERNAME",
        "ODOO_PASSWORD": "$ODOO_PASSWORD",
        "ODOO_TRANSPORT": "$ODOO_TRANSPORT",
        "MCP_HTTP_PORT": "3001"
      }
    }
  }
}
EOF
    
    log_success "Claude Desktop configuration created: $CONFIG_FILE"
    
    # Test the HTTP MCP Bridge
    log_info "Testing HTTP MCP Bridge functionality..."
    
    if echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | "$BRIDGE_PATH" 2>/dev/null | grep -q "odoo_connect"; then
        log_success "HTTP MCP Bridge test successful!"
    else
        log_error "HTTP MCP Bridge test failed!"
        exit 1
    fi
    
    log_header "Setup Complete"
    
    cat << EOF
${GREEN}✅ Odoo MCP Server successfully configured for Claude Desktop!${NC}

${CYAN}📋 Next Steps:${NC}

1. ${YELLOW}Restart Claude Desktop app${NC}
2. ${YELLOW}Start a new conversation${NC}
3. ${YELLOW}The Odoo MCP tools should now be available${NC}

${CYAN}🛠️ Available Tools:${NC}
- odoo_connect         - Connect to Odoo instance
- odoo_search_read     - Search and read records
- odoo_create          - Create new records
- odoo_update          - Update existing records
- odoo_delete          - Delete records
- odoo_call_method     - Call custom methods
- odoo_get_model_fields - Get model field definitions
- odoo_search          - Search for record IDs
- odoo_read            - Read records by ID
- odoo_version         - Get Odoo version
- odoo_list_databases  - List available databases
- echo                 - Test tool

${CYAN}🔧 Troubleshooting:${NC}
- If tools don't appear, check Claude Desktop logs
- Verify Odoo server is running and accessible  
- Test HTTP Bridge with: echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | "$BRIDGE_PATH"
- Check HTTP Server: curl http://localhost:3001/tools

${CYAN}📁 Configuration files:${NC}
- Claude Desktop: $CONFIG_FILE
- Project config: $PROJECT_PATH/.env.local

${CYAN}🌍 For HTTP access (alternative):${NC}
Run: ./start.sh
Then access: http://localhost:3001/docs
EOF
}

# Run setup
setup_claude_desktop