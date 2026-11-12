import express from 'express';
import {
  createPaymentOrder,
  verifyPayment,
  confirmDelivery,
  autoReleaseEscrow,
  getWallet,
  requestPayout,
  getLedgerTransactions,
  getPayouts,
} from '../controllers/payment.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { paymentRateLimiter } from '../middlewares/rateLimiter.js';
import { validateObjectId } from '../middlewares/validate.js';

const router = express.Router();

router.post('/create-order',               protect, paymentRateLimiter, createPaymentOrder);
router.post('/verify',                     protect, paymentRateLimiter, verifyPayment);
router.post('/confirm-delivery/:orderId',   protect, validateObjectId('orderId'), confirmDelivery);
router.post('/release-auto/:orderId',      validateObjectId('orderId'), autoReleaseEscrow); // internal worker
router.get('/wallet',                      protect, getWallet);
router.post('/payout',                     protect, requestPayout);
router.get('/transactions',                protect, getLedgerTransactions);
router.get('/payouts',                     protect, getPayouts);

export default router;
