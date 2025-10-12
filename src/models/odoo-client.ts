/**
 * Odoo API Client
 * Supports XML-RPC, JSON-RPC, and HTTP communication with Odoo
 */

import axios, { AxiosInstance } from 'axios';
import * as xmlrpc from 'xmlrpc';
import {
  OdooConfig,
  OdooAuthResult,
  OdooRecord,
  OdooSearchParams,
  OdooCreateParams,
  OdooUpdateParams,
  OdooDeleteParams,
  OdooCallParams,
  OdooTransport
} from '../types/index.js';

export class OdooApiClient {
  private config: OdooConfig;
  private uid: number | null = null;
  private sessionId: string | null = null;
  private transport: OdooTransport;
  private httpClient: AxiosInstance;
  private xmlrpcClient: any;

  constructor(config: OdooConfig, transport: OdooTransport = 'jsonrpc') {
    this.config = config;
    this.transport = transport;
    
    // HTTP client setup
    this.httpClient = axios.create({
      baseURL: config.url,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // XML-RPC client setup
    if (transport === 'xmlrpc') {
      const url = new URL(config.url);
      this.xmlrpcClient = xmlrpc.createClient({
        host: url.hostname,
        port: url.port ? parseInt(url.port) : (url.protocol === 'https:' ? 443 : 80),
        path: '/xmlrpc/2/common',
      });
    }
  }

  /**
   * Authenticate with Odoo server
   */
  async authenticate(): Promise<OdooAuthResult> {
    try {
      switch (this.transport) {
        case 'xmlrpc':
          return await this.authenticateXmlRpc();
        case 'jsonrpc':
          return await this.authenticateJsonRpc();
        case 'http':
          return await this.authenticateHttp();
        default:
          throw new Error(`Unsupported transport: ${this.transport}`);
      }
    } catch (error) {
      throw new Error(`Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async authenticateXmlRpc(): Promise<OdooAuthResult> {
    return new Promise((resolve, reject) => {
      this.xmlrpcClient.methodCall('authenticate', [
        this.config.database,
        this.config.username,
        this.config.password,
        {}
      ], (error: any, value: any) => {
        if (error) {
          reject(error);
        } else {
          this.uid = value;
          resolve({ uid: value });
        }
      });
    });
  }

  private async authenticateJsonRpc(): Promise<OdooAuthResult> {
    const response = await this.httpClient.post('/web/session/authenticate', {
      jsonrpc: '2.0',
      method: 'call',
      params: {
        db: this.config.database,
        login: this.config.username,
        password: this.config.password,
      },
      id: Math.floor(Math.random() * 1000000),
    });

    if (response.data.error) {
      throw new Error(response.data.error.message);
    }

    const result = response.data.result;
    this.uid = result.uid;
    this.sessionId = result.session_id;
    
    // Set session cookie
    if (response.headers['set-cookie']) {
      this.httpClient.defaults.headers['Cookie'] = response.headers['set-cookie'].join('; ');
    }

    return { uid: result.uid, session_id: result.session_id };
  }

  private async authenticateHttp(): Promise<OdooAuthResult> {
    const response = await this.httpClient.post('/web/session/authenticate', {
      db: this.config.database,
      login: this.config.username,
      password: this.config.password,
    });

    if (!response.data.uid) {
      throw new Error('Authentication failed');
    }

    this.uid = response.data.uid;
    this.sessionId = response.data.session_id;

    return { uid: response.data.uid, session_id: response.data.session_id };
  }

  /**
   * Search and read records
   */
  async searchRead(model: string, params: OdooSearchParams = {}): Promise<OdooRecord[]> {
    await this.ensureAuthenticated();

    const searchParams = {
      domain: params.domain || [],
      fields: params.fields || [],
      offset: params.offset || 0,
      limit: params.limit || 100,
      order: params.order || 'id',
      context: params.context || {},
    };

    switch (this.transport) {
      case 'xmlrpc':
        return await this.callXmlRpc('object', 'execute_kw', [
          this.config.database,
          this.uid,
          this.config.password,
          model,
          'search_read',
          [searchParams.domain],
          {
            fields: searchParams.fields,
            offset: searchParams.offset,
            limit: searchParams.limit,
            order: searchParams.order,
            context: searchParams.context,
          },
        ]);

      case 'jsonrpc':
      case 'http':
        return await this.callJsonRpc({
          model,
          method: 'search_read',
          args: [searchParams.domain],
          kwargs: {
            fields: searchParams.fields,
            offset: searchParams.offset,
            limit: searchParams.limit,
            order: searchParams.order,
            context: searchParams.context,
          },
        });

      default:
        throw new Error(`Unsupported transport: ${this.transport}`);
    }
  }

  /**
   * Create new record
   */
  async create(params: OdooCreateParams): Promise<number> {
    await this.ensureAuthenticated();

    switch (this.transport) {
      case 'xmlrpc':
        return await this.callXmlRpc('object', 'execute_kw', [
          this.config.database,
          this.uid,
          this.config.password,
          params.model,
          'create',
          [params.values],
          { context: params.context || {} },
        ]);

      case 'jsonrpc':
      case 'http':
        return await this.callJsonRpc({
          model: params.model,
          method: 'create',
          args: [params.values],
          kwargs: { context: params.context || {} },
        });

      default:
        throw new Error(`Unsupported transport: ${this.transport}`);
    }
  }

  /**
   * Update existing records
   */
  async update(params: OdooUpdateParams): Promise<boolean> {
    await this.ensureAuthenticated();

    switch (this.transport) {
      case 'xmlrpc':
        return await this.callXmlRpc('object', 'execute_kw', [
          this.config.database,
          this.uid,
          this.config.password,
          params.model,
          'write',
          [params.ids, params.values],
          { context: params.context || {} },
        ]);

      case 'jsonrpc':
      case 'http':
        return await this.callJsonRpc({
          model: params.model,
          method: 'write',
          args: [params.ids, params.values],
          kwargs: { context: params.context || {} },
        });

      default:
        throw new Error(`Unsupported transport: ${this.transport}`);
    }
  }

  /**
   * Delete records
   */
  async delete(params: OdooDeleteParams): Promise<boolean> {
    await this.ensureAuthenticated();

    switch (this.transport) {
      case 'xmlrpc':
        return await this.callXmlRpc('object', 'execute_kw', [
          this.config.database,
          this.uid,
          this.config.password,
          params.model,
          'unlink',
          [params.ids],
          { context: params.context || {} },
        ]);

      case 'jsonrpc':
      case 'http':
        return await this.callJsonRpc({
          model: params.model,
          method: 'unlink',
          args: [params.ids],
          kwargs: { context: params.context || {} },
        });

      default:
        throw new Error(`Unsupported transport: ${this.transport}`);
    }
  }

  /**
   * Call arbitrary model method
   */
  async call(params: OdooCallParams): Promise<any> {
    await this.ensureAuthenticated();

    switch (this.transport) {
      case 'xmlrpc':
        return await this.callXmlRpc('object', 'execute_kw', [
          this.config.database,
          this.uid,
          this.config.password,
          params.model,
          params.method,
          params.args || [],
          { ...params.kwargs, context: params.context || {} },
        ]);

      case 'jsonrpc':
      case 'http':
        return await this.callJsonRpc({
          model: params.model,
          method: params.method,
          args: params.args || [],
          kwargs: { ...params.kwargs, context: params.context || {} },
        });

      default:
        throw new Error(`Unsupported transport: ${this.transport}`);
    }
  }

  /**
   * Get model fields
   */
  async getModelFields(model: string): Promise<Record<string, any>> {
    await this.ensureAuthenticated();

    return await this.call({
      model,
      method: 'fields_get',
      args: [],
      kwargs: {},
    });
  }

  /**
   * Search for record IDs only
   */
  async search(model: string, domain: any[] = [], limit?: number, offset?: number): Promise<number[]> {
    await this.ensureAuthenticated();

    const searchArgs = [domain];
    const kwargs: any = {};
    
    if (limit !== undefined) kwargs.limit = limit;
    if (offset !== undefined) kwargs.offset = offset;

    return await this.call({
      model,
      method: 'search',
      args: searchArgs,
      kwargs,
    });
  }

  /**
   * Read specific records by IDs
   */
  async read(model: string, ids: number[], fields?: string[]): Promise<OdooRecord[]> {
    await this.ensureAuthenticated();

    const readArgs = [ids];
    const kwargs: any = {};
    
    if (fields && fields.length > 0) {
      kwargs.fields = fields;
    }

    return await this.call({
      model,
      method: 'read',
      args: readArgs,
      kwargs,
    });
  }

  private async ensureAuthenticated(): Promise<void> {
    if (!this.uid) {
      await this.authenticate();
    }
  }

  private async callXmlRpc(service: string, method: string, args: any[]): Promise<any> {
    return new Promise((resolve, reject) => {
      const client = xmlrpc.createClient({
        host: new URL(this.config.url).hostname,
        port: new URL(this.config.url).port ? parseInt(new URL(this.config.url).port) : 8069,
        path: `/xmlrpc/2/${service}`,
      });

      client.methodCall(method, args, (error: any, value: any) => {
        if (error) {
          reject(error);
        } else {
          resolve(value);
        }
      });
    });
  }

  private async callJsonRpc(params: OdooCallParams): Promise<any> {
    const response = await this.httpClient.post('/web/dataset/call_kw', {
      jsonrpc: '2.0',
      method: 'call',
      params: {
        model: params.model,
        method: params.method,
        args: params.args || [],
        kwargs: params.kwargs || {},
        context: params.context || {},
      },
      id: Math.floor(Math.random() * 1000000),
    });

    if (response.data.error) {
      throw new Error(response.data.error.message);
    }

    return response.data.result;
  }

  /**
   * Get server version info
   */
  async version(): Promise<any> {
    const response = await this.httpClient.post('/web/webclient/version_info', {
      jsonrpc: '2.0',
      method: 'call',
      params: {},
      id: Math.floor(Math.random() * 1000000),
    });

    return response.data.result;
  }

  /**
   * List available databases
   */
  async listDatabases(): Promise<string[]> {
    const response = await this.httpClient.post('/web/database/list', {
      jsonrpc: '2.0',
      method: 'call',
      params: {},
      id: Math.floor(Math.random() * 1000000),
    });

    return response.data.result;
  }
}