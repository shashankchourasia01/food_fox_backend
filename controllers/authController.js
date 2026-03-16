import asyncHandler from 'express-async-handler';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';

import { 
  generateOTP, 
  getOTPExpiry, 
  sendOTPViaFast2SMS,
  generateToken 
} from '../utils/fast2smsOtp.js';
import { sendOTPViaEmail } from '../utils/emailOtp.js';

// Placeholder phone for email-only users (10 digits). Prefix 7 = email user.
const placeholderPhoneForEmail = (email) => {
  let h = 0;
  for (let i = 0; i < email.length; i++) h = ((h << 5) - h) + email.charCodeAt(i) | 0;
  const base = (Math.abs(h) % 900000000) + 100000000; // 9 digits, avoid leading zero
  return '7' + base.toString();
};

// 🔴 TWILIO IMPORTS (COMMENT OUT)
// import { 
//   generateOTP, 
//   getOTPExpiry, 
//   sendOTPViaTwilio,
//   verifyOTPViaTwilio,
//   generateToken 
// } from '../utils/twilioOtp.js';

// @desc    Send OTP to user
// @route   POST /api/auth/send-otp
// @access  Public
export const sendOTP = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { name, phone } = req.body;

  if (!phone || phone.length !== 10) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid 10-digit phone number'
    });
  }

  let user = await User.findOne({ phone });

  if (user) {
    user.name = name || user.name;
  } else {
    user = await User.create({
      name,
      phone,
      isVerified: false
    });
  }

  const expiresAt = getOTPExpiry();

  const localOtp = generateOTP();
  const smsResult = await sendOTPViaFast2SMS(phone, localOtp);

  if (smsResult.success) {
    user.otp = {
      code: localOtp,  // OTP store करो (Fast2SMS verify नहीं करता)
      expiresAt: expiresAt,
      attempts: 0,
      provider: 'fast2sms'
    };
    
    await user.save();

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully',
      data: {
        phone: user.phone,
        name: user.name,
        isExistingUser: !!user,
        ...(process.env.NODE_ENV === 'development' && { testOTP: localOtp })
      }
    });
  } else {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[OTP] Fallback: Local OTP for ${phone}: ${localOtp}`);
    }
    user.otp = {
      code: localOtp,
      expiresAt: expiresAt,
      attempts: 0,
      provider: 'local'
    };
    await user.save();

    res.status(200).json({
      success: true,
      message: 'OTP sent via fallback (check terminal)',
      data: {
        phone: user.phone,
        name: user.name,
        isExistingUser: !!user,
        ...(process.env.NODE_ENV === 'development' && { testOTP: localOtp })
      }
    });
  }
});

// @desc    Verify OTP and login
// @route   POST /api/auth/verify-otp
// @access  Public
export const verifyOTP = asyncHandler(async (req, res) => {
  const { phone, otp } = req.body;

  const user = await User.findOne({ phone });
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  if (!user.otp) {
    return res.status(400).json({ success: false, message: 'No OTP found' });
  }

  if (user.otp.expiresAt < new Date()) {
    return res.status(400).json({ success: false, message: 'OTP expired' });
  }

  let isValid = false;
  if (user.otp.provider === 'fast2sms' || user.otp.provider === 'local') {
    isValid = (user.otp.code === otp);
  }

  if (!isValid) {
    user.otp.attempts += 1;
    await user.save();

    if (user.otp.attempts >= 3) {
      return res.status(400).json({ success: false, message: 'Too many failed attempts' });
    }

    return res.status(400).json({
      success: false,
      message: 'Invalid OTP',
      attemptsLeft: 3 - user.otp.attempts
    });
  }

  user.isVerified = true;
  user.lastLogin = new Date();
  user.otp = undefined;
  await user.save();

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
        addresses: user.addresses || []
      },
      token
    }
  });
});

// @desc    Resend OTP with Fast2SMS
// @route   POST /api/auth/resend-otp
// @access  Public
export const resendOTP = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { phone } = req.body;

  const user = await User.findOne({ phone });

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  const expiresAt = getOTPExpiry();
  const localOtp = generateOTP();

  const smsResult = await sendOTPViaFast2SMS(phone, localOtp);

  if (smsResult.success) {
    user.otp = {
      code: localOtp,
      expiresAt: expiresAt,
      attempts: 0,
      provider: 'fast2sms'
    };
    await user.save();

    res.status(200).json({
      success: true,
      message: 'OTP resent successfully',
      data: {
        phone: user.phone,
        name: user.name
      },
      ...(process.env.NODE_ENV === 'development' && { testOTP: localOtp })
    });
  } else {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[OTP] Resend fallback: Local OTP for ${phone}`);
    }
    user.otp = {
      code: localOtp,
      expiresAt: expiresAt,
      attempts: 0,
      provider: 'local'
    };
    await user.save();

    res.status(200).json({
      success: true,
      message: 'OTP resent via fallback',
      ...(process.env.NODE_ENV === 'development' && { testOTP: localOtp })
    });
  }
});

// ========== EMAIL OTP (FREE - no per-OTP cost) ==========

// @desc    Send OTP to email
// @route   POST /api/auth/send-otp-email
// @access  Public
export const sendOTPEmail = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { name, email } = req.body;
  const emailLower = email?.toLowerCase().trim();

  let user = await User.findOne({ email: emailLower });
  if (user) {
    user.name = name || user.name;
  } else {
    let phone = placeholderPhoneForEmail(emailLower);
    try {
      user = await User.create({
        name,
        email: emailLower,
        phone,
        isVerified: false
      });
    } catch (err) {
      if (err.code === 11000 && err.keyPattern?.phone) {
        phone = '8' + (Math.floor(100000000 + Math.random() * 900000000)).toString();
        user = await User.create({ name, email: emailLower, phone, isVerified: false });
      } else throw err;
    }
  }

  const expiresAt = getOTPExpiry();
  const localOtp = generateOTP();
  const emailResult = await sendOTPViaEmail(emailLower, localOtp);

  if (emailResult.success) {
    user.otp = {
      code: localOtp,
      expiresAt,
      attempts: 0,
      provider: 'email'
    };
    await user.save();

    res.status(200).json({
      success: true,
      message: 'OTP sent to your email',
      data: {
        email: user.email,
        name: user.name,
        isExistingUser: !!user,
        ...(process.env.NODE_ENV === 'development' && { testOTP: localOtp })
      }
    });
  } else {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[OTP] Email fallback: OTP for ${emailLower}: ${localOtp}`);
      user.otp = { code: localOtp, expiresAt, attempts: 0, provider: 'local' };
      await user.save();
      res.status(200).json({
        success: true,
        message: 'OTP (dev fallback - check terminal)',
        data: { email: user.email, name: user.name, testOTP: localOtp }
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send OTP. Please try again or use Phone OTP.'
      });
    }
  }
});

// @desc    Verify email OTP and login
// @route   POST /api/auth/verify-otp-email
// @access  Public
export const verifyOTPEmail = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  const emailLower = email?.toLowerCase().trim();

  const user = await User.findOne({ email: emailLower });
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  if (!user.otp) return res.status(400).json({ success: false, message: 'No OTP found' });
  if (user.otp.expiresAt < new Date()) return res.status(400).json({ success: false, message: 'OTP expired' });

  const isValid = (user.otp.provider === 'email' || user.otp.provider === 'local') && user.otp.code === otp;

  if (!isValid) {
    user.otp.attempts += 1;
    await user.save();
    if (user.otp.attempts >= 3) {
      return res.status(400).json({ success: false, message: 'Too many failed attempts' });
    }
    return res.status(400).json({
      success: false,
      message: 'Invalid OTP',
      attemptsLeft: 3 - user.otp.attempts
    });
  }

  user.isVerified = true;
  user.lastLogin = new Date();
  user.otp = undefined;
  await user.save();

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
        addresses: user.addresses || []
      },
      token
    }
  });
});

// @desc    Resend email OTP
// @route   POST /api/auth/resend-otp-email
// @access  Public
export const resendOTPEmail = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { email } = req.body;
  const emailLower = email?.toLowerCase().trim();
  const user = await User.findOne({ email: emailLower });

  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  const expiresAt = getOTPExpiry();
  const localOtp = generateOTP();
  const emailResult = await sendOTPViaEmail(emailLower, localOtp);

  if (emailResult.success) {
    user.otp = { code: localOtp, expiresAt, attempts: 0, provider: 'email' };
    await user.save();
    res.status(200).json({
      success: true,
      message: 'OTP resent to your email',
      data: { email: user.email, name: user.name },
      ...(process.env.NODE_ENV === 'development' && { testOTP: localOtp })
    });
  } else {
    if (process.env.NODE_ENV === 'development') {
      user.otp = { code: localOtp, expiresAt, attempts: 0, provider: 'local' };
      await user.save();
      res.status(200).json({
        success: true,
        message: 'OTP resent (dev fallback)',
        ...(process.env.NODE_ENV === 'development' && { testOTP: localOtp })
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to resend OTP. Please try again.'
      });
    }
  }
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
  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
});




// // new for twilio
// import asyncHandler from 'express-async-handler';
// import { body, validationResult } from 'express-validator';
// import User from '../models/User.js';
// import { 
//   generateOTP, 
//   getOTPExpiry, 
//   sendOTPViaTwilio,
//   verifyOTPViaTwilio,
//   generateToken 
// } from '../utils/twilioOtp.js';

// // @desc    Send OTP to user
// // @route   POST /api/auth/send-otp
// // @access  Public
// export const sendOTP = asyncHandler(async (req, res) => {
//   const errors = validationResult(req);
//   if (!errors.isEmpty()) {
//     return res.status(400).json({ success: false, errors: errors.array() });
//   }

//   const { name, phone } = req.body;

//   if (!phone || phone.length !== 10) {
//     return res.status(400).json({
//       success: false,
//       message: 'Please provide a valid 10-digit phone number'
//     });
//   }

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

//   // Try Twilio OTP
//   console.log(`📤 Sending OTP via Twilio to ${phone}`);
//   const twilioResult = await sendOTPViaTwilio(phone);

//   if (twilioResult.success) {
//     // ✅ Debug logs
//     console.log('✅ Twilio result received:', {
//       sid: twilioResult.sid,
//       status: twilioResult.status
//     });

//     // ✅ Explicitly set the values
//     user.otp = {
//       requestId: twilioResult.sid,  // Twilio ka SID
//       expiresAt: expiresAt,
//       attempts: 0,
//       provider: 'twilio'
//     };
    
//     // Save user
//     await user.save();
    
//     // ✅ Verify save was successful
//     const savedUser = await User.findById(user._id);
//     console.log('💾 User after save:', {
//       provider: savedUser.otp?.provider,
//       requestId: savedUser.otp?.requestId,
//       expiresAt: savedUser.otp?.expiresAt
//     });

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
//     console.log('⚠️ Twilio failed, using local OTP');
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

//   console.log('🔍 Verify request received:', { phone, otp });

//   const user = await User.findOne({ phone });
//   if (!user) {
//     console.log('❌ User not found');
//     return res.status(404).json({ success: false, message: 'User not found' });
//   }

//   console.log('👤 User found:', { 
//     id: user._id, 
//     name: user.name,
//     phone: user.phone,
//     provider: user.otp?.provider 
//   });

//   if (!user.otp) {
//     console.log('❌ No OTP found in user record');
//     return res.status(400).json({ success: false, message: 'No OTP found' });
//   }

//   console.log('📦 OTP record:', {
//     provider: user.otp.provider,
//     expiresAt: user.otp.expiresAt,
//     attempts: user.otp.attempts,
//     requestId: user.otp.requestId
//   });

//   if (user.otp.expiresAt < new Date()) {
//     console.log('❌ OTP expired');
//     return res.status(400).json({ success: false, message: 'OTP expired' });
//   }

//   let isValid = false;
//   let verifyResult = null;

//   if (user.otp.provider === 'twilio') {
//     console.log('📞 Calling Twilio verify with:', { phone, otp, requestId: user.otp.requestId });
    
//     verifyResult = await verifyOTPViaTwilio(phone, otp);
//     console.log('📊 Raw Twilio verify result:', JSON.stringify(verifyResult, null, 2));
    
//     // Check both success flag and valid property
//     isValid = verifyResult.success === true || verifyResult.valid === true;
    
//     if (!isValid) {
//       console.log('❌ Twilio verification failed with result:', verifyResult);
//     } else {
//       console.log('✅ Twilio verification successful!');
//     }
    
//   } else if (user.otp.provider === 'local' && user.otp.code) {
//     // Local verification
//     console.log('🔍 Local OTP verification:', { stored: user.otp.code, received: otp });
//     isValid = (user.otp.code === otp);
//     console.log('📊 Local verify result:', isValid);
//   } else {
//     console.log('❌ Unknown provider or missing data:', user.otp.provider);
//   }

//   if (!isValid) {
//     user.otp.attempts += 1;
//     await user.save();

//     if (user.otp.attempts >= 3) {
//       console.log('❌ Too many failed attempts');
//       return res.status(400).json({ success: false, message: 'Too many failed attempts' });
//     }

//     console.log(`❌ Invalid OTP, attempts left: ${3 - user.otp.attempts}`);
//     return res.status(400).json({
//       success: false,
//       message: 'Invalid OTP',
//       attemptsLeft: 3 - user.otp.attempts,
//       debug: verifyResult ? { twilioStatus: verifyResult.status } : null
//     });
//   }

//   // Success
//   console.log('✅ OTP verified successfully, logging in user');
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

// // @desc    Resend OTP - ✅ FIXED with Twilio
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

//   // ✅ Try Twilio OTP
//   console.log(`📤 Resending OTP via Twilio to ${phone}`);
//   const twilioResult = await sendOTPViaTwilio(phone);

//   if (twilioResult.success) {
//     user.otp = {
//       requestId: twilioResult.sid,
//       expiresAt: expiresAt,
//       attempts: 0,
//       provider: 'twilio'
//     };
//     await user.save();

//     res.status(200).json({
//       success: true,
//       message: 'OTP resent successfully',
//       data: {
//         phone: user.phone,
//         name: user.name
//       }
//     });
//   } else {
//     // Fallback to local OTP
//     console.log('⚠️ Twilio resend failed, using local OTP');
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