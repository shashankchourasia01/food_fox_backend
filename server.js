import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './config/db.js';

// Import routes
import userRoutes from './routes/userRoutes.js';
import authRoutes from './routes/authRoutes.js';
import productRoutes from './routes/productRoutes.js'
import cartRoutes from './routes/cartRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import addressRoutes from './routes/addressRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();
const PORT = process.env.PORT || 5000;

// ============================================
// CORS CONFIGURATION - UPDATED ✅
// ============================================

// Allowed origins array
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://food-ordering-frontend.vercel.app/',
  'https://food-fox-five.vercel.app',   
  'https://food-fox-backend.onrender.com'
];

// Dynamic CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, Postman, curl)
    if (!origin || process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    
    // Check if origin is allowed
    if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('❌ Blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,            // Allow cookies to be sent
  optionsSuccessStatus: 200,     // For legacy browser support
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

// ✅ OPTIONAL: Debug middleware to log all requests
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`📡 ${req.method} ${req.path} - Origin: ${req.headers.origin || 'No Origin'}`);
    next();
  });
}

// Handle preflight requests
//app.options('*', cors(corsOptions));

// ============================================
// OTHER MIDDLEWARE
// ============================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================================
// API ROUTES
// ============================================

app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/users/addresses', addressRoutes);
app.use('/api/admin', adminRoutes);

// ============================================
// BASE ROUTE
// ============================================
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: '🍽️ Food Ordering System API',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    database: 'connected',
    endpoints: {
      users: '/api/users',
      auth: '/api/auth',
      products: '/api/products',
      orders: '/api/orders',
      cart: '/api/cart',
      addresses: '/api/users/addresses',
      admin: '/api/admin'
    },
    timestamp: new Date().toISOString()
  });
});

// ============================================
// 404 HANDLER - Route not found
// ============================================
// ✅ Correct way - using all() method
// app.all('*', (req, res) => {
//   res.status(404).json({
//     success: false,
//     message: `🔍 Route '${req.originalUrl}' not found`
//   });
// });
// ============================================
// ERROR HANDLER
// ============================================
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ============================================
// START SERVER
// ============================================
app.listen(PORT, () => {
  console.log('\n=================================');
  console.log(`✅ Server is running on port ${PORT}`);
  console.log(`🔗 http://localhost:${PORT}`);
  console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🗄️  Database: Connected to MongoDB`);
  console.log(`🔒 CORS Allowed Origins:`);
  allowedOrigins.forEach(origin => console.log(`   - ${origin}`));
  console.log('=================================\n');
});