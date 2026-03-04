import { Vonage } from '@vonage/server-sdk';
import jwt from 'jsonwebtoken';

// Initialize Vonage client
const vonage = new Vonage({
  apiKey: process.env.VONAGE_API_KEY,
  apiSecret: process.env.VONAGE_API_SECRET,
});

// Generate 4-digit OTP
export const generateOTP = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

// Get OTP expiry time (5 minutes)
export const getOTPExpiry = () => {
  return new Date(Date.now() + 5 * 60 * 1000);
};

// Send OTP via Vonage SMS
export const sendOTPViaVonage = async (phone, otp) => {
  try {
    const sender = process.env.VONAGE_VIRTUAL_NUMBER || 'Vonage';
    const recipient = phone; // 10-digit number without country code
    
    // Format message with OTP
    const message = `Your OTP for FlavorFix login is ${otp}. Valid for 5 minutes. Do not share this OTP with anyone.`;
    
    console.log(`📤 Sending OTP via Vonage to: ${phone}`);
    console.log(`🔢 OTP: ${otp}`);

    // Vonage SMS API call [citation:5]
    const response = await vonage.sms.send({
      to: recipient,
      from: sender,
      text: message
    });

    console.log('✅ Vonage Response:', response);

    // Check response status
    if (response.messages && response.messages[0]) {
      const messageStatus = response.messages[0].status;
      
      if (messageStatus === '0') { // '0' means success in Vonage API
        return { 
          success: true, 
          messageId: response.messages[0]['message-id'],
          remainingBalance: response.messages[0]['remaining-balance'],
          messagePrice: response.messages[0]['message-price']
        };
      } else {
        // Handle specific error codes [citation:5]
        const errorText = response.messages[0]['error-text'] || 'Unknown error';
        return { 
          success: false, 
          error: `Vonage error ${messageStatus}: ${errorText}`
        };
      }
    }

    return { success: false, error: 'Invalid response from Vonage' };

  } catch (error) {
    console.error('❌ Vonage Error Details:', {
      message: error.message,
      response: error.response?.data
    });
    
    // Handle common Vonage errors [citation:5]
    if (error.message?.includes('Non-Whitelisted Destination')) {
      return { 
        success: false, 
        error: 'Demo mode: Add this number to whitelist in Vonage dashboard'
      };
    }
    
    return { 
      success: false, 
      error: error.message || 'Failed to send OTP'
    };
  }
};

// Generate JWT Token
export const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30d'
  });
};