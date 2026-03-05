// // import { Vonage } from '@vonage/server-sdk';
// // import jwt from 'jsonwebtoken';

// // import dotenv from 'dotenv';

// // // 🔍 Force reload environment variables
// // dotenv.config();

// // console.log('🔍 Vonage ENV Check:');
// // console.log('   VONAGE_API_KEY exists:', !!process.env.VONAGE_API_KEY);
// // console.log('   VONAGE_API_KEY value:', process.env.VONAGE_API_KEY ? `${process.env.VONAGE_API_KEY.substring(0,5)}...` : '❌ Missing');
// // console.log('   VONAGE_API_SECRET exists:', !!process.env.VONAGE_API_SECRET);

// // // Initialize Vonage client
// // const vonage = new Vonage({
// //   apiKey: process.env.VONAGE_API_KEY,
// //   apiSecret: process.env.VONAGE_API_SECRET,
// // });

// // // Generate 4-digit OTP
// // export const generateOTP = () => {
// //   return Math.floor(1000 + Math.random() * 9000).toString();
// // };

// // // Get OTP expiry time (5 minutes)
// // export const getOTPExpiry = () => {
// //   return new Date(Date.now() + 5 * 60 * 1000);
// // };

// // // Send OTP via Vonage SMS
// // export const sendOTPViaVonage = async (phone, otp) => {
// //   try {
// //     const sender = process.env.VONAGE_VIRTUAL_NUMBER || 'Vonage';
// //     const recipient = `91${phone}`;
    
// //     // Format message with OTP
// //     const message = `Your OTP for FlavorFix login is ${otp}. Valid for 5 minutes. Do not share this OTP with anyone.`;
    
// //     console.log(`📤 Sending OTP via Vonage to: ${phone}`);
// //     console.log(`🔢 OTP: ${otp}`);

// //     // Vonage SMS API call [citation:5]
// //     // Vonage SMS API call
// // console.log('📤 Sending request to Vonage...');
// // const response = await vonage.sms.send({
// //   to: recipient,
// //   from: sender,
// //   text: message
// // });

// // console.log('✅ Vonage Full Response:', JSON.stringify(response, null, 2));

// // // Check response status
// // if (response.messages && response.messages[0]) {
// //   const messageStatus = response.messages[0].status;
// //   console.log('📊 Message Status:', messageStatus);
  
// //   if (messageStatus === '0') { // '0' means success in Vonage API
// //     return { 
// //       success: true, 
// //       messageId: response.messages[0]['message-id'],
// //       remainingBalance: response.messages[0]['remaining-balance'],
// //       messagePrice: response.messages[0]['message-price']
// //     };
// //   } else {
// //     const errorText = response.messages[0]['error-text'] || 'Unknown error';
// //     console.error('❌ Vonage error:', errorText);
// //     return { 
// //       success: false, 
// //       error: `Vonage error ${messageStatus}: ${errorText}`
// //     };
// //   }
// // }

// //     return { success: false, error: 'Invalid response from Vonage' };

// //   } catch (error) {
// //     console.error('❌ Vonage Error Details:', {
// //       message: error.message,
// //       response: error.response?.data
// //     });
    
// //     // Handle common Vonage errors [citation:5]
// //     if (error.message?.includes('Non-Whitelisted Destination')) {
// //       return { 
// //         success: false, 
// //         error: 'Demo mode: Add this number to whitelist in Vonage dashboard'
// //       };
// //     }
    
// //     return { 
// //       success: false, 
// //       error: error.message || 'Failed to send OTP'
// //     };
// //   }
// // };

// // // Generate JWT Token
// // export const generateToken = (id) => {
// //   return jwt.sign({ id }, process.env.JWT_SECRET, {
// //     expiresIn: process.env.JWT_EXPIRE || '30d'
// //   });
// // };

// // // ✅ Test function to verify client is working
// // export const testVonageConnection = () => {
// //   console.log('📞 Vonage client is ready to send OTPs');
// //   return true;
// // };


// import { Vonage } from '@vonage/server-sdk';
// import jwt from 'jsonwebtoken';
// import dotenv from 'dotenv';

// // Force load environment variables
// dotenv.config();

// console.log('🔧 Initializing Vonage client...');
// console.log('   API Key from env:', process.env.VONAGE_API_KEY ? '✅ Present' : '❌ Missing');
// console.log('   API Key value:', process.env.VONAGE_API_KEY ? process.env.VONAGE_API_KEY.substring(0,5) + '...' : 'none');

// // Create Vonage client with explicit values
// const vonage = new Vonage({
//   apiKey: process.env.VONAGE_API_KEY,
//   apiSecret: process.env.VONAGE_API_SECRET,
// });

// console.log('✅ Vonage client created');

// // Generate 4-digit OTP
// export const generateOTP = () => {
//   return Math.floor(1000 + Math.random() * 9000).toString();
// };

// // Get OTP expiry time (5 minutes)
// export const getOTPExpiry = () => {
//   return new Date(Date.now() + 5 * 60 * 1000);
// };

// // Send OTP via Vonage SMS
// // Send OTP via Vonage SMS
// export const sendOTPViaVonage = async (phone, otp) => {
//   try {
//     const sender = process.env.VONAGE_VIRTUAL_NUMBER || 'Vonage';
//     const recipient = `91${phone}`;
//     const message = `${otp} is your OTP.`;

//     console.log(`Sending request to Vonage for: ${recipient}`);

//     // 1. Send the request
//     const response = await vonage.sms.send({
//       to: recipient,
//       from: sender,
//       text: message
//     });

//     // 2. Log the FULL successful response to see the status
//     console.log('✅ Full API Response:', JSON.stringify(response, null, 2));

//     // 3. Check the message status from the response
//     if (response.messages && response.messages[0]) {
//       const status = response.messages[0].status;
//       const errorText = response.messages[0]['error-text'];
//       console.log('📊 Status from response:', status, '-', errorText);

//       if (status === '0') {
//         return { success: true };
//       } else {
//         return { success: false, error: `Vonage API Error ${status}: ${errorText}` };
//       }
//     }

//   } catch (error) {
//     // ⚠️ THIS IS THE IMPORTANT PART - CATCH THE SDK ERROR
//     console.error('❌ SDK threw an error! Details:');
//     console.error('   - Error message:', error.message);
//     console.error('   - Error status code:', error.status); // Often contains the code
//     // Log the entire error object to find any hidden properties
//     console.error('   - Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));

//     return {
//       success: false,
//       error: `Vonage SDK Error: ${error.message}`
//     };
//   }
// };

// // Generate JWT Token
// export const generateToken = (id) => {
//   return jwt.sign({ id }, process.env.JWT_SECRET, {
//     expiresIn: process.env.JWT_EXPIRE || '30d'
//   });
// };