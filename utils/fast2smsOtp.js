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
        
        const message = `Your OTP for FlavorFix login is ${otp}. Valid for 5 minutes.`;
        
        console.log(`📤 Sending OTP via Fast2SMS (Bulk SMS) to: ${phone}`);
        console.log(`🔢 OTP: ${otp}`);

        // ✅ FIXED: Force JSON response
        const response = await axios({
            method: 'GET',
            url: 'https://www.fast2sms.com/dev/bulkV2',
            params: {
                authorization: apiKey,
                route: 's',
                sender_id: 'FSTSMS',
                message: message,
                numbers: phone,
                language: 'english',
                flash: '0'
            },
            headers: {
                'Accept': 'application/json',  // ✅ Force JSON response
                'Cache-Control': 'no-cache'
            },
            timeout: 15000
        });

        console.log('✅ Fast2SMS Response Data:', response.data);

        // अगर response string है तो try करो parse करने का
        if (typeof response.data === 'string') {
            try {
                const parsedData = JSON.parse(response.data);
                console.log('✅ Parsed JSON:', parsedData);
                
                if (parsedData && parsedData.return === true) {
                    return { 
                        success: true, 
                        requestId: parsedData.request_id,
                        message: 'OTP sent successfully'
                    };
                }
            } catch (parseError) {
                console.error('❌ JSON Parse Error:', parseError.message);
                // अगर parse नहीं हो पाया तो original data check करो
                if (response.data.includes('SMS sent successfully')) {
                    return { 
                        success: true, 
                        message: 'OTP sent successfully'
                    };
                }
            }
        }

        // Original response check
        if (response.data && response.data.return === true) {
            return { 
                success: true, 
                requestId: response.data.request_id,
                message: 'OTP sent successfully'
            };
        }

        const errorMsg = response.data?.message || 'Unknown error';
        console.error('❌ Fast2SMS Error:', errorMsg);
        return { success: false, error: errorMsg };

    } catch (error) {
        console.error('❌ Fast2SMS Error Details:', {
            status: error.response?.status,
            data: error.response?.data,
            message: error.message
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