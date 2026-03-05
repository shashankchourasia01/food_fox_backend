// import { Vonage } from '@vonage/server-sdk';
// import jwt from 'jsonwebtoken';

// // Initialize Vonage client
// const vonage = new Vonage({
//   apiKey: process.env.VONAGE_API_KEY,
//   apiSecret: process.env.VONAGE_API_SECRET,
// });

// // Generate 4-digit OTP
// export const generateOTP = () => {
//   return Math.floor(1000 + Math.random() * 9000).toString();
// };

// // Get OTP expiry time (5 minutes)
// export const getOTPExpiry = () => {
//   return new Date(Date.now() + 5 * 60 * 1000);
// };

// // 📌 STEP 1: Start Verification (Send OTP)
// export const startVerification = async (phone) => {
//   try {
//     const number = `91${phone}`;  // India country code
//     const brand = process.env.VONAGE_BRAND || 'FlavorFix';
    
//     console.log(`📤 Starting verification for: ${number}`);

//     // As per docs: vonage.verify.start()
//     const response = await vonage.verify.start({
//       number: number,
//       brand: brand,
//       code_length: 4,  // 4-digit OTP
//       pin_code_type: 'NUMERIC',  // Numeric OTP
//       workflow_id: 1,  // 1 = SMS -> TTS (SMS then voice call fallback)
//       // workflow 1: SMS -> TTS (Text-to-Speech voice call)
//       // workflow 2: SMS -> SMS -> TTS
//       // workflow 3: TTS -> TTS
//       // workflow 4: SMS -> SMS
//       // workflow 5: SMS -> TTS
//       // workflow 6: SMS
//     });

//     console.log('✅ Verify API Response:', response);

//     if (response && response.request_id) {
//       return {
//         success: true,
//         requestId: response.request_id,
//         status: response.status
//       };
//     } else {
//       throw new Error('Invalid response from Verify API');
//     }

//   } catch (error) {
//     console.error('❌ Verify API Error:', error);
    
//     // Extract error details
//     const errorDetail = error.response?.data || error.message;
//     console.error('Error details:', errorDetail);
    
//     return {
//       success: false,
//       error: errorDetail
//     };
//   }
// };

// // 📌 STEP 2: Check Verification (Verify OTP)
// export const checkVerification = async (requestId, code) => {
//   try {
//     console.log(`🔍 Checking verification for request: ${requestId}`);

//     // As per docs: vonage.verify.check()
//     const response = await vonage.verify.check(requestId, code);

//     console.log('✅ Verify Check Response:', response);

//     if (response && response.status === 'COMPLETED') {
//       return {
//         success: true,
//         data: response
//       };
//     } else {
//       return {
//         success: false,
//         error: response?.error_text || 'Verification failed'
//       };
//     }

//   } catch (error) {
//     console.error('❌ Verify Check Error:', error);
//     return {
//       success: false,
//       error: error.message
//     };
//   }
// };

// // 📌 OPTIONAL: Cancel Verification
// export const cancelVerification = async (requestId) => {
//   try {
//     const response = await vonage.verify.cancel(requestId);
//     console.log('✅ Verification cancelled:', response);
//     return { success: true };
//   } catch (error) {
//     console.error('❌ Cancel error:', error);
//     return { success: false, error: error.message };
//   }
// };

// // Generate JWT Token (same as before)
// export const generateToken = (id) => {
//   return jwt.sign({ id }, process.env.JWT_SECRET, {
//     expiresIn: process.env.JWT_EXPIRE || '30d'
//   });
// };