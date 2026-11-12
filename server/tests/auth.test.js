import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import { generateOTP, generateAccessToken, verifyAccessToken, generateRefreshToken, verifyRefreshToken } from '../src/utils/jwt.js';

describe('Auth Utilities & Security Primitives', () => {
  it('generates a 6-digit numeric OTP with valid expiration window', () => {
    const { otp, expiresAt } = generateOTP();
    assert.match(otp, /^\d{6}$/);
    assert.ok(expiresAt instanceof Date);
    assert.ok(expiresAt.getTime() > Date.now());
    // Expiration is approximately 10 minutes in the future
    const diffMinutes = (expiresAt.getTime() - Date.now()) / (1000 * 60);
    assert.ok(diffMinutes > 9 && diffMinutes <= 10.1);
  });

  it('hashes and verifies passwords securely using bcrypt', async () => {
    const rawPassword = 'SecurePassword123!';
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(rawPassword, salt);

    assert.notEqual(rawPassword, hash);
    const matches = await bcrypt.compare(rawPassword, hash);
    assert.equal(matches, true);

    const wrongMatches = await bcrypt.compare('WrongPassword', hash);
    assert.equal(wrongMatches, false);
  });

  it('signs and verifies JWT access tokens', () => {
    process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'test_access_secret_1234567890';
    process.env.JWT_ACCESS_EXPIRES = '15m';

    const userId = '64e8b9a1f2c3d4e5f6a7b8c9';
    const role = 'buyer';

    const token = generateAccessToken(userId, role);
    assert.ok(typeof token === 'string' && token.length > 20);

    const decoded = verifyAccessToken(token);
    assert.equal(decoded.id, userId);
    assert.equal(decoded.role, role);
  });

  it('signs and verifies JWT refresh tokens', () => {
    process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test_refresh_secret_1234567890';
    process.env.JWT_REFRESH_EXPIRES = '7d';

    const userId = '64e8b9a1f2c3d4e5f6a7b8c9';
    const token = generateRefreshToken(userId);
    assert.ok(typeof token === 'string' && token.length > 20);

    const decoded = verifyRefreshToken(token);
    assert.equal(decoded.id, userId);
  });
});