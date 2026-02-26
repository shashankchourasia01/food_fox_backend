import express from 'express';
import {
  createOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
  trackOrder
} from '../controllers/orderController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// All order routes are protected
router.use(protect);

router.route('/')
  .post(createOrder)
  .get(getMyOrders);

router.get('/my-orders', getMyOrders);
router.get('/:id', getOrderById);
router.get('/:id/track', trackOrder);
router.put('/:id/cancel', cancelOrder);

export default router;