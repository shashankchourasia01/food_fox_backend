import express from 'express';
import {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart
} from '../controllers/cartController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// All cart routes are protected (user must be logged in)
router.use(protect);

router.route('/')
  .get(getCart)
  .delete(clearCart);

router.post('/items', addToCart);
router.route('/items/:productId')
  .put(updateCartItem)
  .delete(removeFromCart);

export default router;