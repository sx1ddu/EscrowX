import express from 'express';
import { createPaymentOrder, verifyPayment, confirmDelivery, autoReleaseEscrow, getWallet } from '../controllers/payment.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { paymentRateLimiter } from '../middlewares/rateLimiter.js';

const router = express.Router();

router.post('/create-order',             protect, paymentRateLimiter, createPaymentOrder);
router.post('/verify',                   protect, paymentRateLimiter, verifyPayment);
router.post('/confirm-delivery/:orderId', protect, confirmDelivery);
router.post('/release-auto/:orderId',    autoReleaseEscrow); // internal
router.get('/wallet',                    protect, getWallet);

export default router;
