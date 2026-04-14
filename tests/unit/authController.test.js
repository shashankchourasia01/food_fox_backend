import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../models/User.js', () => ({
  default: {
    findOne: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock('../../utils/fast2smsOtp.js', () => ({
  generateOTP:        vi.fn(() => '123456'),
  getOTPExpiry:       vi.fn(() => new Date(Date.now() + 5 * 60 * 1000)),
  sendOTPViaFast2SMS: vi.fn(),
  generateToken:      vi.fn(() => 'mock-jwt-token'),
}));

vi.mock('express-validator', () => ({
  body:             vi.fn(() => ({})),
  validationResult: vi.fn(() => ({ isEmpty: () => true, array: () => [] })),
}));

// ---------- Imports (receive mocked versions) ----------

import { sendOTP, verifyOTP, resendOTP } from '../../controllers/authController.js';
import User from '../../models/User.js';
import { sendOTPViaFast2SMS, generateOTP, generateToken } from '../../utils/fast2smsOtp.js';

// ---------- Helpers ----------

/** Build a mock Mongoose user document */
const buildUser = (overrides = {}) => ({
  _id:             'user-id-001',
  name:            'Test User',
  phone:           '9876543210',
  email:           null,
  isLoggedIn:      false,
  currentToken:    null,
  currentDeviceId: null,
  otp:             null,
  isVerified:      false,
  role:            'user',
  addresses:       [],
  save:            vi.fn().mockResolvedValue(true),
  ...overrides,
});

/** Build a valid OTP record (expires in 5 min) */
const validOtp = (overrides = {}) => ({
  code:      '123456',
  expiresAt: new Date(Date.now() + 5 * 60 * 1000),
  attempts:  0,
  provider:  'fast2sms',
  deviceId:  'device-A',
  ...overrides,
});

/** Mock Express req */
const req = (body = {}) => ({ body });

/** Mock Express res with chainable status().json() */
const res = () => {
  const r = {};
  r.status = vi.fn().mockReturnValue(r);
  r.json   = vi.fn().mockReturnValue(r);
  return r;
};

const next = vi.fn();

// =============================================================
// sendOTP
// =============================================================
describe('sendOTP', () => {
  it('sends OTP to a brand-new user', async () => {
    User.findOne.mockResolvedValue(null);
    User.create.mockResolvedValue(buildUser());
    sendOTPViaFast2SMS.mockResolvedValue({ success: true, requestId: 'req-1' });

    const mockRes = res();
    await sendOTP(req({ name: 'New User', phone: '9876543210', deviceId: 'device-A' }), mockRes, next);

    expect(User.create).toHaveBeenCalledWith(
      expect.objectContaining({ phone: '9876543210', isVerified: false })
    );
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, message: 'OTP sent successfully' })
    );
  });

  // TC-1: OTP is sent even when user is already logged in from another device
  it('sends OTP even if user is already logged in on another device', async () => {
    const existingUser = buildUser({ isLoggedIn: true, currentToken: 'old-token', currentDeviceId: 'device-A' });
    User.findOne.mockResolvedValue(existingUser);
    sendOTPViaFast2SMS.mockResolvedValue({ success: true, requestId: 'req-2' });

    const mockRes = res();
    await sendOTP(req({ name: 'Test User', phone: '9876543210', deviceId: 'device-B' }), mockRes, next);

    // Must NOT return a 4xx block
    const statusCalls = mockRes.status.mock.calls.flat();
    expect(statusCalls).not.toContain(400);
    expect(statusCalls).not.toContain(401);

    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true })
    );
  });

  // TC-2 (part of TC-1): Old session is cleared before new OTP is issued
  it('invalidates existing session (isLoggedIn, currentToken, currentDeviceId) before sending OTP', async () => {
    const existingUser = buildUser({ isLoggedIn: true, currentToken: 'old-token', currentDeviceId: 'device-A' });
    User.findOne.mockResolvedValue(existingUser);
    sendOTPViaFast2SMS.mockResolvedValue({ success: true });

    await sendOTP(req({ name: 'Test User', phone: '9876543210', deviceId: 'device-B' }), res(), next);

    expect(existingUser.isLoggedIn).toBe(false);
    expect(existingUser.currentToken).toBeNull();
    expect(existingUser.currentDeviceId).toBeNull();
    expect(existingUser.save).toHaveBeenCalled();
  });

  it('stores deviceId inside the OTP record', async () => {
    const user = buildUser();
    User.findOne.mockResolvedValue(user);
    sendOTPViaFast2SMS.mockResolvedValue({ success: true });

    await sendOTP(req({ name: 'Test User', phone: '9876543210', deviceId: 'device-B' }), res(), next);

    expect(user.otp).toMatchObject({ deviceId: 'device-B', code: '123456' });
  });

  it('falls back to local OTP when Fast2SMS fails, still returns success', async () => {
    const user = buildUser();
    User.findOne.mockResolvedValue(user);
    sendOTPViaFast2SMS.mockResolvedValue({ success: false, error: 'API error' });

    const mockRes = res();
    await sendOTP(req({ name: 'Test User', phone: '9876543210', deviceId: 'device-A' }), mockRes, next);

    expect(user.otp.provider).toBe('local');
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true })
    );
  });

  it('returns 400 for invalid phone number (less than 10 digits)', async () => {
    const mockRes = res();
    await sendOTP(req({ name: 'Test User', phone: '12345', deviceId: 'device-A' }), mockRes, next);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false })
    );
  });

  it('returns 400 when deviceId is missing', async () => {
    const mockRes = res();
    await sendOTP(req({ name: 'Test User', phone: '9876543210' }), mockRes, next);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: 'Device ID is required' })
    );
  });

  it('exposes testOTP in development environment', async () => {
    process.env.NODE_ENV = 'development';
    const user = buildUser();
    User.findOne.mockResolvedValue(user);
    sendOTPViaFast2SMS.mockResolvedValue({ success: true });

    const mockRes = res();
    await sendOTP(req({ name: 'Test User', phone: '9876543210', deviceId: 'device-A' }), mockRes, next);

    const jsonArg = mockRes.json.mock.calls[0][0];
    expect(jsonArg.data).toHaveProperty('testOTP', '123456');
  });
});

// =============================================================
// verifyOTP
// =============================================================
describe('verifyOTP', () => {
  // TC-6: Successful verification creates an active session
  it('verifies OTP and creates a new active session with token and deviceId', async () => {
    const user = buildUser({ otp: validOtp() });
    User.findOne.mockResolvedValue(user);

    const mockRes = res();
    await verifyOTP(req({ phone: '9876543210', otp: '123456', deviceId: 'device-A' }), mockRes, next);

    expect(user.isLoggedIn).toBe(true);
    expect(user.currentToken).toBe('mock-jwt-token');
    expect(user.currentDeviceId).toBe('device-A');
    expect(user.otp).toBeUndefined();
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: 'Login successful',
        data: expect.objectContaining({ token: 'mock-jwt-token' }),
      })
    );
  });

  // TC-5: Expired OTP is rejected
  it('rejects an expired OTP', async () => {
    const user = buildUser({
      otp: validOtp({ expiresAt: new Date(Date.now() - 60_000) }),
    });
    User.findOne.mockResolvedValue(user);

    const mockRes = res();
    await verifyOTP(req({ phone: '9876543210', otp: '123456', deviceId: 'device-A' }), mockRes, next);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: 'OTP expired' })
    );
  });

  // TC-4: Only latest OTP is valid — wrong code is rejected
  it('rejects a wrong OTP code and increments attempts counter', async () => {
    const user = buildUser({ otp: validOtp({ code: '999999' }) });
    User.findOne.mockResolvedValue(user);

    const mockRes = res();
    await verifyOTP(req({ phone: '9876543210', otp: '111111', deviceId: 'device-A' }), mockRes, next);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: 'Invalid OTP' })
    );
    expect(user.otp.attempts).toBe(1);
    expect(user.save).toHaveBeenCalled();
  });

  it('locks account after 3 consecutive wrong OTP attempts', async () => {
    const user = buildUser({ otp: validOtp({ code: '999999', attempts: 2 }) });
    User.findOne.mockResolvedValue(user);

    const mockRes = res();
    await verifyOTP(req({ phone: '9876543210', otp: '111111', deviceId: 'device-A' }), mockRes, next);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: 'Too many failed attempts' })
    );
  });

  it('rejects OTP verification when deviceId does not match the requesting device', async () => {
    const user = buildUser({ otp: validOtp({ deviceId: 'device-A' }) });
    User.findOne.mockResolvedValue(user);

    const mockRes = res();
    await verifyOTP(req({ phone: '9876543210', otp: '123456', deviceId: 'device-B' }), mockRes, next);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: expect.stringContaining('different device') })
    );
  });

  it('returns 404 when user is not found', async () => {
    User.findOne.mockResolvedValue(null);

    const mockRes = res();
    await verifyOTP(req({ phone: '0000000000', otp: '123456', deviceId: 'device-A' }), mockRes, next);

    expect(mockRes.status).toHaveBeenCalledWith(404);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: 'User not found' })
    );
  });

  it('returns 400 when user has no pending OTP record', async () => {
    const user = buildUser({ otp: null });
    User.findOne.mockResolvedValue(user);

    const mockRes = res();
    await verifyOTP(req({ phone: '9876543210', otp: '123456', deviceId: 'device-A' }), mockRes, next);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: 'No OTP found' })
    );
  });
});

// =============================================================
// resendOTP
// =============================================================
describe('resendOTP', () => {
  it('resends OTP successfully and stores new OTP with deviceId', async () => {
    const user = buildUser();
    User.findOne.mockResolvedValue(user);
    sendOTPViaFast2SMS.mockResolvedValue({ success: true });

    const mockRes = res();
    await resendOTP(req({ phone: '9876543210', deviceId: 'device-A' }), mockRes, next);

    expect(user.otp).toMatchObject({ code: '123456', deviceId: 'device-A' });
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, message: 'OTP resent successfully' })
    );
  });

  it('invalidates an existing active session when OTP is resent', async () => {
    const user = buildUser({ isLoggedIn: true, currentToken: 'stale-token', currentDeviceId: 'device-A' });
    User.findOne.mockResolvedValue(user);
    sendOTPViaFast2SMS.mockResolvedValue({ success: true });

    await resendOTP(req({ phone: '9876543210', deviceId: 'device-B' }), res(), next);

    expect(user.isLoggedIn).toBe(false);
    expect(user.currentToken).toBeNull();
    expect(user.currentDeviceId).toBeNull();
  });

  it('returns 404 when phone number is not registered', async () => {
    User.findOne.mockResolvedValue(null);

    const mockRes = res();
    await resendOTP(req({ phone: '0000000000', deviceId: 'device-A' }), mockRes, next);

    expect(mockRes.status).toHaveBeenCalledWith(404);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: 'User not found' })
    );
  });

  it('returns 400 when deviceId is missing', async () => {
    const mockRes = res();
    await resendOTP(req({ phone: '9876543210' }), mockRes, next);

    expect(mockRes.status).toHaveBeenCalledWith(400);
  });

  it('falls back to local OTP provider when Fast2SMS fails on resend', async () => {
    const user = buildUser();
    User.findOne.mockResolvedValue(user);
    sendOTPViaFast2SMS.mockResolvedValue({ success: false });

    await resendOTP(req({ phone: '9876543210', deviceId: 'device-A' }), res(), next);

    expect(user.otp.provider).toBe('local');
    expect(user.save).toHaveBeenCalled();
  });
});
