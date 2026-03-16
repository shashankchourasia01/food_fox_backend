import axios from 'axios';
import jwt from 'jsonwebtoken';

// OTP config
const OTP_BRAND_NAME = 'Saraswati Tiffin';
const SMS_RETRY_ATTEMPTS = 3;
const SMS_RETRY_DELAY_MS = 1000;

// DLT route uses consistent sender ID (e.g. SRSTFN). Set in .env for consistent branding.
// Requires: DLT registration, approved sender, approved template.
const USE_DLT_ROUTE = !!(process.env.FAST2SMS_SENDER_ID && process.env.FAST2SMS_DLT_TEMPLATE_ID);

// Generate 6-digit OTP
export const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// OTP expiry time (5 minutes)
export const getOTPExpiry = () => {
    return new Date(Date.now() + 5 * 60 * 1000);
};

// Log OTP events for debugging (avoid logging OTP in production)
const logOTPEvent = (event, data) => {
    const logData = { timestamp: new Date().toISOString(), ...data };
    if (process.env.NODE_ENV === 'development') {
        console.log(`[OTP] ${event}:`, JSON.stringify(logData));
    } else {
        console.log(`[OTP] ${event}:`, JSON.stringify({ ...logData, otp: '[REDACTED]' }));
    }
};

// 📤 Send OTP via Fast2SMS (Bulk SMS Service Route) with retry logic
export const sendOTPViaFast2SMS = async (phone, otp) => {
    const apiKey = process.env.FAST2SMS_API_KEY;
    
    if (!apiKey) {
        logOTPEvent('OTP_SEND_FAIL', { phone, error: 'FAST2SMS_API_KEY not configured' });
        return { success: false, error: 'SMS service not configured' };
    }

    let lastError = null;
    
    for (let attempt = 1; attempt <= SMS_RETRY_ATTEMPTS; attempt++) {
        try {
            logOTPEvent('OTP_SEND_ATTEMPT', { phone, attempt, maxAttempts: SMS_RETRY_ATTEMPTS, route: USE_DLT_ROUTE ? 'dlt' : 'q' });

            let response;
            if (USE_DLT_ROUTE) {
                // DLT route: consistent sender ID (e.g. SRSTFN). Requires DLT-approved template.
                // Template vars order must match: e.g. "Your OTP for {#var#} is {#var#}" -> "Saraswati Tiffin|123456"
                response = await axios({
                    method: 'POST',
                    url: 'https://www.fast2sms.com/dev/bulkV2',
                    headers: { authorization: apiKey },
                    data: {
                        sender_id: process.env.FAST2SMS_SENDER_ID,
                        message: process.env.FAST2SMS_DLT_TEMPLATE_ID,
                        variables_values: `${OTP_BRAND_NAME}|${otp}`,
                        route: 'dlt',
                        numbers: phone,
                        flash: '0'
                    },
                    timeout: 15000
                });
            } else {
                // Quick SMS route: random sender names. Use DLT route for consistent "Saraswati Tiffin" sender.
                response = await axios({
                    method: 'GET',
                    url: 'https://www.fast2sms.com/dev/bulkV2',
                    params: {
                        authorization: apiKey,
                        route: 'q',
                        message: `Your OTP for ${OTP_BRAND_NAME} login is ${otp}. Valid for 5 minutes.`,
                        numbers: phone,
                        flash: '0'
                    },
                    timeout: 15000
                });
            }

            if (response.data) {
                if (typeof response.data === 'object' && response.data.return === true) {
                    logOTPEvent('OTP_SEND_SUCCESS', { phone, requestId: response.data.request_id });
                    return { 
                        success: true, 
                        requestId: response.data.request_id,
                        message: 'OTP sent successfully'
                    };
                }
                if (typeof response.data === 'string' && 
                    (response.data.includes('SMS sent successfully') || response.data.includes('return":true'))) {
                    logOTPEvent('OTP_SEND_SUCCESS', { phone });
                    return { success: true, message: 'OTP sent successfully' };
                }
            }

            lastError = response.data?.message || 'Failed to send OTP';

        } catch (error) {
            lastError = error.response?.data?.message || error.message;
            logOTPEvent('OTP_SEND_ERROR', { 
                phone, 
                attempt, 
                error: lastError,
                statusCode: error.response?.status 
            });
            
            if (attempt < SMS_RETRY_ATTEMPTS) {
                await new Promise(resolve => setTimeout(resolve, SMS_RETRY_DELAY_MS * attempt));
            }
        }
    }

    logOTPEvent('OTP_SEND_FAIL_FINAL', { phone, error: lastError });
    return { success: false, error: lastError };
};

// JWT Token generator
export const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE || '30d'
    });
};