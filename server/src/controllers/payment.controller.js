import asyncHandler from 'express-async-handler';
import crypto from 'crypto';
import razorpay from '../config/razorpay.js';
import Order from '../models/order.model.js';
import User from '../models/user.model.js';
import Transaction from '../models/transaction.model.js';
import Payout from '../models/payout.model.js';
import EscrowService from '../services/escrow.service.js';
import LedgerService from '../services/ledger.service.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import { getRedis } from '../config/redis.js';
import { generateIdempotencyKey } from '../utils/jwt.js';

const PAYMENT_LOCK_TTL_SECONDS = 300;
const paymentLockKey = (orderId) => `payment_lock:${orderId}`;

const populateOrder = (query) => query.populate('buyer seller product');

const deletePaymentLock = async (orderId) => {
  if (!orderId) return;
  try {
    await getRedis().del(paymentLockKey(orderId));
  } catch (err) {
    // Non-fatal, Redis TTL will clean up
  }
};

export const createPaymentOrder = asyncHandler(async (req, res) => {
  const { orderId } = req.body;
  const order = await Order.findById(orderId).populate('product seller buyer');

  if (!order) return errorResponse(res, 404, 'Order not found.');
  if (order.buyer._id.toString() !== req.user._id.toString())
    return errorResponse(res, 403, 'Not your order.');
  if (order.escrowStatus !== 'pending')
    return errorResponse(res, 400, 'Order already processed.');

  const redis = getRedis();
  const idempKey = generateIdempotencyKey();
  const acquired = await redis.set(paymentLockKey(orderId), idempKey, 'EX', PAYMENT_LOCK_TTL_SECONDS, 'NX');
  if (!acquired) return errorResponse(res, 409, 'Payment already in progress.');

  try {
    const platformFee = Math.round(order.amount * 0.02);
    const sellerAmount = order.amount - platformFee;

    const razorpayOrder = await razorpay.orders.create({
      amount: order.amount * 100,
      currency: 'INR',
      receipt: `order_${orderId}`,
      notes: { orderId, buyerId: req.user._id.toString() },
    });

    order.payment.razorpayOrderId = razorpayOrder.id;
    order.payment.idempotencyKey = idempKey;
    order.platformFee = platformFee;
    order.sellerAmount = sellerAmount;
    await order.save();

    successResponse(res, 200, 'Payment order created.', {
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    await deletePaymentLock(orderId);
    throw err;
  }
});

export const verifyPayment = asyncHandler(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature)
    return errorResponse(res, 400, 'Missing payment verification data.');

  const order = await populateOrder(Order.findOne({ 'payment.razorpayOrderId': razorpay_order_id }));

  if (!order) return errorResponse(res, 404, 'Order not found.');
  if (order.buyer._id.toString() !== req.user._id.toString())
    return errorResponse(res, 403, 'Not your order.');

  try {
    if (order.payment.status === 'paid' || order.escrowStatus === 'funded') {
      await deletePaymentLock(order._id);
      return successResponse(res, 200, 'Payment already verified.', { order });
    }

    const expectedSig = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSig !== razorpay_signature)
      return errorResponse(res, 400, 'Invalid payment signature.');

    if (order.escrowStatus !== 'pending')
      return errorResponse(res, 400, `Cannot verify payment in status: ${order.escrowStatus}`);

    const fundedOrder = await EscrowService.fundOrder({
      orderId: order._id,
      paymentId: razorpay_payment_id,
      method: 'razorpay',
    });

    successResponse(res, 200, 'Payment verified. Funds held in escrow.', { order: fundedOrder });
  } finally {
    await deletePaymentLock(order._id);
  }
});

export const razorpayWebhook = asyncHandler(async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  const body = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : JSON.stringify(req.body);

  const expectedSig = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(body)
    .digest('hex');

  if (signature !== expectedSig)
    return errorResponse(res, 400, 'Invalid webhook signature.');

  const parsedBody = Buffer.isBuffer(req.body) ? JSON.parse(body) : req.body;
  const event = parsedBody.event;
  const payload = parsedBody.payload?.payment?.entity;

  if (event === 'payment.captured' && payload) {
    const order = await Order.findOne({
      'payment.razorpayOrderId': payload.order_id,
    }).populate('buyer seller product');

    if (!order) return res.status(200).json({ received: true });

    const redis = getRedis();
    const processedKey = `webhook_processed:${payload.id}`;
    const acquired = await redis.set(processedKey, '1', 'EX', 86400, 'NX');
    if (!acquired) return res.status(200).json({ received: true, idempotent: true });

    try {
      if (order.escrowStatus === 'pending') {
        await EscrowService.fundOrder({
          orderId: order._id,
          paymentId: payload.id,
          method: payload.method || 'razorpay_webhook',
        });
      }
    } finally {
      await deletePaymentLock(order._id);
    }
  }

  res.status(200).json({ received: true });
});

export const confirmDelivery = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.orderId).populate('seller buyer');
  if (!order) return errorResponse(res, 404, 'Order not found.');
  if (order.buyer._id.toString() !== req.user._id.toString())
    return errorResponse(res, 403, 'Only buyer can confirm delivery.');
  if (order.escrowStatus !== 'funded' && order.escrowStatus !== 'delivered')
    return errorResponse(res, 400, `Cannot confirm in status: ${order.escrowStatus}`);

  const releasedOrder = await EscrowService.confirmDelivery({
    orderId: req.params.orderId,
    buyerId: req.user._id,
  });

  successResponse(res, 200, 'Delivery confirmed. Funds released to seller.', { order: releasedOrder });
});

export const autoReleaseEscrow = asyncHandler(async (req, res) => {
  const result = await EscrowService.autoReleaseOrder(req.params.orderId);
  res.json(result);
});

export const getWallet = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('wallet');
  successResponse(res, 200, 'Wallet fetched.', { wallet: user.wallet });
});

export const requestPayout = asyncHandler(async (req, res) => {
  const { amount, bankDetails } = req.body;
  const numAmount = Number(amount);

  if (!numAmount || numAmount < 100) {
    return errorResponse(res, 400, 'Minimum payout amount is ₹100.');
  }
  if (!bankDetails?.accountNumber || !bankDetails?.ifscCode || !bankDetails?.accountHolderName) {
    return errorResponse(res, 400, 'Complete bank details (account number, IFSC, account holder name) are required.');
  }

  const payout = await LedgerService.requestPayout({
    userId: req.user._id,
    amount: numAmount,
    bankDetails: {
      accountNumber: bankDetails.accountNumber.trim(),
      ifscCode: bankDetails.ifscCode.trim().toUpperCase(),
      accountHolderName: bankDetails.accountHolderName.trim(),
      bankName: bankDetails.bankName ? bankDetails.bankName.trim() : 'Bank',
    },
    payoutMethod: 'bank_transfer',
  });

  successResponse(res, 201, 'Payout request submitted successfully.', { payout });
});

export const getLedgerTransactions = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const skip = (page - 1) * limit;

  const [transactions, total] = await Promise.all([
    Transaction.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('order', 'escrowStatus amount product delivery'),
    Transaction.countDocuments({ user: req.user._id }),
  ]);

  successResponse(res, 200, 'Transactions fetched.', {
    transactions,
    pagination: { total, page, pages: Math.ceil(total / limit) },
  });
});

export const getPayouts = asyncHandler(async (req, res) => {
  const payouts = await Payout.find({ user: req.user._id }).sort({ createdAt: -1 });
  successResponse(res, 200, 'Payout requests fetched.', { payouts });
});
