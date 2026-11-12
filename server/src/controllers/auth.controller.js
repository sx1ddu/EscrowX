import asyncHandler from 'express-async-handler';
import User from '../models/user.model.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken, generateOTP } from '../utils/jwt.js';
import { sendEmail } from '../utils/email.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import { getRedis } from '../config/redis.js';

const cookieOptions = {
  httpOnly: true,
  secure:   process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge:   7 * 24 * 60 * 60 * 1000,
};

// @POST /api/auth/register
export const register = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;

  const existing = await User.findOne({ email });
  if (existing) return errorResponse(res, 400, 'Email already registered.');

  const { otp, expiresAt } = generateOTP();
  const user = await User.create({
    name, email, password,
    role: role === 'seller' ? 'seller' : 'buyer',
    otp: { code: otp, expiresAt },
  });

  await sendEmail({ to: email, template: 'otp', data: otp });
  successResponse(res, 201, 'Registration successful. Check your email for OTP.', {
    userId: user._id,
  });
});

// @POST /api/auth/verify-otp
export const verifyOTP = asyncHandler(async (req, res) => {
  const { userId, otp } = req.body;
  const user = await User.findById(userId).select('+otp');
  if (!user) return errorResponse(res, 404, 'User not found.');

  if (!user.otp?.code || user.otp.code !== otp)
    return errorResponse(res, 400, 'Invalid OTP.');
  if (user.otp.expiresAt < new Date())
    return errorResponse(res, 400, 'OTP expired. Request a new one.');

  user.isVerified = true;
  user.otp        = undefined;
  await user.save();

  const accessToken  = generateAccessToken(user._id, user.role);
  const refreshToken = generateRefreshToken(user._id);
  user.refreshTokens.push(refreshToken);
  await user.save();

  res.cookie('refreshToken', refreshToken, cookieOptions);
  successResponse(res, 200, 'Email verified successfully.', {
    accessToken, user: user.toPublicJSON(),
  });
});

// @POST /api/auth/login
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password)))
    return errorResponse(res, 401, 'Invalid email or password.');
  if (!user.isVerified) return errorResponse(res, 403, 'Please verify your email first.');
  if (user.isBanned)    return errorResponse(res, 403, 'Account banned.');

  const accessToken  = generateAccessToken(user._id, user.role);
  const refreshToken = generateRefreshToken(user._id);

  // Keep max 5 refresh tokens (multi-device)
  user.refreshTokens = [...(user.refreshTokens || []).slice(-4), refreshToken];
  await user.save();

  res.cookie('refreshToken', refreshToken, cookieOptions);
  successResponse(res, 200, 'Login successful.', {
    accessToken, user: user.toPublicJSON(),
  });
});

// @POST /api/auth/refresh-token  — Refresh Token Rotation
export const refreshToken = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) return errorResponse(res, 401, 'No refresh token.');

  let decoded;
  try { decoded = verifyRefreshToken(token); }
  catch { return errorResponse(res, 401, 'Invalid refresh token.'); }

  const user = await User.findById(decoded.id).select('+refreshTokens');
  if (!user || !user.refreshTokens.includes(token))
    return errorResponse(res, 401, 'Refresh token reuse detected. Login again.');

  // Rotate: remove old, add new
  const newRefreshToken = generateRefreshToken(user._id);
  user.refreshTokens    = user.refreshTokens.filter(t => t !== token);
  user.refreshTokens.push(newRefreshToken);
  await user.save();

  const newAccessToken = generateAccessToken(user._id, user.role);
  res.cookie('refreshToken', newRefreshToken, cookieOptions);
  successResponse(res, 200, 'Token refreshed.', { accessToken: newAccessToken });
});

// @POST /api/auth/logout
export const logout = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (token) {
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { refreshTokens: token },
    });
  }
  res.clearCookie('refreshToken');
  successResponse(res, 200, 'Logged out successfully.');
});

// @POST /api/auth/forgot-password
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) return errorResponse(res, 404, 'No account with that email.');

  const { otp, expiresAt } = generateOTP();
  user.otp = { code: otp, expiresAt };
  await user.save();

  await sendEmail({ to: email, template: 'otp', data: otp });
  successResponse(res, 200, 'Reset OTP sent to your email.');
});

// @POST /api/auth/reset-password
export const resetPassword = asyncHandler(async (req, res) => {
  const { email, otp, newPassword } = req.body;
  const user = await User.findOne({ email }).select('+otp');
  if (!user) return errorResponse(res, 404, 'User not found.');
  if (user.otp?.code !== otp || user.otp.expiresAt < new Date())
    return errorResponse(res, 400, 'Invalid or expired OTP.');

  user.password        = newPassword;
  user.otp             = undefined;
  user.refreshTokens   = [];
  await user.save();
  successResponse(res, 200, 'Password reset successful. Please login.');
});

// OAuth Callback Handler
export const oauthCallback = asyncHandler(async (req, res) => {
  const user         = req.user;
  const accessToken  = generateAccessToken(user._id, user.role);
  const refreshToken = generateRefreshToken(user._id);

  user.refreshTokens = [...(user.refreshTokens || []).slice(-4), refreshToken];
  await user.save();

  res.cookie('refreshToken', refreshToken, cookieOptions);
  res.redirect(`${process.env.OAUTH_REDIRECT_URL}?token=${accessToken}`);
});
