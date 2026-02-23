# Per-Session Odoo Auth via HTTP Headers — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow MCP clients to pass Odoo credentials as HTTP headers (`X-Odoo-URL`, `X-Odoo-DB`, `X-Odoo-Username`, `X-Odoo-Password`) so each session gets its own isolated Odoo connection automatically.

**Architecture:** On `initialize`, the server reads X-Odoo-* headers from the request, creates a dedicated `McpServerController` for that session, and auto-connects to Odoo. Subsequent tool calls route through the session's own controller. Existing ENV-var auto-login remains as fallback.

**Tech Stack:** TypeScript, Express, Jest + ts-jest (ESM), existing `McpServerController` / `OdooTools` classes.

---

## Task 1: Unit-test and implement `extractOdooHeaders`

**Files:**
- Create: `src/__tests__/http-mcp-server.test.ts`
- Modify: `src/http-mcp-server.ts`

### Step 1: Create the test file

```typescript
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
```

### Step 2: Run test — verify it fails

```bash
npm test -- --testPathPattern=http-mcp-server
```

Expected: FAIL — `server.extractOdooHeaders is not a function`

### Step 3: Implement `extractOdooHeaders` in `src/http-mcp-server.ts`

Add this private method to the `HttpMcpServer` class, after `generateSessionId()`:

```typescript
private extractOdooHeaders(headers: Record<string, string | string[] | undefined>): {
  url: string; database: string; username: string; password: string; transport: string;
} | null {
  const pick = (v: string | string[] | undefined): string | undefined =>
    Array.isArray(v) ? v[0] : v;

  const url      = pick(headers['x-odoo-url']);
  const database = pick(headers['x-odoo-db']);
  const username = pick(headers['x-odoo-username']);
  const password = pick(headers['x-odoo-password']);
  const transport = pick(headers['x-odoo-transport']) ?? 'jsonrpc';

  if (!url || !database || !username || !password) return null;

  return { url, database, username, password, transport };
}
```

### Step 4: Run test — verify it passes

```bash
npm test -- --testPathPattern=http-mcp-server
```

Expected: PASS (all 4 tests green)

### Step 5: Build

```bash
npm run build
```

Expected: no TypeScript errors

### Step 6: Commit

```bash
git add src/__tests__/http-mcp-server.test.ts src/http-mcp-server.ts
git commit -m "feat: add extractOdooHeaders helper with unit tests"
```

---

## Task 2: Per-session controller on initialize

**Files:**
- Modify: `src/http-mcp-server.ts` (session type + initialize handler)
- Modify: `src/__tests__/http-mcp-server.test.ts` (new test suite)

### Step 1: Add the new test suite to the test file

Append this `describe` block to `src/__tests__/http-mcp-server.test.ts`:

```typescript
import { McpServerController } from '../controllers/index.js';

describe('Session creation with X-Odoo-* headers', () => {
  let server: any;

  beforeEach(() => {
    server = new HttpMcpServer(0);
    // Stub McpServerController so no real Odoo call is made
    jest.spyOn(McpServerController.prototype, 'handleToolCall').mockResolvedValue({
      content: [{ type: 'text', text: 'connected' }],
    });
  });

  afterEach(() => jest.restoreAllMocks());

  it('stores a session controller when Odoo headers are present on initialize', async () => {
    const sessionId = 'test-session-123';
    // Directly call the internal initialize logic
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

    // Session still created, controller present (connect failed but session lives)
    const session = server.sessions.get(sessionId);
    expect(session).toBeDefined();
  });
});
```

### Step 2: Run test — verify it fails

```bash
npm test -- --testPathPattern=http-mcp-server
```

Expected: FAIL — `server.createSessionWithHeaders is not a function`

### Step 3: Update session type and add `createSessionWithHeaders`

In `src/http-mcp-server.ts`:

**3a. Update the `sessions` field type** (around line 19):

```typescript
// BEFORE:
private sessions: Map<string, { state: any; createdAt: Date }>;

// AFTER:
private sessions: Map<string, { state: any; createdAt: Date; controller?: McpServerController }>;
```

**3b. Add the `createSessionWithHeaders` method** after `extractOdooHeaders`:

```typescript
private async createSessionWithHeaders(
  sessionId: string,
  headers: Record<string, string | string[] | undefined>
): Promise<void> {
  let sessionController: McpServerController | undefined;

  const creds = this.extractOdooHeaders(headers);
  if (creds) {
    sessionController = new McpServerController();
    try {
      await sessionController.handleToolCall('odoo_connect', creds);
      console.error(`[MCP] Session ${sessionId}: auto-connected to Odoo via headers`);
    } catch (error) {
      console.error(
        `[MCP] Session ${sessionId}: header auto-connect failed:`,
        error instanceof Error ? error.message : error
      );
      // Session still created — individual tool calls will report the error
    }
  }

  this.sessions.set(sessionId, { state: {}, createdAt: new Date(), controller: sessionController });
}
```

**3c. Update the `initialize` branch in `setupMcpRoutes`** (around line 264–278).

Replace:
```typescript
if (isInitialize) {
  const sessionId = this.generateSessionId();
  this.sessions.set(sessionId, { state: {}, createdAt: new Date() });

  console.error(`[MCP] Initialize: Created session ${sessionId}`);

  res.setHeader('Mcp-Session-Id', sessionId);
  res.setHeader('MCP-Protocol-Version', protocolVersion);
  res.setHeader('Content-Type', 'application/json');

  const request = { ...req.body, headers: req.headers };
  const response = await this.processJsonRpcRequest(request);

  return res.status(200).json(response);
}
```

With:
```typescript
if (isInitialize) {
  const sessionId = this.generateSessionId();
  await this.createSessionWithHeaders(sessionId, req.headers as Record<string, string | string[] | undefined>);

  console.error(`[MCP] Initialize: Created session ${sessionId}`);

  res.setHeader('Mcp-Session-Id', sessionId);
  res.setHeader('MCP-Protocol-Version', protocolVersion);
  res.setHeader('Content-Type', 'application/json');

  const request = { ...req.body, headers: req.headers };
  const response = await this.processJsonRpcRequest(request);

  return res.status(200).json(response);
}
```

### Step 4: Run test — verify it passes

```bash
npm test -- --testPathPattern=http-mcp-server
```

Expected: PASS (all 7 tests green)

### Step 5: Build

```bash
npm run build
```

Expected: no TypeScript errors

### Step 6: Commit

```bash
git add src/__tests__/http-mcp-server.test.ts src/http-mcp-server.ts
git commit -m "feat: create per-session McpServerController from X-Odoo-* headers"
```

---

## Task 3: Route tool calls through the session controller

**Files:**
- Modify: `src/http-mcp-server.ts` (`processJsonRpcRequest` + POST /mcp route)
- Modify: `src/__tests__/http-mcp-server.test.ts` (new test suite)

### Step 1: Add routing test suite to the test file

Append to `src/__tests__/http-mcp-server.test.ts`:

```typescript
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
});
```

### Step 2: Run test — verify it fails

```bash
npm test -- --testPathPattern=http-mcp-server
```

Expected: FAIL — `processJsonRpcRequest` ignores `sessionController` parameter

### Step 3: Update `processJsonRpcRequest` signature and internals

**3a. Update the method signature** (line ~581):

```typescript
// BEFORE:
private async processJsonRpcRequest(request: any): Promise<any> {

// AFTER:
private async processJsonRpcRequest(request: any, sessionController?: McpServerController): Promise<any> {
```

**3b. Add controller resolution at the top of the method** (after opening brace, before `const { method, params, id } = request;`):

```typescript
const controller = sessionController ?? this.controller;
```

**3c. In the `tools/list` case**, replace `this.controller.getAvailableTools()` with `controller.getAvailableTools()`.

**3d. In the `tools/call` case**, replace `this.controller.handleToolCall(...)` with `controller.handleToolCall(...)`.

### Step 4: Pass session controller in the POST /mcp route

In `setupMcpRoutes`, in the main POST /mcp handler (after session validation, around line 305), find:

```typescript
const request = { ...req.body, headers: req.headers, sessionId };
const response = await this.processJsonRpcRequest(request);
```

Replace with:

```typescript
const session = sessionId ? this.sessions.get(sessionId) : undefined;
const request = { ...req.body, headers: req.headers, sessionId };
const response = await this.processJsonRpcRequest(request, session?.controller);
```

### Step 5: Run all tests — verify everything passes

```bash
npm test
```

Expected: PASS (all tests green)

### Step 6: Build

```bash
npm run build
```

Expected: no TypeScript errors

### Step 7: Commit

```bash
git add src/__tests__/http-mcp-server.test.ts src/http-mcp-server.ts
git commit -m "feat: route tool calls through per-session Odoo controller"
```

---

## Task 4: Manual smoke test

### Step 1: Build and start the server

```bash
npm run build && MCP_HTTP_PORT=3001 node dist/http-mcp-server.js
```

### Step 2: Test initialize with headers

```bash
curl -s -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -H "X-Odoo-URL: https://demo.odoo.com" \
  -H "X-Odoo-DB: demo" \
  -H "X-Odoo-Username: admin" \
  -H "X-Odoo-Password: admin" \
  -d '{"jsonrpc":"2.0","method":"initialize","params":{},"id":1}' | jq .
```

Expected: response with `result.protocolVersion` + `Mcp-Session-Id` header in response

### Step 3: Test initialize WITHOUT headers (fallback path)

```bash
curl -s -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"initialize","params":{},"id":1}' | jq .
```

Expected: same shape response, no Odoo connection attempted

### Step 4: Commit if any adjustments were made

```bash
git add -p
git commit -m "fix: smoke test adjustments"
```

---

## Summary of changes

| File | Change |
|---|---|
| `src/http-mcp-server.ts` | `sessions` type includes `controller?`; add `extractOdooHeaders()`; add `createSessionWithHeaders()`; `initialize` calls `createSessionWithHeaders`; `processJsonRpcRequest` accepts `sessionController?`; POST route passes `session?.controller` |
| `src/__tests__/http-mcp-server.test.ts` | New file: 3 describe blocks, 9 tests covering header extraction, session creation, and controller routing |
