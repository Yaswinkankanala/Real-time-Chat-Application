const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config();

const authRoutes = require('./routes/authRoutes');
const { router: chatRoutes } = require('./routes/chatRoutes');
const aiRoutes = require('./routes/aiRoutes');
const { setupSocket } = require('./socket');

const app = express();
const server = http.createServer(app);

// CORS configuration
const envOrigins = [
  process.env.CLIENT_URL,
  process.env.FRONTEND_URL
].filter(Boolean);

const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://chatsphere-frontend-9o36.onrender.com',
  ...envOrigins
];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);

    const cleanOrigin = origin.trim().replace(/\/+$/, '');
    const isAllowed = allowedOrigins.some(
      (allowed) => allowed.trim().replace(/\/+$/, '') === cleanOrigin
    );

    if (isAllowed) {
      return callback(null, true);
    }
    return callback(new Error(`CORS policy: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

const imageStore = require('./storage/imageStore');

// Initialize persistent image storage
imageStore.init();

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static uploads folder with explicit CORS and Cross-Origin-Resource-Policy
app.use(
  '/uploads',
  (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
  },
  express.static(imageStore.UPLOADS_DIR, { maxAge: '7d' })
);

// Dedicated profile image retrieval route
app.get('/api/images/profile/:filename', (req, res) => {
  const fileData = imageStore.getImage(req.params.filename);
  if (!fileData) {
    return res.status(404).json({ error: 'Image not found' });
  }
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  res.header('Content-Type', fileData.mimetype);
  res.header('Cache-Control', 'public, max-age=604800');
  return res.send(fileData.buffer);
});

// Health check endpoints (root /health and /api/health)
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'realtime-chat-backend'
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'realtime-chat-backend'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api', chatRoutes);

// Serve frontend static build in production if available
const frontendDist = path.join(__dirname, '..', '..', 'frontend', 'dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// Socket.io initialization
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.set('io', io);
setupSocket(io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`=========================================`);
  console.log(`🚀 Chat Backend Server running on port ${PORT}`);
  console.log(`📡 WebSocket server is ready`);
  console.log(`📁 Static files served at /uploads`);
  console.log(`=========================================`);
});
