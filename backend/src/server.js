const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
require('dotenv').config();

const socketConfig = require('../config/socket');
const dbConfig = require('../config/database');
const authRoutes = require('./routes/auth');

const app = express();
const server = createServer(app);

// Middleware
app.use(helmet());
app.use(compression());
app.use(morgan('combined'));
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:4200'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: process.env.SOCKET_ORIGINS?.split(',') || ['http://localhost:4200'],
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Socket configuration
socketConfig.setupSocketHandlers(io);

// Routes
app.use('/api/auth', authRoutes);

// Basic routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'Socket.IO Chat Server with JWT Authentication',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    connectedSockets: io.engine.clientsCount,
    features: [
      'JWT Authentication',
      'Real-time messaging',
      'Room management',
      'Private messaging',
      'Message history',
      'User management'
    ]
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    database: 'connected',
    socketConnections: io.engine.clientsCount
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('❌ Server error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

// Initialize database
async function initializeServer() {
  try {
    await dbConfig.initializeDatabase();
    console.log('✅ Database initialized successfully');
    
    // Start cleanup tasks
    startCleanupTasks();
    
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
    process.exit(1);
  }
}

// Cleanup tasks
function startCleanupTasks() {
  // Clean up expired sessions every hour
  setInterval(() => {
    dbConfig.cleanupExpiredSessions();
  }, 60 * 60 * 1000);
  
  console.log('🧹 Cleanup tasks started');
}

// Start server
const PORT = process.env.PORT || 3000;

initializeServer().then(() => {
  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📡 Socket.IO server ready with JWT authentication`);
    console.log(`🔒 CORS enabled for: ${process.env.ALLOWED_ORIGINS || 'http://localhost:4200'}`);
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('💀 HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('💀 HTTP server closed');
    process.exit(0);
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Promise Rejection:', err);
  process.exit(1);
});

module.exports = { app, server, io }; 