#!/usr/bin/env node

/**
 * Lokales Entwicklungs-Hilfsskript
 * Lädt Konfiguration aus lokalen Dateien und startet den MCP Server
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Funktion zum Laden der .env.local Datei
function loadEnvLocal() {
  const envPath = path.join(__dirname, '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envLines = envContent.split('\n');
    
    for (const line of envLines) {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        const value = valueParts.join('=');
        if (key && value) {
          process.env[key.trim()] = value.trim();
        }
      }
    }
    console.log('✅ Loaded configuration from .env.local');
  }
}

// Funktion zum Laden der JSON-Konfiguration
function loadJsonConfig() {
  const configPath = path.join(__dirname, 'config.local.json');
  if (fs.existsSync(configPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      
      // Setze Umgebungsvariablen aus der JSON-Konfiguration
      if (config.odoo) {
        process.env.ODOO_URL = config.odoo.url;
        process.env.ODOO_DATABASE = config.odoo.database;
        process.env.ODOO_USERNAME = config.odoo.username;
        process.env.ODOO_PASSWORD = config.odoo.password;
        process.env.ODOO_TRANSPORT = config.odoo.transport;
      }
      
      if (config.mcp) {
        process.env.MCP_HTTP_PORT = config.mcp.httpPort?.toString();
        process.env.MCP_LOG_LEVEL = config.mcp.logLevel;
      }
      
      console.log('✅ Loaded configuration from config.local.json');
      return config;
    } catch (error) {
      console.error('❌ Error loading config.local.json:', error.message);
    }
  }
  return null;
}

// Hauptfunktion
function main() {
  console.log('🚀 Starting Odoo MCP Server with local configuration...\n');
  
  // Lade Konfigurationsdateien
  loadEnvLocal();
  const jsonConfig = loadJsonConfig();
  
  // Zeige geladene Konfiguration an
  console.log('📋 Current Configuration:');
  console.log(`   Odoo URL: ${process.env.ODOO_URL || 'not set'}`);
  console.log(`   Database: ${process.env.ODOO_DATABASE || 'not set'}`);
  console.log(`   Username: ${process.env.ODOO_USERNAME || 'not set'}`);
  console.log(`   Transport: ${process.env.ODOO_TRANSPORT || 'jsonrpc'}`);
  console.log(`   HTTP Port: ${process.env.MCP_HTTP_PORT || '3001'}`);
  
  // Zeige verfügbare Konfigurationsbeispiele
  if (jsonConfig?.examples) {
    console.log('\n📚 Available example configurations:');
    Object.keys(jsonConfig.examples).forEach(key => {
      console.log(`   - ${key}: ${jsonConfig.examples[key].url}`);
    });
  }
  
  // HTTP-only Mode
  const args = process.argv.slice(2);
  
  console.log(`\n🚀 Starting HTTP MCP Server...\n`);
  
  // Use HTTP MCP Server only
  const serverScript = 'dist/http-mcp-server.js';
  const serverArgs = args.filter(arg => !arg.startsWith('--stdio') && !arg.startsWith('-s'));
  
  const serverProcess = spawn('node', [serverScript, ...serverArgs], {
    stdio: 'inherit',
    env: process.env
  });
  
  serverProcess.on('close', (code) => {
    console.log(`\n📦 MCP Server exited with code ${code}`);
  });
  
  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down...');
    serverProcess.kill();
    process.exit(0);
  });
}

main();