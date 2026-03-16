/**
 * OTP Rate Limit Middleware
 * Prevents OTP spam while allowing multi-device login:
 * max 6 OTP requests per phone/email per 15 minutes
 * (e.g. 2 devices × 2 send + 2 resend = 6)
 * In-memory store - for multi-instance deployment, use Redis
 */

const otpAttempts = new Map();
const OTP_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_OTP_PER_WINDOW = 6;

const cleanup = () => {
    const now = Date.now();
    for (const [key, data] of otpAttempts.entries()) {
        if (now - data.firstAttempt > OTP_WINDOW_MS) {
            otpAttempts.delete(key);
        }
    }
};

// Cleanup every 5 minutes
setInterval(cleanup, 5 * 60 * 1000);

export const otpRateLimit = (req, res, next) => {
    const phone = req.body?.phone;
    const email = req.body?.email;
    const identifier = phone || email;
    if (!identifier) return next();

    const key = `otp:${identifier}`;
    const now = Date.now();
    let data = otpAttempts.get(key);

    if (!data) {
        data = { count: 1, firstAttempt: now };
        otpAttempts.set(key, data);
        return next();
    }

    if (now - data.firstAttempt > OTP_WINDOW_MS) {
        data = { count: 1, firstAttempt: now };
        otpAttempts.set(key, data);
        return next();
    }

    data.count++;
    if (data.count > MAX_OTP_PER_WINDOW) {
        const retryAfter = Math.ceil((data.firstAttempt + OTP_WINDOW_MS - now) / 1000);
        return res.status(429).json({
            success: false,
            message: 'Too many OTP requests. Please wait a few minutes before trying again, or use Email OTP for instant login.',
            retryAfterSeconds: retryAfter
        });
    }

    next();
};
