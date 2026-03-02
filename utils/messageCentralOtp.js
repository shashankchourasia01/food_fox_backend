// import axios from 'axios';

// // ============================================
// // STEP 1: GENERATE AUTH TOKEN
// // ============================================
// export const generateAuthToken = async () => {
//     try {
//         const customerId = process.env.MESSAGE_CENTRAL_CUSTOMER_ID;
//         const password = process.env.MESSAGE_CENTRAL_PASSWORD;
        
//         // 🔐 Base64 encode password
//         const base64Password = Buffer.from(password).toString('base64');
        
//         console.log('🔄 Generating auth token...');

//         const response = await axios({
//             method: 'GET',
//             url: `${process.env.MESSAGE_CENTRAL_BASE_URL}/auth/v1/authentication/token`,
//             params: {
//                 customerId: customerId,
//                 key: base64Password,
//                 scope: 'NEW',
//                 country: 'IN',
//                 email: ''
//             },
//             headers: {
//                 'accept': '*/*'
//             }
//         });

//         console.log('✅ Auth token generated');

//         // Response me token directly aata hai ya nested?
//         if (response.data && response.data.token) {
//             return {
//                 success: true,
//                 token: response.data.token
//             };
//         } else if (response.data && response.data.data && response.data.data.authToken) {
//             return {
//                 success: true,
//                 token: response.data.data.authToken
//             };
//         } else {
//             console.error('❌ Unexpected response:', response.data);
//             return { success: false, error: 'Invalid token response' };
//         }

//     } catch (error) {
//         console.error('❌ Error generating token:', error.response?.data || error.message);
//         return { success: false, error: error.response?.data?.message || error.message };
//     }
// };

// // ============================================
// // STEP 2: SEND OTP
// // ============================================
// export const sendOTPViaMessageCentral = async (phone) => {
//     try {
//         // Auth token generate karo
//         const tokenResult = await generateAuthToken();
        
//         if (!tokenResult.success) {
//             return { success: false, error: tokenResult.error };
//         }

//         const response = await axios({
//             method: 'POST',
//             url: `${process.env.MESSAGE_CENTRAL_BASE_URL}/verification/v3/send`,
//             params: {
//                 countryCode: '91',
//                 mobileNumber: phone,
//                 customerId: process.env.MESSAGE_CENTRAL_CUSTOMER_ID,
//                 flowType: 'SMS',
//                 otpLength: 4
//             },
//             headers: {
//                 'authToken': tokenResult.token,
//                 'accept': '*/*'
//             }
//         });

//         console.log('✅ Send OTP Response:', response.data);

//         if (response.data && response.data.data && response.data.data.verificationId) {
//             return {
//                 success: true,
//                 verificationId: response.data.data.verificationId,
//                 message: response.data.message
//             };
//         } else {
//             return { success: false, error: 'No verificationId in response' };
//         }

//     } catch (error) {
//         console.error('❌ Error sending OTP:', error.response?.data || error.message);
        
//         // Error codes handle karo
//         const errorCode = error.response?.data?.responseCode;
//         if (errorCode === 800) {
//             return { success: false, error: 'Daily limit reached' };
//         } else if (errorCode === 501) {
//             return { success: false, error: 'Invalid customer ID' };
//         }
        
//         return { success: false, error: error.response?.data?.message || error.message };
//     }
// };

// // ============================================
// // STEP 3: VALIDATE OTP
// // ============================================
// export const validateOTPViaMessageCentral = async (verificationId, otp, phone) => {
//     try {
//         const tokenResult = await generateAuthToken();
        
//         if (!tokenResult.success) {
//             return { success: false, error: tokenResult.error };
//         }

//         const response = await axios({
//             method: 'GET',
//             url: `${process.env.MESSAGE_CENTRAL_BASE_URL}/verification/v3/validateOtp`,
//             params: {
//                 verificationId: verificationId,
//                 code: otp,
//                 countryCode: '91',
//                 mobileNumber: phone,
//                 customerId: process.env.MESSAGE_CENTRAL_CUSTOMER_ID
//             },
//             headers: {
//                 'authToken': tokenResult.token,
//                 'accept': '*/*'
//             }
//         });

//         console.log('✅ Validate OTP Response:', response.data);

//         // Check verification status
//         if (response.data && response.data.message === 'SUCCESS') {
//             return { success: true };
//         } else {
//             return { success: false, error: 'Verification failed' };
//         }

//     } catch (error) {
//         console.error('❌ Error validating OTP:', error.response?.data || error.message);
        
//         // Error codes handle karo
//         const errorCode = error.response?.data?.responseCode;
//         if (errorCode === 702) {
//             return { success: false, error: 'Wrong OTP' };
//         } else if (errorCode === 705) {
//             return { success: false, error: 'OTP expired' };
//         }
        
//         return { success: false, error: error.response?.data?.message || error.message };
//     }
// };

// // ============================================
// // Helper Functions
// // ============================================
// export const generateOTP = () => {
//     return Math.floor(1000 + Math.random() * 9000).toString();
// };

// export const getOTPExpiry = () => {
//     return new Date(Date.now() + 5 * 60 * 1000);
// };

// export const generateToken = (id) => {
//     return jwt.sign({ id }, process.env.JWT_SECRET, {
//         expiresIn: process.env.JWT_EXPIRE || '30d'
//     });
// };