import axios from 'axios';
import jwt from 'jsonwebtoken';

// Generate 6-digit OTP
export const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit
};

// OTP expiry time
export const getOTPExpiry = () => {
    return new Date(Date.now() + 5 * 60 * 1000);
};

// 📤 Send OTP via Fast2SMS (Direct Axios GET request)
export const sendOTPViaFast2SMS = async (phone, otp) => {
    try {
        const apiKey = process.env.FAST2SMS_API_KEY;
        
        // Message with OTP
        const message = `Your OTP for FlavorFix login is ${otp}. Valid for 5 minutes.`;
        
        console.log(`📤 Sending OTP via Fast2SMS (Quick SMS) to: ${phone}`);
        console.log(`🔢 OTP: ${otp}`);

        // ✅ FIXED: Direct axios GET request with query parameters
        const response = await axios({
            method: 'GET',
            url: 'https://www.fast2sms.com/dev/bulkV2',
            params: {
                authorization: apiKey,
                route: 'q',                    // 'q' for Quick SMS (DLT-Free)
                message: message,               // Message text
                numbers: phone,                  // Single number (not array)
                flash: '0'                       // 0 for normal SMS
            },
            timeout: 10000 // 10 seconds timeout
        });

        console.log('✅ Fast2SMS Response:', JSON.stringify(response.data, null, 2));

        // Fast2SMS returns { return: true, request_id: '...' } on success
        if (response.data && response.data.return === true) {
            return { 
                success: true, 
                requestId: response.data.request_id,
                message: 'OTP sent successfully'
            };
        } else {
            // Handle specific error messages
            const errorMsg = response.data?.message || 'Unknown error';
            
            if (errorMsg.includes('insufficient balance')) {
                return { success: false, error: 'Insufficient balance. Please recharge.' };
            }
            
            if (errorMsg.includes('API Key')) {
                return { success: false, error: 'Invalid API Key. Check your Fast2SMS API key.' };
            }
            
            if (errorMsg.includes('route')) {
                return { success: false, error: 'Invalid route. Make sure route is "q" for Quick SMS.' };
            }
            
            return { success: false, error: errorMsg };
        }

    } catch (error) {
        console.error('❌ Fast2SMS Error Details:', {
            status: error.response?.status,
            data: error.response?.data,
            message: error.message
        });
        
        // Handle 401 Unauthorized (API key invalid)
        if (error.response?.status === 401) {
            return { success: false, error: 'Invalid API key. Please check your Fast2SMS API key.' };
        }
        
        // Handle 408 Timeout
        if (error.response?.status === 408 || error.code === 'ECONNABORTED') {
            return { success: false, error: 'Request timeout. Fast2SMS server not responding.' };
        }
        
        return { success: false, error: error.response?.data?.message || error.message };
    }
};

// JWT Token generator
export const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE || '30d'
    });
};











// import fast2sms from 'fast-two-sms';
// import jwt from 'jsonwebtoken';

// // Generate 6-digit OTP
// export const generateOTP = () => {
//     return Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit
// };

// // OTP expiry time
// export const getOTPExpiry = () => {
//     return new Date(Date.now() + 5 * 60 * 1000);
// };

// // 📤 Send OTP via Fast2SMS (DLT-Free Version)
// export const sendOTPViaFast2SMS = async (phone, otp) => {
//     try {
//         const apiKey = process.env.FAST2SMS_API_KEY;
        
//         // ✅ DLT-Free Settings
//         const message = `Your OTP for FlavorFix login is ${otp}. Valid for 5 minutes.`;
        
//         console.log(`📤 Sending OTP via Fast2SMS (Quick SMS) to: ${phone}`);
//         console.log(`🔢 OTP: ${otp}`);

//         // ✅ Quick SMS Route - NO DLT REQUIRED
//         const options = {
//             authorization: apiKey,
//             message: message,
//             numbers: [phone],        // Array of numbers
//             route: 'q',               // 'q' for Quick SMS (DLT-Free) - सबसे important
//             sender_id: 'FSTSMS',      // Optional for Quick SMS
//             flash: '0'                 // 0 for normal SMS
//         };

//         console.log('📤 Sending request to Fast2SMS...');

//         // Send message using fast-two-sms package
//         const response = await fast2sms.sendMessage(options);
//         console.log('✅ Fast2SMS Response:', JSON.stringify(response, null, 2));

//         // Fast2SMS returns { return: true, request_id: '...' } on success
//         if (response && response.return === true) {
//             return {
//                 success: true,
//                 requestId: response.request_id,
//                 data: response
//             };
//         } else {
//             // Check for specific error messages
//             const errorMsg = response?.message || 'Unknown error';
            
//             if (errorMsg.includes('insufficient balance')) {
//                 return { 
//                     success: false, 
//                     error: 'Insufficient balance. Please recharge.'
//                 };
//             }
            
//             if (errorMsg.includes('API Key')) {
//                 return { 
//                     success: false, 
//                     error: 'Invalid API Key. Check your Fast2SMS API key.'
//                 };
//             }
            
//             return {
//                 success: false,
//                 error: errorMsg
//             };
//         }

//     } catch (error) {
//         console.error('❌ Fast2SMS Exception:', error);
//         console.error('❌ Error details:', error.response?.data || error.message);
        
//         return {
//             success: false,
//             error: error.message || 'Failed to send OTP'
//         };
//     }
// };

// // JWT Token generator
// export const generateToken = (id) => {
//     return jwt.sign({ id }, process.env.JWT_SECRET, {
//         expiresIn: process.env.JWT_EXPIRE || '30d'
//     });
// };