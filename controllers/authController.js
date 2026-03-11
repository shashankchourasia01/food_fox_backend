import asyncHandler from 'express-async-handler';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';

// ✅ FAST2SMS IMPORTS (नया)
import { 
  generateOTP, 
  getOTPExpiry, 
  sendOTPViaFast2SMS,
  generateToken 
} from '../utils/fast2smsOtp.js';

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

  // 📤 SEND OTP VIA FAST2SMS
  console.log(`📤 Sending OTP via Fast2SMS to ${phone}`);
  
  // Generate OTP locally
  const localOtp = generateOTP();
  
  // Send OTP via Fast2SMS
  const smsResult = await sendOTPViaFast2SMS(phone, localOtp);

  if (smsResult.success) {
    // ✅ Fast2SMS successful
    console.log('✅ Fast2SMS result received:', {
      requestId: smsResult.requestId,
      message: smsResult.message
    });

    user.otp = {
      code: localOtp,  // OTP store करो (Fast2SMS verify नहीं करता)
      expiresAt: expiresAt,
      attempts: 0,
      provider: 'fast2sms'
    };
    
    await user.save();
    
    console.log('💾 OTP saved for user:', user.phone);

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
    // ⚠️ Fast2SMS failed - local OTP fallback (terminal mein dikhega)
    console.log('⚠️ Fast2SMS failed, using local OTP (terminal only)');
    console.log(`🔢 Local OTP for ${phone}: ${localOtp}`);

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

  console.log('🔍 Verify request received:', { phone, otp });

  const user = await User.findOne({ phone });
  if (!user) {
    console.log('❌ User not found');
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  console.log('👤 User found:', { 
    id: user._id, 
    name: user.name,
    phone: user.phone,
    provider: user.otp?.provider 
  });

  if (!user.otp) {
    console.log('❌ No OTP found in user record');
    return res.status(400).json({ success: false, message: 'No OTP found' });
  }

  console.log('📦 OTP record:', {
    provider: user.otp.provider,
    expiresAt: user.otp.expiresAt,
    attempts: user.otp.attempts,
    storedCode: user.otp.code
  });

  if (user.otp.expiresAt < new Date()) {
    console.log('❌ OTP expired');
    return res.status(400).json({ success: false, message: 'OTP expired' });
  }

  let isValid = false;

  // ✅ FAST2SMS VERIFICATION (हमेशा local code से compare करो)
  if (user.otp.provider === 'fast2sms' || user.otp.provider === 'local') {
    console.log('🔍 Comparing OTPs:', { stored: user.otp.code, received: otp });
    isValid = (user.otp.code === otp);
    console.log(`📊 OTP verification result: ${isValid ? '✅ Success' : '❌ Failed'}`);
  }

  if (!isValid) {
    user.otp.attempts += 1;
    await user.save();

    if (user.otp.attempts >= 3) {
      console.log('❌ Too many failed attempts');
      return res.status(400).json({ success: false, message: 'Too many failed attempts' });
    }

    console.log(`❌ Invalid OTP, attempts left: ${3 - user.otp.attempts}`);
    return res.status(400).json({
      success: false,
      message: 'Invalid OTP',
      attemptsLeft: 3 - user.otp.attempts
    });
  }

  // ✅ Success - OTP verified
  console.log('✅ OTP verified successfully, logging in user');
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

  // Try Fast2SMS
  console.log(`📤 Resending OTP via Fast2SMS to ${phone}`);
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
    // Fallback to local OTP
    console.log('⚠️ Fast2SMS resend failed, using local OTP');

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