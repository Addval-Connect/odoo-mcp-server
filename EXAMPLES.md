# Examples

## Basic Usage Examples

### 1. Starting the Server

```bash
# Install the package globally
npm install -g @your-org/odoo-mcp-server

# Start in MCP stdio mode (default)
odoo-mcp

# Start HTTP server mode
odoo-mcp --http

# Start on custom port
odoo-mcp --http --port 8080
```

### 2. Programmatic Usage

```typescript
import { OdooApiClient, ToolRegistry } from '@your-org/odoo-mcp-server';

// Direct API client usage
const client = new OdooApiClient({
  url: 'http://localhost:8069',
  database: 'my_database',
  username: 'admin',
  password: 'admin'
}, 'jsonrpc');

await client.authenticate();

// Search for companies
const companies = await client.searchRead('res.partner', {
  domain: [['is_company', '=', true]],
  fields: ['name', 'email', 'phone'],
  limit: 10
});

console.log('Companies:', companies);
```

### 3. MCP Tool Registry

```typescript
import { ToolRegistry } from '@your-org/odoo-mcp-server';

const registry = new ToolRegistry();

// List all available tools
const tools = registry.getTools();
console.log('Available tools:', tools.map(t => t.name));

// Execute a tool
const result = await registry.executeTool('odoo_connect', {
  url: 'http://localhost:8069',
  database: 'my_database',
  username: 'admin',
  password: 'admin'
});

console.log('Connection result:', result);
```

### 4. HTTP API Examples

#### Connect to Odoo
```bash
curl -X POST http://localhost:3000/tools/odoo_connect \
  -H "Content-Type: application/json" \
  -d '{
    "url": "http://localhost:8069",
    "database": "my_database",
    "username": "admin", 
    "password": "admin",
    "transport": "jsonrpc"
  }'
```

#### Search Products
```bash
curl -X POST http://localhost:3000/tools/odoo_search_read \
  -H "Content-Type: application/json" \
  -d '{
    "model": "product.product",
    "domain": [["sale_ok", "=", true]],
    "fields": ["name", "list_price", "qty_available"],
    "limit": 20,
    "order": "name ASC"
  }'
```

#### Create a New Customer
```bash
curl -X POST http://localhost:3000/tools/odoo_create \
  -H "Content-Type: application/json" \
  -d '{
    "model": "res.partner",
    "values": {
      "name": "New Customer Ltd.",
      "is_company": true,
      "email": "info@newcustomer.com",
      "phone": "+1-555-123-4567",
      "street": "123 Business Ave",
      "city": "Business City",
      "zip": "12345",
      "country_id": 233
    }
  }'
```

#### Update Customer Information
```bash
curl -X POST http://localhost:3000/tools/odoo_update \
  -H "Content-Type: application/json" \
  -d '{
    "model": "res.partner",
    "ids": [123],
    "values": {
      "phone": "+1-555-987-6543",
      "email": "updated@newcustomer.com"
    }
  }'
```

#### Get Model Fields
```bash
curl -X POST http://localhost:3000/tools/odoo_get_model_fields \
  -H "Content-Type: application/json" \
  -d '{
    "model": "sale.order"
  }'
```

### 5. Advanced Search Examples

#### Complex Domain Queries
```bash
# Search for customers with recent orders
curl -X POST http://localhost:3000/tools/odoo_search_read \
  -H "Content-Type: application/json" \
  -d '{
    "model": "res.partner",
    "domain": [
      ["is_company", "=", true],
      ["sale_order_ids", "!=", false],
      ["create_date", ">=", "2024-01-01"]
    ],
    "fields": ["name", "email", "sale_order_count"],
    "order": "sale_order_count DESC"
  }'
```

#### Search with Context
```bash
curl -X POST http://localhost:3000/tools/odoo_search_read \
  -H "Content-Type: application/json" \
  -d '{
    "model": "product.product",
    "domain": [],
    "fields": ["name", "qty_available", "virtual_available"],
    "context": {
      "warehouse": 1,
      "lang": "en_US"
    }
  }'
```

### 6. Custom Method Calls

```bash
# Call action_confirm on a sale order
curl -X POST http://localhost:3000/tools/odoo_call_method \
  -H "Content-Type: application/json" \
  -d '{
    "model": "sale.order",
    "method": "action_confirm",
    "args": [[123]],
    "context": {}
  }'
```

### 7. Environment Variables

Set default connection parameters:

```bash
export ODOO_URL=http://localhost:8069
export ODOO_DATABASE=production
export ODOO_USERNAME=api_user
export ODOO_PASSWORD=secure_password

# Now tools can use these defaults
odoo-mcp --http
```

### 8. Error Handling

All tools provide comprehensive error information:

```json
{
  "success": false,
  "error": "Authentication failed: Invalid credentials for database 'test_db'"
}
```

### 9. Integration with Other MCP Clients

The server works with any MCP-compatible client:

```bash
# Using with Claude Desktop or other MCP clients
echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | odoo-mcp
```