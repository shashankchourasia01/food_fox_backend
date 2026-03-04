// // import axios from 'axios';
// // import jwt from 'jsonwebtoken';

// // // Generate 4-digit OTP
// // export const generateOTP = () => {
// //     return Math.floor(1000 + Math.random() * 9000).toString();
// // };

// // // Get OTP expiry time (5 minutes)
// // export const getOTPExpiry = () => {
// //     return new Date(Date.now() + 5 * 60 * 1000);
// // };

// // // ✅ Send OTP via Fast2SMS - QUICK SMS Route
// // export const sendOTPViaFast2SMS = async (phone, otp) => {
// //     try {
// //         const apiKey = process.env.FAST2SMS_API_KEY;
        
// //         // Custom message with OTP
// //         const message = `Your OTP for FlavorFix login is ${otp}. Valid for 5 minutes. Do not share this OTP with anyone.`;
        
// //         console.log(`📤 Sending OTP via Fast2SMS (Quick SMS) to: ${phone}`);
// //         console.log(`🔢 OTP: ${otp}`);
        
// //         // ✅ Fast2SMS Quick SMS API call with axios
// //         const response = await axios({
// //             method: 'GET',
// //             url: 'https://www.fast2sms.com/dev/bulkV2',
// //             params: {
// //                 authorization: apiKey,
// //                 route: 'q',                    // 'q' for Quick SMS
// //                 message: message,               // Custom message
// //                 numbers: 9304637399,                 // Phone number
// //                 flash: '0'                      // 0 for normal SMS
// //             }
// //         });

// //         console.log('✅ Fast2SMS Response:', response.data);

// //         // Fast2SMS returns { return: true, request_id: '...' } on success
// //         if (response.data && response.data.return === true) {
// //             return { 
// //                 success: true, 
// //                 requestId: response.data.request_id,
// //                 message: 'OTP sent successfully'
// //             };
// //         } else {
// //             // Check for specific error messages
// //             if (response.data?.message?.includes('insufficient balance')) {
// //                 return { 
// //                     success: false, 
// //                     error: 'Insufficient balance. Please recharge.'
// //                 };
// //             }
// //             return { 
// //                 success: false, 
// //                 error: response.data?.message || 'Failed to send OTP'
// //             };
// //         }

// //     } catch (error) {
// //         console.error('❌ Fast2SMS Error Details:', {
// //             status: error.response?.status,
// //             data: error.response?.data,
// //             message: error.message
// //         });
        
// //         // Handle 401 Unauthorized (API key invalid)
// //         if (error.response?.status === 401) {
// //             return { 
// //                 success: false, 
// //                 error: 'Invalid API key. Please check your Fast2SMS API key.'
// //             };
// //         }
        
// //         return { 
// //             success: false, 
// //             error: error.response?.data?.message || error.message 
// //         };
// //     }
// // };

// // // Generate JWT Token
// // export const generateToken = (id) => {
// //     return jwt.sign({ id }, process.env.JWT_SECRET, {
// //         expiresIn: process.env.JWT_EXPIRE || '30d'
// //     });
// // };



// import axios from 'axios';
// import jwt from 'jsonwebtoken';

// // Generate 4-digit OTP
// export const generateOTP = () => {
//     return Math.floor(1000 + Math.random() * 9000).toString();
// };

// // Get OTP expiry time (5 minutes)
// export const getOTPExpiry = () => {
//     return new Date(Date.now() + 5 * 60 * 1000);
// };

// // ✅ FIXED: Send OTP via Fast2SMS - POST Request with Headers
// export const sendOTPViaFast2SMS = async (phone, otp) => {
//     try {
//         const apiKey = process.env.FAST2SMS_API_KEY;
        
//         // Custom message with OTP
//         const message = `Your OTP for FlavorFix login is ${otp}. Valid for 5 minutes. Do not share this OTP with anyone.`;
        
//         console.log(`📤 Sending OTP via Fast2SMS (POST) to: ${phone}`);
//         console.log(`🔢 OTP: ${otp}`);
//         console.log(`🔑 Using API Key: ${apiKey.substring(0, 5)}...`);
        
//         // ✅ Fast2SMS POST request with headers
//         const response = await axios({
//             method: 'POST',
//             url: 'https://www.fast2sms.com/dev/bulkV2',
//             headers: {
//                 'authorization': apiKey,        // API key in headers (as per docs)
//                 'Content-Type': 'application/json'
//             },
//             data: {
//                 route: 'q',                     // 'q' for Quick SMS
//                 message: message,                // Custom message
//                 numbers: 9304637399,                  // Phone number
//                 flash: '0'                       // 0 for normal SMS
//             }
//         });

//         console.log('✅ Fast2SMS Response:', response.data);

//         // Fast2SMS returns { return: true, request_id: '...' } on success
//         if (response.data && response.data.return === true) {
//             return { 
//                 success: true, 
//                 requestId: response.data.request_id,
//                 message: 'OTP sent successfully'
//             };
//         } else {
//             // Check for specific error messages
//             if (response.data?.message?.includes('insufficient balance')) {
//                 return { 
//                     success: false, 
//                     error: 'Insufficient balance. Please recharge.'
//                 };
//             }
//             return { 
//                 success: false, 
//                 error: response.data?.message || 'Failed to send OTP'
//             };
//         }

//     } catch (error) {
//         console.error('❌ Fast2SMS Error Details:', {
//             status: error.response?.status,
//             data: error.response?.data,
//             message: error.message
//         });
        
//         // Handle 401 Unauthorized (API key invalid)
//         if (error.response?.status === 401) {
//             return { 
//                 success: false, 
//                 error: 'Invalid API key. Please check your Fast2SMS API key.'
//             };
//         }
        
//         // Handle 403 Forbidden (Account issues)
//         if (error.response?.status === 403) {
//             return { 
//                 success: false, 
//                 error: 'Account not activated or DLT issue. Please contact Fast2SMS support.'
//             };
//         }
        
//         return { 
//             success: false, 
//             error: error.response?.data?.message || error.message 
//         };
//     }
// };

// // Generate JWT Token
// export const generateToken = (id) => {
//     return jwt.sign({ id }, process.env.JWT_SECRET, {
//         expiresIn: process.env.JWT_EXPIRE || '30d'
//     });
// };