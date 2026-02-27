import express from 'express';
import {
  getDashboardStats,
  getAllProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getAllOrders,
  updateOrderStatus,
  getOrderDetails,
  getAllUsers,
  updateUserRole
} from '../controllers/adminController.js';
import { protect } from '../middleware/authMiddleware.js';
import { admin } from '../middleware/adminMiddleware.js';

const router = express.Router();

// All admin routes are protected and require admin role
router.use(protect, admin);

// Dashboard
router.get('/dashboard', getDashboardStats);

// Product routes
router.get('/products', getAllProducts);
router.post('/products', createProduct);
router.put('/products/:id', updateProduct);
router.delete('/products/:id', deleteProduct);

// Order routes
router.get('/orders', getAllOrders);
router.get('/orders/:id', getOrderDetails);
router.put('/orders/:id/status', updateOrderStatus);

// User routes
router.get('/users', getAllUsers);
router.put('/users/:id/role', updateUserRole);

export default router;