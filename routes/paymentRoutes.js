import express from 'express';
import {
    createRazorpayOrder,
    verifyPayment,
    paymentWebhook
} from '../controllers/paymentController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Protected routes (require login)
router.post('/create-order', protect, createRazorpayOrder);
router.post('/verify', protect, verifyPayment);

// Public webhook (no auth, signature verification inside)
router.post('/webhook', paymentWebhook);

export default router;