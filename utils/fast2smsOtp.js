import fast2sms from 'fast-two-sms';
import jwt from 'jsonwebtoken';

// Generate 6-digit OTP
export const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit
};

// OTP expiry time
export const getOTPExpiry = () => {
    return new Date(Date.now() + 5 * 60 * 1000);
};

// 📤 Send OTP via Fast2SMS (DLT-Free Version)
export const sendOTPViaFast2SMS = async (phone, otp) => {
    try {
        const apiKey = process.env.FAST2SMS_API_KEY;
        
        // ✅ DLT-Free Settings
        const message = `Your OTP for FlavorFix login is ${otp}. Valid for 5 minutes.`;
        
        console.log(`📤 Sending OTP via Fast2SMS (Quick SMS) to: ${phone}`);
        console.log(`🔢 OTP: ${otp}`);

        // ✅ Quick SMS Route - NO DLT REQUIRED
        const options = {
            authorization: apiKey,
            message: message,
            numbers: [phone],        // Array of numbers
            route: 'q',               // 'q' for Quick SMS (DLT-Free) - सबसे important
            sender_id: 'FSTSMS',      // Optional for Quick SMS
            flash: '0'                 // 0 for normal SMS
        };

        console.log('📤 Sending request to Fast2SMS...');

        // Send message using fast-two-sms package
        const response = await fast2sms.sendMessage(options);
        console.log('✅ Fast2SMS Response:', JSON.stringify(response, null, 2));

        // Fast2SMS returns { return: true, request_id: '...' } on success
        if (response && response.return === true) {
            return {
                success: true,
                requestId: response.request_id,
                data: response
            };
        } else {
            // Check for specific error messages
            const errorMsg = response?.message || 'Unknown error';
            
            if (errorMsg.includes('insufficient balance')) {
                return { 
                    success: false, 
                    error: 'Insufficient balance. Please recharge.'
                };
            }
            
            if (errorMsg.includes('API Key')) {
                return { 
                    success: false, 
                    error: 'Invalid API Key. Check your Fast2SMS API key.'
                };
            }
            
            return {
                success: false,
                error: errorMsg
            };
        }

    } catch (error) {
        console.error('❌ Fast2SMS Exception:', error);
        console.error('❌ Error details:', error.response?.data || error.message);
        
        return {
            success: false,
            error: error.message || 'Failed to send OTP'
        };
    }
};

// JWT Token generator
export const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE || '30d'
    });
};