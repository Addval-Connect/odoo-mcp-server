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

describe('Tool calls use session controller', () => {
  let server: any;

  beforeEach(() => {
    server = new HttpMcpServer(0);
  });

  it('processJsonRpcRequest uses provided sessionController over global controller', async () => {
    const sessionController = new McpServerController();
    const sessionSpy = jest.spyOn(sessionController, 'handleToolCall').mockResolvedValue({
      content: [{ type: 'text', text: 'session result' }],
    });
    const globalSpy = jest.spyOn(server.controller, 'handleToolCall');

    const request = {
      jsonrpc: '2.0',
      method: 'tools/call',
      params: { name: 'echo', arguments: { message: 'hi' } },
      id: 1,
    };

    const response = await server.processJsonRpcRequest(request, sessionController);

    expect(sessionSpy).toHaveBeenCalledWith('echo', { message: 'hi' });
    expect(globalSpy).not.toHaveBeenCalled();
    expect(response.result).toBeDefined();

    jest.restoreAllMocks();
  });

  it('processJsonRpcRequest falls back to global controller when no session controller', async () => {
    const globalSpy = jest.spyOn(server.controller, 'handleToolCall').mockResolvedValue({
      content: [{ type: 'text', text: 'global result' }],
    });

    const request = {
      jsonrpc: '2.0',
      method: 'tools/call',
      params: { name: 'echo', arguments: { message: 'hi' } },
      id: 1,
    };

    await server.processJsonRpcRequest(request, undefined);

    expect(globalSpy).toHaveBeenCalled();
    jest.restoreAllMocks();
  });

  it('processJsonRpcRequest uses session controller getAvailableTools for tools/list', async () => {
    const sessionController = new McpServerController();
    const sessionSpy = jest.spyOn(sessionController, 'getAvailableTools').mockReturnValue([]);
    const globalSpy = jest.spyOn(server.controller, 'getAvailableTools');

    const request = {
      jsonrpc: '2.0',
      method: 'tools/list',
      params: {},
      id: 1,
    };

    const response = await server.processJsonRpcRequest(request, sessionController);

    expect(sessionSpy).toHaveBeenCalled();
    expect(globalSpy).not.toHaveBeenCalled();
    expect(response.result.tools).toBeDefined();

    jest.restoreAllMocks();
  });
});
