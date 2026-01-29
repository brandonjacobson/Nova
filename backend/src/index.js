require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');
const helmet = require('helmet');

// Import routes
const authRouter = require('./routes/auth');
const invoicesRouter = require('./routes/invoices');
const dashboardRouter = require('./routes/dashboard');
const publicRouter = require('./routes/public');
const settingsRouter = require('./routes/settings');

const app = express();

// Middleware
app.use(helmet());
const allowedOrigins = [
"http://localhost:3000",
"https://nova-sand-iota.vercel.app",
];


app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (Postman, curl, server-to-server)
      if (!origin) return callback(null, true);


      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } 

      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);
app.use(express.json());

// Health check endpoint (no auth required)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/invoices', invoicesRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/public', publicRouter);
app.use('/api/settings', settingsRouter);

// 404 handler for API routes (Express 5 syntax)
app.use('/api/{*splat}', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
});

const PORT = process.env.PORT || 4000;

// Start server after database connection
const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Backend listening on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
