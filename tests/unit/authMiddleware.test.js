import { describe, it, expect, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';

vi.mock('../../models/User.js', () => ({
  default: {
    findById: vi.fn(),
  },
}));

import { protect } from '../../middleware/authMiddleware.js';
import User from '../../models/User.js';

const JWT_SECRET = 'test-secret';
const USER_ID    = 'user-id-001';

/** Sign a real JWT token */
const sign = (id = USER_ID, expiresIn = '1h') =>
  jwt.sign({ id }, JWT_SECRET, { expiresIn });

/** Build a mock user with an active session */
const buildActiveUser = (token, overrides = {}) => ({
  _id:             USER_ID,
  name:            'Test User',
  isLoggedIn:      true,
  currentToken:    token,
  currentDeviceId: 'device-A',
  role:            'user',
  ...overrides,
});

/** Mock Express req with Bearer token */
const req = (token, headers = {}) => ({
  headers: {
    authorization: token ? `Bearer ${token}` : undefined,
    ...headers,
  },
});

/** Mock Express res */
const res = () => {
  const r = {};
  r.status = vi.fn().mockReturnValue(r);
  r.json   = vi.fn().mockReturnValue(r);
  return r;
};

beforeEach(() => {
  process.env.JWT_SECRET = JWT_SECRET;
});

// =============================================================
// protect middleware
// =============================================================
describe('protect middleware', () => {
  it('calls next() and attaches req.user for a valid active session', async () => {
    const token      = sign();
    const activeUser = buildActiveUser(token);
    User.findById.mockReturnValue({ select: vi.fn().mockResolvedValue(activeUser) });

    const mockReq  = req(token);
    const mockNext = vi.fn();
    await protect(mockReq, res(), mockNext);

    expect(mockNext).toHaveBeenCalledWith(); // called with no error
    expect(mockReq.user).toBe(activeUser);
  });

  // TC-3: Old token is rejected after a new login rotates currentToken
  it('rejects a stale token whose currentToken has been rotated by a new device login', async () => {
    // Use different nonces so tokens are distinct even within the same second
    const oldToken = jwt.sign({ id: USER_ID, nonce: 1 }, JWT_SECRET, { expiresIn: '1h' });
    const newToken = jwt.sign({ id: USER_ID, nonce: 2 }, JWT_SECRET, { expiresIn: '1h' });
    const user     = buildActiveUser(newToken);        // currentToken = newToken
    User.findById.mockReturnValue({ select: vi.fn().mockResolvedValue(user) });

    const mockNext = vi.fn();
    await protect(req(oldToken), res(), mockNext);     // Device A sends stale oldToken

    expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    expect(mockNext.mock.calls[0][0].message).toMatch(/session expired/i);
  });

  it('rejects a request when the user is marked as logged out', async () => {
    const token     = sign();
    const loggedOut = buildActiveUser(token, { isLoggedIn: false });
    User.findById.mockReturnValue({ select: vi.fn().mockResolvedValue(loggedOut) });

    const mockNext = vi.fn();
    await protect(req(token), res(), mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    expect(mockNext.mock.calls[0][0].message).toMatch(/session expired/i);
  });

  it('rejects a request when currentToken is null (user was logged out programmatically)', async () => {
    const token = sign();
    const user  = buildActiveUser(null, { isLoggedIn: true, currentToken: null });
    User.findById.mockReturnValue({ select: vi.fn().mockResolvedValue(user) });

    const mockNext = vi.fn();
    await protect(req(token), res(), mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
  });

  it('rejects a request with no Authorization header', async () => {
    const mockNext = vi.fn();
    await protect(req(null), res(), mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    expect(mockNext.mock.calls[0][0].message).toMatch(/no token/i);
  });

  it('rejects a request with a tampered / invalid token signature', async () => {
    const token = sign() + 'tampered';
    User.findById.mockReturnValue({ select: vi.fn().mockResolvedValue(null) });

    const mockNext = vi.fn();
    await protect(req(token), res(), mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
  });

  it('rejects an expired JWT token', async () => {
    // Sign with -1s expiry so it is immediately expired
    const expired   = sign(USER_ID, '-1s');
    const mockNext  = vi.fn();
    await protect(req(expired), res(), mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    expect(mockNext.mock.calls[0][0].message).toMatch(/token expired|not authorized/i);
  });

  it('returns 401 when user document is not found in DB', async () => {
    const token = sign();
    User.findById.mockReturnValue({ select: vi.fn().mockResolvedValue(null) });

    const mockRes  = res();
    const mockNext = vi.fn();
    await protect(req(token), mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
  });
});
