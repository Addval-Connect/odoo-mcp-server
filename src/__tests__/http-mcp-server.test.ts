import { HttpMcpServer, extractOdooHeaders } from '../http-mcp-server.js';

describe('extractOdooHeaders', () => {
  it('returns credentials when all four headers are present', () => {
    const headers = {
      'x-odoo-url': 'https://mi.odoo.com',
      'x-odoo-db': 'mydb',
      'x-odoo-username': 'admin',
      'x-odoo-password': 'secret',
    };
    const result = extractOdooHeaders(headers);
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
    const result = extractOdooHeaders(headers);
    expect(result?.transport).toBe('xmlrpc');
  });

  it('returns null when any required header is missing', () => {
    expect(extractOdooHeaders({ 'x-odoo-url': 'https://mi.odoo.com' })).toBeNull();
    expect(extractOdooHeaders({})).toBeNull();
    expect(extractOdooHeaders({
      'x-odoo-url': 'https://mi.odoo.com',
      'x-odoo-db': 'mydb',
    })).toBeNull();
  });

  it('handles array header values (Express may provide them)', () => {
    const headers = {
      'x-odoo-url': ['https://mi.odoo.com'],
      'x-odoo-db': ['mydb'],
      'x-odoo-username': ['admin'],
      'x-odoo-password': ['secret'],
    };
    const result = extractOdooHeaders(headers);
    expect(result?.url).toBe('https://mi.odoo.com');
    expect(result?.database).toBe('mydb');
  });

  it('returns null when a required array header value is empty', () => {
    const headers = {
      'x-odoo-url': [],
      'x-odoo-db': 'mydb',
      'x-odoo-username': 'admin',
      'x-odoo-password': 'secret',
    };
    expect(extractOdooHeaders(headers)).toBeNull();
  });
});
