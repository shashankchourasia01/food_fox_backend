/**
 * Email OTP - FREE alternative to SMS OTP
 * Uses nodemailer with SMTP (Gmail, Outlook, or any SMTP).
 * Zero per-OTP cost - ideal for cost-sensitive deployments.
 */

import nodemailer from 'nodemailer';

const OTP_BRAND_NAME = 'Saraswati Tiffin';

// Reuse generateOTP and getOTPExpiry from fast2smsOtp for consistency
export { generateOTP, getOTPExpiry } from './fast2smsOtp.js';

export const sendOTPViaEmail = async (email, otp) => {
    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM || (user ? `Saraswati Tiffin <${user}>` : 'Saraswati Tiffin');

    if (!host || !user || !pass) {
        if (process.env.NODE_ENV === 'development') {
            console.log(`[OTP] Email not configured. Would send to ${email}: ${otp}`);
            return { success: true, message: 'OTP (dev fallback)' };
        }
        return { success: false, error: 'Email service not configured. Add SMTP_HOST, SMTP_USER, SMTP_PASS to .env' };
    }

    try {
        const transporter = nodemailer.createTransport({
            host,
            port: parseInt(process.env.SMTP_PORT || '587', 10),
            secure: process.env.SMTP_SECURE === 'true',
            auth: { user, pass }
        });

        await transporter.sendMail({
            from,
            to: email,
            subject: `Your login OTP - ${OTP_BRAND_NAME}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 400px; margin: 0 auto;">
                    <h2 style="color: #dc2626;">${OTP_BRAND_NAME}</h2>
                    <p>Your one-time password for login is:</p>
                    <p style="font-size: 24px; font-weight: bold; letter-spacing: 4px; color: #1f2937;">${otp}</p>
                    <p style="color: #6b7280; font-size: 14px;">Valid for 5 minutes. Do not share with anyone.</p>
                    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
                    <p style="color: #9ca3af; font-size: 12px;">This is an automated message from ${OTP_BRAND_NAME}.</p>
                </div>
            `,
            text: `Your OTP for ${OTP_BRAND_NAME} login is ${otp}. Valid for 5 minutes.`
        });

        return { success: true, message: 'OTP sent to email' };
    } catch (error) {
        console.error('[OTP] Email send error:', error.message);
        return { success: false, error: error.message };
    }
};
