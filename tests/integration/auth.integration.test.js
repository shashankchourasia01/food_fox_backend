import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import express from 'express';

vi.mock('../../utils/fast2smsOtp.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    sendOTPViaFast2SMS: vi.fn().mockResolvedValue({ success: true, requestId: 'test-req-id' }),
  };
});

import authRoutes from '../../routes/authRoutes.js';
import { errorHandler } from '../../middleware/errorMiddleware.js';
import User from '../../models/User.js';

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.use(errorHandler);
  return app;
};

let mongod;
let app;

// mongodb-memory-server may need to download the binary on first run — allow 90s
beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  process.env.JWT_SECRET  = 'integration-test-secret';
  process.env.JWT_EXPIRE  = '1d';
  process.env.NODE_ENV    = 'development';   // expose testOTP in responses
  app = buildApp();
}, 90_000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

beforeEach(async () => {
  await User.deleteMany({});   // fresh slate for every test
  vi.clearAllMocks();
});

// ---------- Shared helpers ----------

const PHONE     = '9876543210';
const DEVICE_A  = 'device-alpha';
const DEVICE_B  = 'device-beta';

/** POST /api/auth/send-otp and return the response */
const sendOtp = (phone = PHONE, deviceId = DEVICE_A, name = 'Test User') =>
  request(app)
    .post('/api/auth/send-otp')
    .send({ name, phone, deviceId });

/** POST /api/auth/verify-otp using the testOTP from sendOtp response */
const verifyOtp = (phone, otp, deviceId) =>
  request(app)
    .post('/api/auth/verify-otp')
    .send({ phone, otp, deviceId });

/** Full login: send OTP then verify, returns { token, user } */
const login = async (phone = PHONE, deviceId = DEVICE_A) => {
  const sendRes = await sendOtp(phone, deviceId);
  const otp     = sendRes.body.data?.testOTP;
  const verRes  = await verifyOtp(phone, otp, deviceId);
  return { token: verRes.body.data?.token, user: verRes.body.data?.user };
};

// =============================================================
// POST /api/auth/send-otp
// =============================================================
describe('POST /api/auth/send-otp', () => {
  it('creates a new user and sends OTP on first login', async () => {
    const res = await sendOtp();

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.phone).toBe(PHONE);

    const dbUser = await User.findOne({ phone: PHONE });
    expect(dbUser).not.toBeNull();
    expect(dbUser.otp.code).toBeTruthy();
  });

  // TC-2: OTP is sent even if user is already logged in on another device
  it('sends OTP to existing user who is currently logged in on another device', async () => {
    // Device A logs in first
    await login(PHONE, DEVICE_A);

    // Device B requests OTP — must NOT be blocked
    const res = await sendOtp(PHONE, DEVICE_B);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // TC-1: New login immediately clears the old session in the DB
  it('clears the existing session in DB when a new device requests OTP', async () => {
    await login(PHONE, DEVICE_A);

    // Confirm Device A's session is active
    let dbUser = await User.findOne({ phone: PHONE });
    expect(dbUser.isLoggedIn).toBe(true);
    expect(dbUser.currentToken).not.toBeNull();

    // Device B requests OTP
    await sendOtp(PHONE, DEVICE_B);

    // DB must reflect invalidated session
    dbUser = await User.findOne({ phone: PHONE });
    expect(dbUser.isLoggedIn).toBe(false);
    expect(dbUser.currentToken).toBeNull();
    expect(dbUser.currentDeviceId).toBeNull();
  });

  it('returns 400 for a phone number shorter than 10 digits', async () => {
    const res = await sendOtp('12345');
    expect(res.status).toBe(400);
  });

  it('returns 400 when name is missing', async () => {
    const res = await request(app)
      .post('/api/auth/send-otp')
      .send({ phone: PHONE, deviceId: DEVICE_A });  // no name
    expect(res.status).toBe(400);
  });
});

// =============================================================
// POST /api/auth/verify-otp
// =============================================================
describe('POST /api/auth/verify-otp', () => {
  // TC-6: Successful verification creates an active session
  it('returns a JWT token and marks user as logged in on successful verification', async () => {
    const sendRes  = await sendOtp();
    const testOTP  = sendRes.body.data.testOTP;

    const verRes = await verifyOtp(PHONE, testOTP, DEVICE_A);

    expect(verRes.status).toBe(200);
    expect(verRes.body.success).toBe(true);
    expect(verRes.body.data.token).toBeTruthy();

    const dbUser = await User.findOne({ phone: PHONE });
    expect(dbUser.isLoggedIn).toBe(true);
    expect(dbUser.currentToken).toBe(verRes.body.data.token);
    expect(dbUser.currentDeviceId).toBe(DEVICE_A);
    // Mongoose clears the OTP fields but may return an empty subdocument;
    // assert the sensitive fields (code, expiresAt) are gone.
    expect(dbUser.otp?.code).toBeFalsy();
    expect(dbUser.otp?.expiresAt).toBeFalsy();
  });

  // TC-5: Expired OTP is rejected
  it('rejects an OTP that has expired', async () => {
    await sendOtp();

    // Manually expire the OTP in the DB
    await User.updateOne({ phone: PHONE }, { 'otp.expiresAt': new Date(Date.now() - 60_000) });

    const verRes = await verifyOtp(PHONE, '123456', DEVICE_A);

    expect(verRes.status).toBe(400);
    expect(verRes.body.message).toMatch(/expired/i);
  });

  // TC-4: Only the latest OTP is valid
  it('only the latest OTP is valid after multiple send-otp calls', async () => {
    // First OTP request
    const first = await sendOtp(PHONE, DEVICE_A);
    const firstOTP = first.body.data.testOTP;

    // Second OTP request overwrites the first
    const second = await sendOtp(PHONE, DEVICE_A);
    const latestOTP = second.body.data.testOTP;

    // Trying the first (stale) OTP should fail
    const staleRes = await verifyOtp(PHONE, firstOTP, DEVICE_A);

    // If OTPs happen to be the same value (random), skip assertion
    if (firstOTP !== latestOTP) {
      expect(staleRes.status).toBe(400);
      expect(staleRes.body.message).toMatch(/invalid otp/i);
    }

    // Latest OTP must succeed
    const validRes = await verifyOtp(PHONE, latestOTP, DEVICE_A);
    expect(validRes.status).toBe(200);
    expect(validRes.body.success).toBe(true);
  });

  it('rejects a wrong OTP code', async () => {
    await sendOtp();
    const verRes = await verifyOtp(PHONE, '000000', DEVICE_A);

    expect(verRes.status).toBe(400);
    expect(verRes.body.message).toMatch(/invalid otp/i);
  });

  it('rejects OTP verification from a different device than the one that requested it', async () => {
    await sendOtp(PHONE, DEVICE_A);                   // OTP bound to DEVICE_A
    const user = await User.findOne({ phone: PHONE });

    const verRes = await verifyOtp(PHONE, user.otp.code, DEVICE_B);  // wrong device

    expect(verRes.status).toBe(400);
    expect(verRes.body.message).toMatch(/different device/i);
  });
});

// =============================================================
// Multi-device session management (TC-1, TC-3)
// =============================================================
describe('Multi-device session management', () => {
  // TC-3: Old token is rejected after new login
  it('old device token is rejected by a protected route after new device logs in', async () => {
    // Device A logs in and gets a token
    const { token: tokenA } = await login(PHONE, DEVICE_A);

    // Device B logs in — Device A's session is invalidated
    await login(PHONE, DEVICE_B);

    // Device A tries to access protected route with its old token
    const profileRes = await request(app)
      .get('/api/auth/profile')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(profileRes.status).toBe(401);
    expect(profileRes.body.message).toMatch(/session expired|not authorized/i);
  });

  // TC-1: Login from new device invalidates old session end-to-end
  it('new device can log in and use the API while old device is locked out', async () => {
    // Device A logs in
    const { token: tokenA } = await login(PHONE, DEVICE_A);

    // Device B takes over
    const { token: tokenB } = await login(PHONE, DEVICE_B);

    // Device B should be able to access the API
    const validRes = await request(app)
      .get('/api/auth/profile')
      .set('Authorization', `Bearer ${tokenB}`);
    expect(validRes.status).toBe(200);

    // Device A should be locked out
    const blockedRes = await request(app)
      .get('/api/auth/profile')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(blockedRes.status).toBe(401);
  });

  it('rapid successive OTP requests do not leave stale sessions in DB', async () => {
    // Three rapid OTP requests
    await sendOtp(PHONE, 'device-1');
    await sendOtp(PHONE, 'device-2');
    await sendOtp(PHONE, 'device-3');

    const dbUser = await User.findOne({ phone: PHONE });

    // Only one pending OTP must exist
    expect(dbUser.otp).not.toBeNull();
    // Session must be cleared (no ghost sessions)
    expect(dbUser.isLoggedIn).toBe(false);
    expect(dbUser.currentToken).toBeNull();
  });
});

// =============================================================
// POST /api/auth/logout
// =============================================================
describe('POST /api/auth/logout', () => {
  it('logs out the active user and clears the session', async () => {
    const { token } = await login(PHONE, DEVICE_A);

    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${token}`);
    expect(logoutRes.status).toBe(200);

    // Token must be dead after logout
    const profileRes = await request(app)
      .get('/api/auth/profile')
      .set('Authorization', `Bearer ${token}`);
    expect(profileRes.status).toBe(401);
  });
});
