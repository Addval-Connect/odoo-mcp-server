#!/bin/bash

# MCP Server Monitor & Auto-Restart
# Überwacht den MCP Server und startet ihn bei Crashes automatisch neu

MCP_PORT=3001
LOG_FILE="mcp-server-monitor.log"
MAX_RESTARTS=5
RESTART_COUNT=0

log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

check_server() {
    curl -s -m 5 "http://localhost:$MCP_PORT/health" > /dev/null 2>&1
    return $?
}

start_server() {
    log_message "🚀 Starting MCP Server..."
    node dist/bin/odoo-mcp-server.js 2>&1 | tee -a mcp-server-live.log &
    SERVER_PID=$!
    sleep 3
    
    if check_server; then
        log_message "✅ MCP Server started successfully (PID: $SERVER_PID)"
        RESTART_COUNT=0
        return 0
    else
        log_message "❌ MCP Server failed to start"
        return 1
    fi
}

stop_server() {
    log_message "🛑 Stopping MCP Server..."
    pkill -f "node.*odoo-mcp-server" 2>/dev/null || true
    lsof -ti:$MCP_PORT | xargs kill -9 2>/dev/null || true
    sleep 2
}

monitor_loop() {
    log_message "👁️  Starting MCP Server Monitor"
    
    while true; do
        if ! check_server; then
            log_message "⚠️  MCP Server not responding"
            
            if [ $RESTART_COUNT -ge $MAX_RESTARTS ]; then
                log_message "💀 Max restarts ($MAX_RESTARTS) reached. Stopping monitor."
                break
            fi
            
            RESTART_COUNT=$((RESTART_COUNT + 1))
            log_message "🔄 Restart attempt $RESTART_COUNT/$MAX_RESTARTS"
            
            stop_server
            start_server
        else
            echo -n "."  # Server is healthy
        fi
        
        sleep 10
    done
}

# Cleanup on exit
trap 'log_message "🛑 Monitor stopped"; stop_server; exit' INT TERM

# Start monitoring
start_server
monitor_loop