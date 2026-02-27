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


// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================================
// API ROUTES
// ============================================

// User routes
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/users/addresses', addressRoutes);

// Feedback routes (coming soon)
// app.use('/api/feedback', feedbackRoutes);

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
      products: '/api/products (coming soon)',
      orders: '/api/orders (coming soon)',
      cart: '/api/cart (coming soon)',
      feedback: '/api/feedback (coming soon)'
    },
    timestamp: new Date().toISOString()
  });
});

// ============================================
// Start server
// ============================================
app.listen(PORT, () => {
  console.log('\n=================================');
  console.log(`✅ Server is running on port ${PORT}`);
  console.log(`🔗 http://localhost:${PORT}`);
  console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🗄️  Database: Connected to MongoDB`);
  console.log('=================================\n');
});