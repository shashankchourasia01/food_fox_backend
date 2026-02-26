import crypto from 'crypto';

// Generate 4-digit OTP
export const generateOTP = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

// Generate OTP expiry (5 minutes)
export const getOTPExpiry = () => {
  return new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
};

// For production: Send OTP via SMS (MSG91)
export const sendOTPViaSMS = async (phone, otp) => {
  try {
    // 📱 MSG91 API call (kal implement karenge)
    // Abhi console.log se kaam chalao
    console.log(`📱 OTP for ${phone}: ${otp}`);
    
    return { success: true };
  } catch (error) {
    console.error('SMS sending failed:', error);
    return { success: false, error: error.message };
  }
};

// Generate JWT Token
import jwt from 'jsonwebtoken';

export const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30d'
  });
};