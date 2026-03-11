import axios from 'axios';
import jwt from 'jsonwebtoken';

// Generate 6-digit OTP
export const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// OTP expiry time
export const getOTPExpiry = () => {
    return new Date(Date.now() + 5 * 60 * 1000);
};

// 📤 Send OTP via Fast2SMS (Bulk SMS Service Route)
export const sendOTPViaFast2SMS = async (phone, otp) => {
    try {
        const apiKey = process.env.FAST2SMS_API_KEY;

        const route = process.env.FAST2SMS_ROUTE;
        
        const message = `Your OTP for FlavorFix login is ${otp}. Valid for 5 minutes.`;
        
        console.log(`📤 Sending OTP via Fast2SMS (Quick SMS) to: ${phone}`);
        console.log(`🔢 OTP: ${otp}`);

        const response = await axios({
            method: 'GET',
            url: 'https://www.fast2sms.com/dev/bulkV2',
            params: {
                authorization: apiKey,
                route: route,
                message: message,
                numbers: phone,
                flash: '0'
            },
            timeout: 15000
        });

        console.log('✅ Fast2SMS Response:', response.data);

        // ✅ नया response check code यहाँ paste करना है
        if (response.data) {
            console.log('✅ Fast2SMS Response Data:', response.data);
            
            // Case 1: Agar JSON object hai
            if (typeof response.data === 'object' && response.data.return === true) {
                return { 
                    success: true, 
                    requestId: response.data.request_id,
                    message: 'OTP sent successfully'
                };
            }
            
            // Case 2: Agar string hai (HTML ya text)
            if (typeof response.data === 'string') {
                // Check if it contains success message
                if (response.data.includes('SMS sent successfully') || 
                    response.data.includes('return":true')) {
                    return { 
                        success: true, 
                        message: 'OTP sent successfully'
                    };
                }
            }
        }

        // Agar yahan tak pahuncha to fail
        return { success: false, error: response.data?.message || 'Failed to send OTP' };

    } catch (error) {
        console.error('❌ Fast2SMS Error:', error.message);
        return { success: false, error: error.message };
    }
};

// JWT Token generator
export const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE || '30d'
    });
};