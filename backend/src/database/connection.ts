import { Pool, PoolClient, PoolConfig } from 'pg';
import { logger } from '@/utils/logger';

interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  max: number;
  idleTimeoutMillis: number;
  connectionTimeoutMillis: number;
  ssl?: boolean | object;
}

class DatabaseConnection {
  private pool: Pool;
  private config: DatabaseConfig;

  constructor() {
    this.config = {
      host: process.env['DB_HOST'] || 'localhost',
      port: parseInt(process.env['DB_PORT'] || '5432'),
      database: process.env['DB_NAME'] || 'chat_app',
      user: process.env['DB_USER'] || 'postgres',
      password: process.env['DB_PASSWORD'] || 'abcd1234',
      max: parseInt(process.env['DB_MAX_CONNECTIONS'] || '10'),
      idleTimeoutMillis: parseInt(process.env['DB_IDLE_TIMEOUT'] || '30000'),
      connectionTimeoutMillis: parseInt(process.env['DB_CONNECTION_TIMEOUT'] || '2000'),
    };

    // Add SSL configuration for production
    if (process.env['NODE_ENV'] === 'production') {
      this.config.ssl = {
        rejectUnauthorized: false,
      };
    }

    this.pool = new Pool(this.config as PoolConfig);
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.pool.on('connect', () => {
      logger.info('New database client connected');
    });

    this.pool.on('acquire', () => {
      logger.debug('Database client acquired from pool');
    });

    this.pool.on('remove', () => {
      logger.debug('Database client removed from pool');
    });

    this.pool.on('error', (err: Error) => {
      logger.error('Database pool error:', err);
    });
  }

  public async connect(): Promise<void> {
    try {
      const client = await this.pool.connect();
      logger.info('Database connected successfully');
      client.release();
    } catch (error) {
      logger.error('Database connection failed:', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      await this.pool.end();
      logger.info('Database disconnected successfully');
    } catch (error) {
      logger.error('Database disconnection failed:', error);
      throw error;
    }
  }

  public getPool(): Pool {
    return this.pool;
  }

  public async query<T = any>(
    text: string,
    params?: any[]
  ): Promise<T[]> {
    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      logger.debug(`Query executed in ${duration}ms`, { text, params });
      return result.rows;
    } catch (error) {
      logger.error('Database query error:', { text, params, error });
      throw error;
    }
  }

  public async queryOne<T = any>(
    text: string,
    params?: any[]
  ): Promise<T | null> {
    const results = await this.query<T>(text, params);
    return results.length > 0 ? results[0]! : null;
  }

  public async transaction<T>(
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  public async healthCheck(): Promise<boolean> {
    try {
      const result = await this.query('SELECT 1 as status');
      return result.length > 0 && result[0].status === 1;
    } catch (error) {
      logger.error('Database health check failed:', error);
      return false;
    }
  }

  public getConnectionInfo(): {
    host: string;
    port: number;
    database: string;
    user: string;
    totalConnections: number;
    idleConnections: number;
    waitingConnections: number;
  } {
    return {
      host: this.config.host,
      port: this.config.port,
      database: this.config.database,
      user: this.config.user,
      totalConnections: this.pool.totalCount,
      idleConnections: this.pool.idleCount,
      waitingConnections: this.pool.waitingCount,
    };
  }
}

// Create singleton instance
const db = new DatabaseConnection();

export default db;
export { DatabaseConnection }; 