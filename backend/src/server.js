const express = require('express');
const http = require('http');
const cors = require('cors');
require('dotenv').config();

const prisma = require('./prisma');
const { initChatSocket } = require('./socket/chatSocket');

const app = express();
const PORT = process.env.PORT || 5000;

// Create HTTP server from Express app (required for Socket.io)
const server = http.createServer(app);

// Initialize Socket.io on the HTTP server
const io = initChatSocket(server);
// Make io accessible in routes if needed
app.set('io', io);

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root Route
app.get('/', (req, res) => {
  res.json({
    message: 'Express server is running',
    status: 'healthy',
    socketIO: 'enabled',
  });
});

// Database Health Check Route
app.get('/api/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'UP',
      database: 'Connected to PostgreSQL via Prisma',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      status: 'DOWN',
      database: 'Database connection failed',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Import Routers
const authRouter = require('./routers/authRouter');
const roleRouter = require('./routers/roleRouter');
const userRouter = require('./routers/userRouter');
const storeRouter = require('./routers/storeRouter');
const chatRouter = require('./routers/chatRouter');
const productRouter = require('./routers/productRouter');

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/roles', roleRouter);
app.use('/api/users', userRouter);
app.use('/api/stores', storeRouter);
app.use('/api/chat', chatRouter);
app.use('/api/products', productRouter);

// 404 Route Handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Central Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message,
  });
});

// Function to test DB connection on startup
async function testDbConnection() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ PostgreSQL database connected successfully via Prisma Client');
  } catch (error) {
    console.warn('⚠️  Could not connect to PostgreSQL database on startup:');
    console.warn(`   ${error.message}`);
    console.warn('   Please check DATABASE_URL in backend/.env with your PostgreSQL credentials.');
  }
}

// Start Server (using http server, not app.listen — required for Socket.io)
server.listen(PORT, async () => {
  console.log(`🚀 Server listening on port ${PORT} (http://localhost:${PORT})`);
  await testDbConnection();
});

// Handle server errors (e.g. port already in use)
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use.`);
    console.error(`👉 Tip: On macOS, port 5000 is often reserved by AirPlay Receiver.`);
    console.error(`   You can change PORT=8000 in your backend/.env file.`);
    process.exit(1);
  } else {
    console.error('❌ Server startup error:', err);
  }
});

// Graceful Shutdown
const gracefulShutdown = async (signal) => {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    console.log('HTTP server closed.');
    await prisma.$disconnect();
    console.log('Prisma client disconnected.');
    process.exit(0);
  });
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.once('SIGUSR2', async () => {
  await prisma.$disconnect();
  process.kill(process.pid, 'SIGUSR2');
});

module.exports = app;
