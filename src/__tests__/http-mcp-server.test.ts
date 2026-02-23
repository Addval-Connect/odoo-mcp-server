import { jest } from '@jest/globals';
import { HttpMcpServer, extractOdooHeaders } from '../http-mcp-server.js';
import { McpServerController } from '../controllers/index.js';

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

describe('Session creation with X-Odoo-* headers', () => {
  let server: any;

  beforeEach(() => {
    server = new HttpMcpServer(0);
    jest.spyOn(McpServerController.prototype, 'handleToolCall').mockResolvedValue({
      content: [{ type: 'text', text: 'connected' }],
    });
  });

  afterEach(() => jest.restoreAllMocks());

  it('stores a session controller when Odoo headers are present on initialize', async () => {
    const sessionId = 'test-session-123';
    await server.createSessionWithHeaders(sessionId, {
      'x-odoo-url': 'https://mi.odoo.com',
      'x-odoo-db': 'mydb',
      'x-odoo-username': 'admin',
      'x-odoo-password': 'secret',
    });

    const session = server.sessions.get(sessionId);
    expect(session).toBeDefined();
    expect(session.controller).toBeInstanceOf(McpServerController);
    expect(McpServerController.prototype.handleToolCall).toHaveBeenCalledWith(
      'odoo_connect',
      expect.objectContaining({ url: 'https://mi.odoo.com', database: 'mydb' })
    );
  });

  it('stores a session WITHOUT controller when no Odoo headers are present', async () => {
    const sessionId = 'test-session-456';
    await server.createSessionWithHeaders(sessionId, {});

    const session = server.sessions.get(sessionId);
    expect(session).toBeDefined();
    expect(session.controller).toBeUndefined();
  });

  it('creates session even if odoo_connect throws', async () => {
    jest.spyOn(McpServerController.prototype, 'handleToolCall').mockRejectedValue(
      new Error('Odoo unreachable')
    );
    const sessionId = 'test-session-789';
    await server.createSessionWithHeaders(sessionId, {
      'x-odoo-url': 'https://bad.odoo.com',
      'x-odoo-db': 'mydb',
      'x-odoo-username': 'admin',
      'x-odoo-password': 'wrong',
    });

    const session = server.sessions.get(sessionId);
    expect(session).toBeDefined();
  });
});
