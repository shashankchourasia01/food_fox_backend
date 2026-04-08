import axios from 'axios';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

export const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

export const getOTPExpiry = () => {
    return new Date(Date.now() + 5 * 60 * 1000);
};

export const sendOTPViaFast2SMS = async (phone, otp) => {
    try {
        const apiKey = process.env.FAST2SMS_API_KEY;
        
        const message = `Your OTP for FlavorFix login is ${otp}. Valid for 5 minutes.`;
        
        console.log(`📤 Sending OTP via Fast2SMS (Quick SMS) to: ${phone}`);
        console.log(`🔢 OTP: ${otp}`);

        const response = await axios({
            method: 'GET',
            url: 'https://www.fast2sms.com/dev/bulkV2',
            params: {
                authorization: apiKey,
                route: 'q',
                message: message,
                numbers: phone,
                flash: '0'
            },
            timeout: 15000
        });

        console.log('✅ Fast2SMS Response:', response.data);

        if (response.data) {
            console.log('✅ Fast2SMS Response Data:', response.data);
            
            if (typeof response.data === 'object' && response.data.return === true) {
                return { 
                    success: true, 
                    requestId: response.data.request_id,
                    message: 'OTP sent successfully'
                };
            }
            
            if (typeof response.data === 'string') {
                if (response.data.includes('SMS sent successfully') || 
                    response.data.includes('return":true')) {
                    return { 
                        success: true, 
                        message: 'OTP sent successfully'
                    };
                }
            }
        }

        return { success: false, error: response.data?.message || 'Failed to send OTP' };

    } catch (error) {
        console.error('❌ Fast2SMS Error:', error.message);
        return { success: false, error: error.message };
    }
};

export const generateToken = (id) => {
    return jwt.sign(
        { id, jti: crypto.randomUUID() },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '30d' }
    );
};