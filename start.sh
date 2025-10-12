#!/bin/bash

# =============================================================================
# HTTP MCP Server Setup & Start Script
# =============================================================================
# Dieses Script:
# - Installiert Abhängigkeiten falls nötig
# - Lädt lokale Konfiguration aus .env.local
# - Startet den HTTP MCP Server auf localhost
# =============================================================================

set -e  # Exit bei Fehlern

# Farben für Output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Helper functions
is_port_in_use() {
    local port=$1
    lsof -ti:$port >/dev/null 2>&1
}

# Logging Funktionen
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

# Cleanup function für graceful shutdown
cleanup() {
    log_warning "Shutting down services..."
    
    # Stop the MCP server
    if [ ! -z "$SERVER_PID" ]; then
        kill $SERVER_PID 2>/dev/null || true
        log_info "MCP Server stopped"
    fi
    
    exit 0
}

# Trap für cleanup bei CTRL+C
trap cleanup SIGINT SIGTERM

# =============================================================================
# Funktionen
# =============================================================================

check_command() {
    if command -v "$1" >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

install_nodejs() {
    log_header "Node.js Installation"
    
    if check_command "node"; then
        NODE_VERSION=$(node --version)
        log_success "Node.js already installed: $NODE_VERSION"
        
        # Check if version is >= 18
        MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')
        if [ "$MAJOR_VERSION" -lt 18 ]; then
            log_warning "Node.js version $NODE_VERSION is too old. Please update to >= 18.0.0"
            exit 1
        fi
    else
        log_info "Installing Node.js..."
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            if check_command "brew"; then
                brew install node
            else
                log_error "Please install Homebrew first or install Node.js manually"
                exit 1
            fi
        elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
            # Linux
            curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
            sudo apt-get install -y nodejs
        else
            log_error "Unsupported OS. Please install Node.js manually"
            exit 1
        fi
        log_success "Node.js installed successfully"
    fi
}

setup_project() {
    log_header "Project Setup"
    
    # Check if package.json exists
    if [ ! -f "package.json" ]; then
        log_error "package.json not found. Please run this script from the project root directory."
        exit 1
    fi
    
    # Install npm dependencies
    if [ ! -d "node_modules" ]; then
        log_info "Installing npm dependencies..."
        npm install
        log_success "Dependencies installed"
    else
        log_success "Dependencies already installed"
    fi
    
    # Build the project
    log_info "Building TypeScript project..."
    npm run build
    log_success "Project built successfully"
}

load_config() {
    log_header "Configuration Loading"
    
    # Default values
    export ODOO_URL="${ODOO_URL:-http://localhost:8069}"
    export ODOO_DATABASE="${ODOO_DATABASE:-odoo}"
    export ODOO_USERNAME="${ODOO_USERNAME:-admin}"
    export ODOO_PASSWORD="${ODOO_PASSWORD:-admin}"
    export ODOO_TRANSPORT="${ODOO_TRANSPORT:-jsonrpc}"
    export MCP_HTTP_PORT="${MCP_HTTP_PORT:-3001}"
    export MCP_LOG_LEVEL="${MCP_LOG_LEVEL:-info}"
    export MCP_MINIMAL_MODE="${MCP_MINIMAL_MODE:-false}"
    export MCP_SIMPLIFY_SCHEMA="${MCP_SIMPLIFY_SCHEMA:-false}"
    
    # Load .env.local if exists
    if [ -f ".env.local" ]; then
        log_info "Loading configuration from .env.local..."
        # Source .env.local (aber sicher)
        while IFS='=' read -r key value; do
            # Skip comments and empty lines
            [[ $key =~ ^[[:space:]]*# ]] && continue
            [[ -z "$key" ]] && continue
            # Remove quotes and export
            value=$(echo "$value" | sed 's/^["'\'']\(.*\)["'\'']$/\1/')
            export "$key"="$value"
        done < .env.local
        log_success "Configuration loaded from .env.local"
    else
        log_warning ".env.local not found, using default values"
    fi
    
    # Load config.local.json if exists
    if [ -f "config.local.json" ] && check_command "jq"; then
        log_info "Loading configuration from config.local.json..."
        
        # Extract values using jq if available
        ODOO_URL_JSON=$(jq -r '.odoo.url // empty' config.local.json 2>/dev/null)
        ODOO_DATABASE_JSON=$(jq -r '.odoo.database // empty' config.local.json 2>/dev/null)
        ODOO_USERNAME_JSON=$(jq -r '.odoo.username // empty' config.local.json 2>/dev/null)
        ODOO_PASSWORD_JSON=$(jq -r '.odoo.password // empty' config.local.json 2>/dev/null)
        ODOO_TRANSPORT_JSON=$(jq -r '.odoo.transport // empty' config.local.json 2>/dev/null)
        MCP_HTTP_PORT_JSON=$(jq -r '.mcp.httpPort // empty' config.local.json 2>/dev/null)
        
        # Override if values exist in JSON
        [ ! -z "$ODOO_URL_JSON" ] && export ODOO_URL="$ODOO_URL_JSON"
        [ ! -z "$ODOO_DATABASE_JSON" ] && export ODOO_DATABASE="$ODOO_DATABASE_JSON"
        [ ! -z "$ODOO_USERNAME_JSON" ] && export ODOO_USERNAME="$ODOO_USERNAME_JSON"
        [ ! -z "$ODOO_PASSWORD_JSON" ] && export ODOO_PASSWORD="$ODOO_PASSWORD_JSON"
        [ ! -z "$ODOO_TRANSPORT_JSON" ] && export ODOO_TRANSPORT="$ODOO_TRANSPORT_JSON"
        [ ! -z "$MCP_HTTP_PORT_JSON" ] && export MCP_HTTP_PORT="$MCP_HTTP_PORT_JSON"
        
        log_success "Configuration loaded from config.local.json"
    fi
    
    # Show loaded configuration (ohne Passwort)
    log_info "Current Configuration:"
    echo "   🌐 Odoo URL: $ODOO_URL"
    echo "   🗄️  Database: $ODOO_DATABASE"
    echo "   👤 Username: $ODOO_USERNAME"
    echo "   🔐 Password: $(echo $ODOO_PASSWORD | sed 's/./*/g')"
    echo "   🚀 Transport: $ODOO_TRANSPORT"
    echo "   🌍 HTTP Port: $MCP_HTTP_PORT"
    echo "   🔧 MCP Minimal Mode: $MCP_MINIMAL_MODE"
    echo "   🔧 MCP Simplify Schema: $MCP_SIMPLIFY_SCHEMA"
}

start_mcp_server() {
    log_header "Starting HTTP MCP Server"
    
    # Check if port is already in use
    if is_port_in_use $MCP_HTTP_PORT; then
        log_warning "Port $MCP_HTTP_PORT is already in use"
        log_info "Trying to kill existing process..."
        lsof -ti:$MCP_HTTP_PORT | xargs kill -9 2>/dev/null || true
        sleep 2
    fi
    
    log_info "Starting HTTP MCP Server on port $MCP_HTTP_PORT..."
    log_info "Minimal Mode: $MCP_MINIMAL_MODE | Simplify Schema: $MCP_SIMPLIFY_SCHEMA"
    
    # Check if start-local.mjs exists (dev mode) or use compiled version
    if [ -f "start-local.mjs" ]; then
        # Dev mode - use start-local.mjs
        env MCP_MODE=http MCP_MINIMAL_MODE="$MCP_MINIMAL_MODE" MCP_SIMPLIFY_SCHEMA="$MCP_SIMPLIFY_SCHEMA" MCP_HTTP_PORT="$MCP_HTTP_PORT" node start-local.mjs > mcp-server.log 2>&1 &
    else
        # Production mode - use compiled version
        env MCP_MINIMAL_MODE="$MCP_MINIMAL_MODE" MCP_SIMPLIFY_SCHEMA="$MCP_SIMPLIFY_SCHEMA" MCP_HTTP_PORT="$MCP_HTTP_PORT" node dist/http-mcp-server.js > mcp-server.log 2>&1 &
    fi
    
    SERVER_PID=$!
    log_success "HTTP MCP Server started (PID: $SERVER_PID)"
    log_info "Server logs: tail -f mcp-server.log"
    
    # Wait for server to be ready
    log_info "Waiting for HTTP server to be ready..."
    for i in {1..30}; do
        if curl -s http://localhost:$MCP_HTTP_PORT/health > /dev/null 2>&1; then
            log_success "HTTP MCP Server is ready and responding!"
            return 0
        fi
        sleep 1
        echo -n "."
    done
    
    log_error "HTTP MCP Server failed to start within 30 seconds"
    log_info "Check logs: tail -f mcp-server.log"
    exit 1
}

show_usage_examples() {
    log_header "HTTP MCP API Usage Examples"
    
    echo -e "${CYAN}🔗 Your HTTP MCP Server is accessible at:${NC}"
    echo -e "   http://localhost:$MCP_HTTP_PORT"
    echo ""
    
    echo -e "${CYAN}📚 HTTP MCP API Examples:${NC}"
    echo ""
    
    echo -e "${YELLOW}1. Initialize MCP session:${NC}"
    echo "curl -X POST http://localhost:$MCP_HTTP_PORT/mcp \\"
    echo "  -H \"Content-Type: application/json\" \\"
    echo "  -H \"MCP-Protocol-Version: 2024-11-05\" \\"
    echo "  -d '{\"jsonrpc\": \"2.0\", \"method\": \"initialize\", \"params\": {\"protocolVersion\": \"2024-11-05\", \"capabilities\": {}, \"clientInfo\": {\"name\": \"test\", \"version\": \"1.0.0\"}}, \"id\": 1}'"
    echo ""
    
    echo -e "${YELLOW}2. List all available MCP tools:${NC}"
    echo "curl -X POST http://localhost:$MCP_HTTP_PORT/mcp \\"
    echo "  -H \"Content-Type: application/json\" \\"
    echo "  -H \"Mcp-Session-Id: SESSION_ID\" \\"
    echo "  -H \"MCP-Protocol-Version: 2024-11-05\" \\"
    echo "  -d '{\"jsonrpc\": \"2.0\", \"method\": \"tools/list\", \"params\": {}, \"id\": 2}'"
    echo ""
    
    echo -e "${YELLOW}3. Check server health:${NC}"
    echo "curl http://localhost:$MCP_HTTP_PORT/health"
    echo ""
    
    echo -e "${YELLOW}4. Get server info:${NC}"
    echo "curl http://localhost:$MCP_HTTP_PORT/info"
    echo ""
    
    echo -e "${YELLOW}5. Connect to your Odoo instance:${NC}"
    echo "curl -X POST http://localhost:$MCP_HTTP_PORT/mcp \\"
    echo "  -H \"Content-Type: application/json\" \\"
    echo "  -H \"Mcp-Session-Id: SESSION_ID\" \\"
    echo "  -H \"MCP-Protocol-Version: 2024-11-05\" \\"
    echo "  -d '{\"jsonrpc\": \"2.0\", \"method\": \"tools/call\", \"params\": {\"name\": \"odoo_connect\", \"arguments\": {\"url\": \"$ODOO_URL\", \"database\": \"$ODOO_DATABASE\", \"username\": \"$ODOO_USERNAME\", \"password\": \"$ODOO_PASSWORD\", \"transport\": \"$ODOO_TRANSPORT\"}}, \"id\": 3}'"
    echo ""
    
    echo -e "${CYAN}📖 Complete API Documentation:${NC} http://localhost:$MCP_HTTP_PORT/docs"
    echo -e "${CYAN}🔧 Server Information:${NC} http://localhost:$MCP_HTTP_PORT/info"
}

monitor_services() {
    log_header "Service Monitoring"
    
    log_info "MCP Server is running on port $MCP_HTTP_PORT"
    log_info "Press Ctrl+C to stop the server"
    echo ""
    log_info "Server logs (last 20 lines):"
    echo ""
    tail -20 mcp-server.log
    echo ""
    log_info "Monitoring logs... (Ctrl+C to exit)"
    
    # Follow logs
    tail -f mcp-server.log
}

# =============================================================================
# Main Execution
# =============================================================================

main() {
    log_header "HTTP MCP Server Setup & Start"
    
    # Install dependencies
    install_nodejs
    
    # Setup project
    setup_project
    
    # Load configuration
    load_config
    
    # Start HTTP MCP Server
    start_mcp_server
    
    # Show usage examples
    show_usage_examples
    
    # Monitor services
    monitor_services
}

# Run main function
main
