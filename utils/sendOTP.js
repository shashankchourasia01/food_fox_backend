import axios from 'axios';

// For MSG91
export const sendOTP = async (phone, otp) => {
  try {
    const response = await axios.get('https://api.msg91.com/api/sendhttp.php', {
      params: {
        authkey: process.env.MSG91_AUTH_KEY,
        mobiles: `91${phone}`,
        message: `Your OTP for FlavorFix is ${otp}. Valid for 5 minutes.`,
        sender: process.env.MSG91_SENDER_ID,
        route: '4'
      }
    });
    
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Error sending OTP:', error);
    return { success: false, error: error.message };
  }
};

// Generate 4-digit OTP
export const generateOTP = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};