// src/__tests__/http-mcp-server.test.ts
import { HttpMcpServer } from '../http-mcp-server.js';

describe('HttpMcpServer.extractOdooHeaders', () => {
  let server: any;

  beforeEach(() => {
    server = new HttpMcpServer(0); // port 0 = don't listen
  });

  it('returns credentials when all four headers are present', () => {
    const headers = {
      'x-odoo-url': 'https://mi.odoo.com',
      'x-odoo-db': 'mydb',
      'x-odoo-username': 'admin',
      'x-odoo-password': 'secret',
    };
    const result = server.extractOdooHeaders(headers);
    expect(result).toEqual({
      url: 'https://mi.odoo.com',
      database: 'mydb',
      username: 'admin',
      password: 'secret',
      transport: 'jsonrpc',
    });
  });

  it('returns custom transport when X-Odoo-Transport is provided', () => {
    const headers = {
      'x-odoo-url': 'https://mi.odoo.com',
      'x-odoo-db': 'mydb',
      'x-odoo-username': 'admin',
      'x-odoo-password': 'secret',
      'x-odoo-transport': 'xmlrpc',
    };
    const result = server.extractOdooHeaders(headers);
    expect(result?.transport).toBe('xmlrpc');
  });

  it('returns null when any required header is missing', () => {
    expect(server.extractOdooHeaders({ 'x-odoo-url': 'https://mi.odoo.com' })).toBeNull();
    expect(server.extractOdooHeaders({})).toBeNull();
    expect(server.extractOdooHeaders({
      'x-odoo-url': 'https://mi.odoo.com',
      'x-odoo-db': 'mydb',
      // missing username and password
    })).toBeNull();
  });

  it('handles array header values (Express may provide them)', () => {
    const headers = {
      'x-odoo-url': ['https://mi.odoo.com'],
      'x-odoo-db': ['mydb'],
      'x-odoo-username': ['admin'],
      'x-odoo-password': ['secret'],
    };
    const result = server.extractOdooHeaders(headers);
    expect(result?.url).toBe('https://mi.odoo.com');
    expect(result?.database).toBe('mydb');
  });
});
