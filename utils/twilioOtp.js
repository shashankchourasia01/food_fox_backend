import twilio from 'twilio';
import jwt from 'jsonwebtoken';

// Initialize Twilio client
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

// Generate OTP - Twilio khud generate karega, iski zaroorat nahi
export const generateOTP = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

export const getOTPExpiry = () => {
  return new Date(Date.now() + 5 * 60 * 1000);
};

// 📤 STEP 1: Send OTP using Twilio Verify
export const sendOTPViaTwilio = async (phone) => {
  try {
    const formattedNumber = `+91${phone}`; // India country code
    
    console.log(`📤 Sending OTP via Twilio to: ${formattedNumber}`);

    // Twilio Verify API call
    const verification = await client.verify.v2
      .services(verifyServiceSid)
      .verifications.create({
        to: formattedNumber,
        channel: 'sms'
      });

    console.log('✅ Twilio Response:', {
      status: verification.status,
      sid: verification.sid,
      to: verification.to
    });

    return {
      success: true,
      sid: verification.sid,
      status: verification.status,
      to: verification.to
    };

  } catch (error) {
    console.error('❌ Twilio Error:', {
      message: error.message,
      code: error.code,
      status: error.status
    });

    if (error.code === 60203) {
      return { 
        success: false, 
        error: 'Please verify this number in Twilio Console first (trial account restriction)'
      };
    }

    return { 
      success: false, 
      error: error.message 
    };
  }
};

// ✅ STEP 2: Verify OTP using Twilio (FIXED VERSION)
export const verifyOTPViaTwilio = async (phone, code) => {
  try {
    const formattedNumber = `+91${phone}`;

    console.log(`🔍 Verifying OTP for: ${formattedNumber} with code: ${code}`);

    // ✅ verificationChecks.create() use karo
    const verificationCheck = await client.verify.v2
      .services(verifyServiceSid)
      .verificationChecks.create({
        to: formattedNumber,
        code: code
      });

    console.log('✅ Twilio Verify Response:', {
      status: verificationCheck.status,
      valid: verificationCheck.valid,
      sid: verificationCheck.sid
    });

    // ✅ status 'approved' means OTP is correct
    return {
      success: verificationCheck.status === 'approved',
      status: verificationCheck.status,
      valid: verificationCheck.valid
    };

  } catch (error) {
    console.error('❌ Twilio Verify Error:', error);
    
    // Handle specific error codes
    if (error.code === 20404) {
      return { success: false, error: 'Invalid verification code' };
    }
    
    return { success: false, error: error.message };
  }
};

export const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30d'
  });
};