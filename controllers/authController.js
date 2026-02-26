import asyncHandler from 'express-async-handler';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import { generateOTP, getOTPExpiry, sendOTPViaSMS, generateToken } from '../utils/otpUtils.js';

// @desc    Send OTP to user
// @route   POST /api/auth/send-otp
// @access  Public
export const sendOTP = asyncHandler(async (req, res) => {
  // Validation
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { name, phone } = req.body;

  // Check if user exists
  let user = await User.findOne({ phone });

  if (user) {
    // Existing user - update name if needed
    user.name = name || user.name;
  } else {
    // New user - create account
    user = await User.create({
      name,
      phone,
      isVerified: false
    });
  }

  // Generate OTP
  const otp = generateOTP();
  const expiresAt = getOTPExpiry();

  // Save OTP to user
  user.otp = {
    code: otp,
    expiresAt: expiresAt,
    attempts: 0
  };
  await user.save();

  // Send OTP via SMS (in production)
  await sendOTPViaSMS(phone, otp);

  // Don't send OTP in response (security)
  res.status(200).json({
    success: true,
    message: 'OTP sent successfully',
    data: {
      phone: user.phone,
      name: user.name,
      isExistingUser: !!user,
      // ⚠️ Remove this in production - only for testing
      ...(process.env.NODE_ENV === 'development' && { testOTP: otp })
    }
  });
});

// @desc    Verify OTP and login
// @route   POST /api/auth/verify-otp
// @access  Public
export const verifyOTP = asyncHandler(async (req, res) => {
  const { phone, otp } = req.body;

  if (!phone || !otp) {
    return res.status(400).json({
      success: false,
      message: 'Please provide phone and OTP'
    });
  }

  // Find user
  const user = await User.findOne({ phone });

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found. Please request OTP first.'
    });
  }

  // Check if OTP exists
  if (!user.otp || !user.otp.code) {
    return res.status(400).json({
      success: false,
      message: 'No OTP found. Please request new OTP.'
    });
  }

  // Check if OTP expired
  if (user.isOTPExpired()) {
    return res.status(400).json({
      success: false,
      message: 'OTP expired. Please request new OTP.'
    });
  }

  // Verify OTP
  if (user.otp.code !== otp) {
    // Increment attempts
    user.otp.attempts += 1;
    await user.save();

    return res.status(400).json({
      success: false,
      message: 'Invalid OTP',
      attemptsLeft: 3 - user.otp.attempts
    });
  }

  // Max attempts check (optional)
  if (user.otp.attempts >= 3) {
    return res.status(400).json({
      success: false,
      message: 'Too many failed attempts. Request new OTP.'
    });
  }

  // Success - OTP verified
  user.isVerified = true;
  user.lastLogin = new Date();
  
  // Clear OTP after successful verification
  user.otp = undefined;
  await user.save();

  // Generate JWT Token
  const token = generateToken(user._id);

  res.status(200).json({
    success: true,
    message: 'Login successful',
    data: {
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        isVerified: user.isVerified,
        role: user.role,
        addresses: user.addresses
      },
      token
    }
  });
});

// @desc    Resend OTP
// @route   POST /api/auth/resend-otp
// @access  Public
export const resendOTP = asyncHandler(async (req, res) => {
  const { phone } = req.body;

  const user = await User.findOne({ phone });

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Generate new OTP
  const otp = generateOTP();
  const expiresAt = getOTPExpiry();

  user.otp = {
    code: otp,
    expiresAt: expiresAt,
    attempts: 0
  };
  await user.save();

  // Send OTP
  await sendOTPViaSMS(phone, otp);

  res.status(200).json({
    success: true,
    message: 'OTP resent successfully',
    ...(process.env.NODE_ENV === 'development' && { testOTP: otp })
  });
});

// @desc    Get current user profile
// @route   GET /api/auth/profile
// @access  Private
export const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('-otp');
  
  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
export const logout = asyncHandler(async (req, res) => {
  // Client side par token remove karna hoga
  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
});