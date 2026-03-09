import twilio from 'twilio';
import jwt from 'jsonwebtoken';

// Initialize Twilio client [citation:1]
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

// Generate OTP - Twilio khud generate karega, iski zaroorat nahi
export const generateOTP = () => {
  return Math.floor(1000 + Math.random() * 9000).toString(); // fallback ke liye
};

export const getOTPExpiry = () => {
  return new Date(Date.now() + 5 * 60 * 1000);
};

// 📤 STEP 1: Send OTP using Twilio Verify [citation:1][citation:4]
export const sendOTPViaTwilio = async (phone) => {
  try {
    const formattedNumber = `+91${phone}`; // India country code
    
    console.log(`📤 Sending OTP via Twilio to: ${formattedNumber}`);

    // Twilio Verify API call [citation:1]
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
      status: verification.status,
      to: verification.to
    };

  } catch (error) {
    console.error('❌ Twilio Error:', {
      message: error.message,
      code: error.code,
      status: error.status
    });

    // Handle trial account restrictions [citation:10]
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

// ✅ STEP 2: Verify OTP using Twilio [citation:1][citation:4]
export const verifyOTPViaTwilio = async (phone, code) => {
  try {
    const formattedNumber = `+91${phone}`;

    console.log(`🔍 Verifying OTP for: ${formattedNumber}`);

    const verificationCheck = await client.verify.v2
      .services(verifyServiceSid)
      .verificationChecks.create({
        to: formattedNumber,
        code: code
      });

    console.log('✅ Twilio Verify Response:', {
      status: verificationCheck.status,
      valid: verificationCheck.valid
    });

    // status 'approved' means OTP is correct [citation:4]
    return {
      success: verificationCheck.status === 'approved',
      status: verificationCheck.status
    };

  } catch (error) {
    console.error('❌ Twilio Verify Error:', error);
    return { success: false, error: error.message };
  }
};

export const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30d'
  });
};