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


// import asyncHandler from 'express-async-handler';
// import { body, validationResult } from 'express-validator';
// import User from '../models/User.js';
// import { 
//   generateOTP, 
//   getOTPExpiry, 
//   startVerification,
//   checkVerification,
//   generateToken 
// } from '../utils/verifyOtp.js';  // 👈 New Verify API import

// // @desc    Send OTP to user
// // @route   POST /api/auth/send-otp
// // @access  Public
// export const sendOTP = asyncHandler(async (req, res) => {
//   const errors = validationResult(req);
//   if (!errors.isEmpty()) {
//     return res.status(400).json({ success: false, errors: errors.array() });
//   }

//   const { name, phone } = req.body;

//   // Validate phone number
//   if (!phone || phone.length !== 10) {
//     return res.status(400).json({
//       success: false,
//       message: 'Please provide a valid 10-digit phone number'
//     });
//   }

//   // Check if user exists
//   let user = await User.findOne({ phone });

//   if (user) {
//     user.name = name || user.name;
//   } else {
//     user = await User.create({
//       name,
//       phone,
//       isVerified: false
//     });
//   }

//   const expiresAt = getOTPExpiry();

//   // ✅ STEP 1: Start verification with Verify API
//   console.log(`📤 Starting verification for ${phone}`);
//   const verifyResult = await startVerification(phone);

//   if (verifyResult.success) {
//     // Save requestId to user document
//     user.otp = {
//       requestId: verifyResult.requestId,
//       expiresAt: expiresAt,
//       attempts: 0,
//       provider: 'vonage-verify'
//     };
//     await user.save();

//     console.log(`✅ Verification started, Request ID: ${verifyResult.requestId}`);

//     res.status(200).json({
//       success: true,
//       message: 'OTP sent successfully',
//       data: {
//         phone: user.phone,
//         name: user.name,
//         isExistingUser: !!user
//       }
//     });
//   } else {
//     // Fallback to local OTP
//     console.error('❌ Verify API failed:', verifyResult.error);
//     const localOtp = generateOTP();

//     user.otp = {
//       code: localOtp,
//       expiresAt: expiresAt,
//       attempts: 0,
//       provider: 'local'
//     };
//     await user.save();

//     res.status(200).json({
//       success: true,
//       message: 'OTP sent via fallback',
//       data: {
//         phone: user.phone,
//         name: user.name,
//         isExistingUser: !!user,
//         ...(process.env.NODE_ENV === 'development' && { testOTP: localOtp })
//       }
//     });
//   }
// });

// // @desc    Verify OTP and login
// // @route   POST /api/auth/verify-otp
// // @access  Public
// export const verifyOTP = asyncHandler(async (req, res) => {
//   const { phone, otp } = req.body;

//   if (!phone || !otp) {
//     return res.status(400).json({
//       success: false,
//       message: 'Please provide phone and OTP'
//     });
//   }

//   const user = await User.findOne({ phone });

//   if (!user) {
//     return res.status(404).json({
//       success: false,
//       message: 'User not found. Please request OTP first.'
//     });
//   }

//   if (!user.otp) {
//     return res.status(400).json({
//       success: false,
//       message: 'No OTP found. Please request new OTP.'
//     });
//   }

//   if (user.otp.expiresAt < new Date()) {
//     return res.status(400).json({
//       success: false,
//       message: 'OTP expired. Please request new OTP.'
//     });
//   }

//   let isOtpValid = false;

//   // ✅ STEP 2: Check verification based on provider
//   if (user.otp.provider === 'vonage-verify' && user.otp.requestId) {
//     console.log(`🔍 Checking verification for request: ${user.otp.requestId}`);
//     const checkResult = await checkVerification(user.otp.requestId, otp);
    
//     if (checkResult.success) {
//       isOtpValid = true;
//       console.log('✅ OTP verified by Vonage');
//     } else {
//       console.log('❌ Vonage verification failed:', checkResult.error);
//     }
//   } 
//   else if (user.otp.provider === 'local' && user.otp.code) {
//     isOtpValid = (user.otp.code === otp);
//     console.log(`🔍 Local OTP verification: ${isOtpValid ? '✅' : '❌'}`);
//   }

//   if (!isOtpValid) {
//     user.otp.attempts += 1;
//     await user.save();

//     if (user.otp.attempts >= 3) {
//       return res.status(400).json({
//         success: false,
//         message: 'Too many failed attempts. Please request new OTP.'
//       });
//     }

//     return res.status(400).json({
//       success: false,
//       message: 'Invalid OTP',
//       attemptsLeft: 3 - user.otp.attempts
//     });
//   }

//   // ✅ Success - OTP verified
//   user.isVerified = true;
//   user.lastLogin = new Date();
//   user.otp = undefined;
//   await user.save();

//   const token = generateToken(user._id);

//   res.status(200).json({
//     success: true,
//     message: 'Login successful',
//     data: {
//       user: {
//         id: user._id,
//         name: user.name,
//         phone: user.phone,
//         email: user.email,
//         isVerified: user.isVerified,
//         role: user.role,
//         addresses: user.addresses || []
//       },
//       token
//     }
//   });
// });

// // @desc    Resend OTP
// // @route   POST /api/auth/resend-otp
// // @access  Public
// export const resendOTP = asyncHandler(async (req, res) => {
//   const { phone } = req.body;

//   const user = await User.findOne({ phone });

//   if (!user) {
//     return res.status(404).json({
//       success: false,
//       message: 'User not found'
//     });
//   }

//   const expiresAt = getOTPExpiry();

//   // Try Verify API again
//   const verifyResult = await startVerification(phone);

//   if (verifyResult.success) {
//     user.otp = {
//       requestId: verifyResult.requestId,
//       expiresAt: expiresAt,
//       attempts: 0,
//       provider: 'vonage-verify'
//     };
//     await user.save();

//     res.status(200).json({
//       success: true,
//       message: 'OTP resent successfully'
//     });
//   } else {
//     const localOtp = generateOTP();

//     user.otp = {
//       code: localOtp,
//       expiresAt: expiresAt,
//       attempts: 0,
//       provider: 'local'
//     };
//     await user.save();

//     res.status(200).json({
//       success: true,
//       message: 'OTP resent via fallback',
//       ...(process.env.NODE_ENV === 'development' && { testOTP: localOtp })
//     });
//   }
// });

// // @desc    Get current user profile
// // @route   GET /api/auth/profile
// // @access  Private
// export const getProfile = asyncHandler(async (req, res) => {
//   const user = await User.findById(req.user._id).select('-otp');
  
//   res.status(200).json({
//     success: true,
//     data: user
//   });
// });

// // @desc    Logout user
// // @route   POST /api/auth/logout
// // @access  Private
// export const logout = asyncHandler(async (req, res) => {
//   res.status(200).json({
//     success: true,
//     message: 'Logged out successfully'
//   });
// });
