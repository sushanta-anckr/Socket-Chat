import express, { Application } from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';

import db from '@/database/connection';
import { logger, stream } from '@/utils/logger';
import { AuthTokenPayload } from '@/types';

// Load environment variables
import './utils/logger';
import { config } from 'dotenv';
config();

// Import types and interfaces
import { AuthenticatedSocket } from '@/types';

// Verify required environment variables
if (!process.env['JWT_SECRET']) {
  logger.error('JWT_SECRET environment variable is required');
  process.exit(1);
}

class ChatServer {
  private app: Application;
  private server: ReturnType<typeof createServer>;
  private io: SocketIOServer;
  private port: number;

  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.port = parseInt(process.env['PORT'] || '3000');
    
    // Initialize Socket.IO
    this.io = new SocketIOServer(this.server, {
      cors: {
        origin: process.env['CORS_ORIGIN'] || 'http://localhost:4200',
        methods: ['GET', 'POST'],
        credentials: true
      },
      path: process.env['SOCKET_IO_PATH'] || '/socket.io'
    });
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupSocketIO();
    this.setupErrorHandling();
    this.createLogsDirectory();
  }

  private createLogsDirectory(): void {
    const logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }));

    // CORS middleware
    this.app.use(cors({
      origin: process.env['CORS_ORIGIN'] || 'http://localhost:4200',
      credentials: process.env['CORS_CREDENTIALS'] === 'true'
    }));

    // Parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Logging middleware
    this.app.use(morgan('combined', { stream }));

    // Health check endpoint
    this.app.get('/health', (_req, res) => {
      res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        service: 'Chat Backend',
        version: process.env['APP_VERSION'] || '1.0.0'
      });
    });

    // Database health check
    this.app.get('/health/db', async (_req, res) => {
      try {
        const isHealthy = await db.healthCheck();
        if (isHealthy) {
          res.status(200).json({
            status: 'OK',
            database: 'Connected',
            timestamp: new Date().toISOString()
          });
        } else {
          res.status(503).json({
            status: 'ERROR',
            database: 'Disconnected',
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        res.status(503).json({
          status: 'ERROR',
          database: 'Error',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        });
      }
    });

    logger.info('Middleware setup completed');
  }

  private setupRoutes(): void {
    // API routes prefix
    const apiPrefix = '/api/v1';

    // Public routes
    this.app.get('/', (_req, res) => {
      res.json({
        message: 'Chat Backend API',
        version: process.env['APP_VERSION'] || '1.0.0',
        endpoints: {
          health: '/health',
          docs: '/docs',
          api: apiPrefix
        }
      });
    });

    // Import and setup routes
    const authRoutes = require('@/routes/auth').default;
    const userRoutes = require('@/routes/users').default;
    const chatRoutes = require('@/routes/chats').default;
    const messageRoutes = require('@/routes/messages').default;

    // Setup API routes
    this.app.use(`${apiPrefix}/auth`, authRoutes);
    this.app.use(`${apiPrefix}/users`, userRoutes);
    this.app.use(`${apiPrefix}/chats`, chatRoutes);
    this.app.use(`${apiPrefix}/messages`, messageRoutes);

    // 404 handler
    this.app.use('*', (_req, res) => {
      res.status(404).json({
        success: false,
        message: 'Endpoint not found',
        error: 'NOT_FOUND'
      });
    });

    logger.info('Routes setup completed');
  }

  private setupSocketIO(): void {
    // Socket.IO authentication middleware
    this.io.use((socket, next) => {
      try {
        const token = socket.handshake.auth['token'];
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }
        
        // Verify JWT token
        const decoded = jwt.verify(token, process.env['JWT_SECRET']!) as AuthTokenPayload;
        
        // Store user info in socket (cast to AuthenticatedSocket)
        const authSocket = socket as AuthenticatedSocket;
        authSocket.userId = decoded.userId;
        authSocket.userEmail = decoded.email;
        authSocket.username = decoded.username;
        
        logger.info(`Socket authenticated for user: ${decoded.email}`);
        next();
      } catch (error) {
        logger.error('Socket authentication error:', error);
        next(new Error('Authentication failed'));
      }
    });

    // Socket.IO connection handling
    this.io.on('connection', (socket) => {
      logger.info(`User connected: ${socket.id}`);

      // TODO: Implement socket event handlers
      // socket.on('join_chat', (data) => {
      //   // Handle joining a chat room
      // });

      // socket.on('leave_chat', (data) => {
      //   // Handle leaving a chat room
      // });

      // socket.on('send_message', (data) => {
      //   // Handle sending a message
      // });

      // socket.on('typing_start', (data) => {
      //   // Handle typing indicators
      // });

      // socket.on('typing_stop', (data) => {
      //   // Handle stop typing
      // });

      socket.on('disconnect', (reason) => {
        logger.info(`User disconnected: ${socket.id} - Reason: ${reason}`);
      });
    });

    logger.info('Socket.IO setup completed');
  }

  private setupErrorHandling(): void {
    // Global error handler
    this.app.use((err: Error, _req: express.Request, res: express.Response, next: express.NextFunction) => {
      logger.error('Global error handler:', err);

      if (res.headersSent) {
        return next(err);
      }

      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env['NODE_ENV'] === 'development' ? err.message : 'SERVER_ERROR'
      });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully');
      this.shutdown();
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT received, shutting down gracefully');
      this.shutdown();
    });

    logger.info('Error handling setup completed');
  }

  private async shutdown(): Promise<void> {
    logger.info('Shutting down server...');
    
    // Close Socket.IO connections
    this.io.close();
    
    // Close HTTP server
    this.server.close(() => {
      logger.info('HTTP server closed');
    });
    
    // Close database connection
    try {
      await db.disconnect();
      logger.info('Database connection closed');
    } catch (error) {
      logger.error('Error closing database connection:', error);
    }
    
    process.exit(0);
  }

  public async start(): Promise<void> {
    try {
      // Connect to database
      await db.connect();
      logger.info('Database connected successfully');

      // Start the server
      this.server.listen(this.port, () => {
        logger.info(`🚀 Server running on port ${this.port}`);
        logger.info(`🌍 Environment: ${process.env['NODE_ENV'] || 'development'}`);
        logger.info(`📡 Socket.IO server ready`);
        logger.info(`🔒 CORS enabled for: ${process.env['CORS_ORIGIN'] || 'http://localhost:4200'}`);
        
        // Log database connection info
        const dbInfo = db.getConnectionInfo();
        logger.info(`🗄️  Database: ${dbInfo.database} on ${dbInfo.host}:${dbInfo.port}`);
        logger.info(`📊 DB Connections: ${dbInfo.totalConnections} total, ${dbInfo.idleConnections} idle`);
      });

    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  public getApp(): Application {
    return this.app;
  }

  public getIO(): SocketIOServer {
    return this.io;
  }
}

// Start the server
const server = new ChatServer();
server.start().catch((error) => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});

export default server; 