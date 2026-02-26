import express from 'express';
import { 
  getProducts, 
  getProductById,
  getCategories,
  getFeaturedProducts,
  createProduct,
  updateProduct,
  deleteProduct
} from '../controllers/productController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.get('/', getProducts);
router.get('/categories', getCategories);
router.get('/featured', getFeaturedProducts);
router.get('/:id', getProductById);

// Admin routes (protected)
router.post('/', protect, admin, createProduct);
router.put('/:id', protect, admin, updateProduct);
router.delete('/:id', protect, admin, deleteProduct);

export default router;