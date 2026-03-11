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
        
        // Message with OTP
        const message = `Your OTP for FlavorFix login is ${otp}. Valid for 5 minutes.`;
        
        console.log(`📤 Sending OTP via Fast2SMS (Bulk SMS) to: ${phone}`);
        console.log(`🔢 OTP: ${otp}`);

        // ✅ FIXED: Bulk SMS Service Route Parameters
        const response = await axios({
            method: 'GET',
            url: 'https://www.fast2sms.com/dev/bulkV2',
            params: {
                authorization: apiKey,
                route: 's',                    // 's' for Bulk SMS Service
                sender_id: 'FSTSMS',           // Fast2SMS pre-approved sender ID
                message: message,
                numbers: phone,                 // Single number
                language: 'english',            // Required for 's' route
                flash: '0'
            },
            timeout: 15000,
            headers: {
                'Cache-Control': 'no-cache'
            }
        });

        console.log('✅ Fast2SMS Raw Response:', response);
        console.log('✅ Fast2SMS Data:', JSON.stringify(response.data, null, 2));

        // Fast2SMS returns { return: true, request_id: '...' } on success
        if (response.data && response.data.return === true) {
            return { 
                success: true, 
                requestId: response.data.request_id,
                message: 'OTP sent successfully'
            };
        } else {
            const errorMsg = response.data?.message || 'Unknown error';
            console.error('❌ Fast2SMS Error:', errorMsg);
            return { success: false, error: errorMsg };
        }

    } catch (error) {
        console.error('❌ Fast2SMS Error Details:', {
            status: error.response?.status,
            data: error.response?.data,
            message: error.message,
            stack: error.stack
        });
        
        return { success: false, error: error.message };
    }
};

// JWT Token generator
export const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE || '30d'
    });
};