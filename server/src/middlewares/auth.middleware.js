import { verifyAccessToken } from '../utils/jwt.js';
import User from '../models/user.model.js';
import { errorResponse } from '../utils/apiResponse.js';

export const protect = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.split(' ')[1]
      : req.cookies?.accessToken;

    if (!token) return errorResponse(res, 401, 'Access denied. No token provided.');

    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.id).select('-password -refreshTokens -otp');
    if (!user)    return errorResponse(res, 401, 'User not found.');
    if (user.isBanned) return errorResponse(res, 403, 'Your account has been banned.');

    req.user = user;
    next();
  } catch (err) {
    return errorResponse(res, 401, 'Invalid or expired token.');
  }
};

export const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role))
    return errorResponse(res, 403, `Role '${req.user.role}' is not authorized.`);
  next();
};

export const optionalAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      const decoded = verifyAccessToken(token);
      req.user = await User.findById(decoded.id).select('-password -refreshTokens -otp');
    }
  } catch (_) {}
  next();
};
