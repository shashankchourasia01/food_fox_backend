import express from 'express';
import { body } from 'express-validator';
import { 
  sendOTP, 
  verifyOTP, 
  resendOTP,
  sendOTPEmail,
  verifyOTPEmail,
  resendOTPEmail,
  getProfile,
  logout 
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import { otpRateLimit } from '../middleware/otpRateLimitMiddleware.js';

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
    .isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
];

const validateResendOTP = [
  body('phone')
    .notEmpty().withMessage('Phone is required')
    .isLength({ min: 10, max: 10 }).withMessage('Phone must be 10 digits')
    .matches(/^[0-9]+$/).withMessage('Phone must contain only numbers')
];

const validateSendOTPEmail = [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required')
];

const validateVerifyOTPEmail = [
  body('email').isEmail().withMessage('Email is required'),
  body('otp').notEmpty().withMessage('OTP is required').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
];

const validateResendOTPEmail = [
  body('email').isEmail().withMessage('Email is required')
];

// Public routes (rate limit: 6 per phone/email per 15 min for multi-device support)
router.post('/send-otp', otpRateLimit, validateSendOTP, sendOTP);
router.post('/verify-otp', validateVerifyOTP, verifyOTP);
router.post('/resend-otp', otpRateLimit, validateResendOTP, resendOTP);
router.post('/send-otp-email', otpRateLimit, validateSendOTPEmail, sendOTPEmail);
router.post('/verify-otp-email', validateVerifyOTPEmail, verifyOTPEmail);
router.post('/resend-otp-email', otpRateLimit, validateResendOTPEmail, resendOTPEmail);

// Private routes (require authentication)
router.get('/profile', protect, getProfile);
router.post('/logout', protect, logout);

export default router;