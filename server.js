import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Test route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Food Ordering System API is running!',
    status: 'success',
    timestamp: new Date().toISOString()
  });
});

// Test API route
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'API is working!',
    data: {
      version: '1.0.0',
      environment: process.env.NODE_ENV
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
  console.log(`🔗 http://localhost:${PORT}`);
  console.log(`🔗 http://localhost:${PORT}/api/test`);
});