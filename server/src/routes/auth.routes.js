import express from 'express';
import passport from '../config/passport.js';
import { register, verifyOTP, login, refreshToken, logout, forgotPassword, resetPassword, oauthCallback } from '../controllers/auth.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { authRateLimiter } from '../middlewares/rateLimiter.js';

const router = express.Router();

router.post('/register',        authRateLimiter, register);
router.post('/verify-otp',      authRateLimiter, verifyOTP);
router.post('/login',           authRateLimiter, login);
router.post('/refresh-token',   refreshToken);
router.post('/logout',          protect, logout);
router.post('/forgot-password', authRateLimiter, forgotPassword);
router.post('/reset-password',  authRateLimiter, resetPassword);

// OAuth
router.get('/google',          passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback',  passport.authenticate('google', { session: false }), oauthCallback);
router.get('/github',          passport.authenticate('github', { scope: ['user:email'] }));
router.get('/github/callback',  passport.authenticate('github', { session: false }), oauthCallback);

export default router;
