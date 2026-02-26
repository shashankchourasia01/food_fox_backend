import express from 'express';
import { body } from 'express-validator';
import { 
  sendOTP, 
  verifyOTP, 
  resendOTP,
  getProfile,
  logout 
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Validation rules
const validateSendOTP = [
  body('name').notEmpty().withMessage('Name is required'),
  body('phone')
    .notEmpty().withMessage('Phone number is required')
    .isLength({ min: 10, max: 10 }).withMessage('Phone must be 10 digits')
    .matches(/^[0-9]+$/).withMessage('Phone must contain only numbers')
];

const validateVerifyOTP = [
  body('phone').notEmpty().withMessage('Phone is required'),
  body('otp').notEmpty().withMessage('OTP is required')
    .isLength({ min: 4, max: 4 }).withMessage('OTP must be 4 digits')
];

// Public routes
router.post('/send-otp', validateSendOTP, sendOTP);
router.post('/verify-otp', validateVerifyOTP, verifyOTP);
router.post('/resend-otp', resendOTP);

// Private routes (require authentication)
router.get('/profile', protect, getProfile);
router.post('/logout', protect, logout);

export default router;