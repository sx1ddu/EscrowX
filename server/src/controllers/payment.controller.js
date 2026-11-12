import asyncHandler from 'express-async-handler';
import crypto from 'crypto';
import razorpay from '../config/razorpay.js';
import Order from '../models/order.model.js';
import Product from '../models/product.model.js';
import User from '../models/user.model.js';
import { sendEmail } from '../utils/email.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import { getRedis } from '../config/redis.js';
import { notifyUser } from '../sockets/index.js';
import { scheduleAutoRelease } from '../jobs/escrow.job.js';
import { generateIdempotencyKey } from '../utils/jwt.js';

const PAYMENT_LOCK_TTL_SECONDS = 300;
const paymentLockKey = (orderId) => `payment_lock:${orderId}`;

const populateOrder = (query) => query.populate('buyer seller product');

const deletePaymentLock = async (orderId) => {
  if (!orderId) return;
  // Payment locks only prevent parallel checkout creation; after verification they must be removed immediately.
  // The Redis TTL is crash recovery, not the normal path, otherwise paid orders can appear stuck for 300 seconds.
  await getRedis().del(paymentLockKey(orderId));
};

const fundOrderFromPayment = async (order, payload) => {
  if (order.payment.status === 'paid' || order.escrowStatus === 'funded')
    return order;

  const fundedOrder = await Order.findOneAndUpdate(
    { _id: order._id, escrowStatus: 'pending', 'payment.status': { $ne: 'paid' } },
    {
      $set: {
        'payment.razorpayPaymentId': payload.id,
        'payment.method': payload.method,
        'payment.status': 'paid',
        escrowStatus: 'funded',
        escrowHeldAt: new Date(),
      },
      $push: { timeline: { status: 'funded', message: 'Payment received and held in escrow.' } },
    },
    { new: true }
  ).populate('buyer seller product');

  if (!fundedOrder) return populateOrder(Order.findById(order._id));

  await Product.findByIdAndUpdate(fundedOrder.product._id || fundedOrder.product, { status: 'sold' });

  notifyUser(fundedOrder.buyer._id.toString(), 'ORDER_FUNDED', { orderId: fundedOrder._id });
  notifyUser(fundedOrder.seller._id.toString(), 'ORDER_FUNDED', { orderId: fundedOrder._id });

  await sendEmail({ to: fundedOrder.buyer.email, template: 'orderPlaced', data: fundedOrder });
  await scheduleAutoRelease(fundedOrder._id.toString(), 7 * 24 * 60 * 60 * 1000);

  return fundedOrder;
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

    await fundOrderFromPayment(order, {
      id: razorpay_payment_id,
      method: 'razorpay_checkout',
    });

    const updatedOrder = await populateOrder(Order.findById(order._id));
    successResponse(res, 200, 'Payment verified. Funds held in escrow.', { order: updatedOrder });
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
      if (order.escrowStatus === 'pending') await fundOrderFromPayment(order, payload);
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

  const releasedOrder = await Order.findOneAndUpdate(
    { _id: order._id, escrowStatus: { $in: ['funded', 'delivered'] } },
    {
      $set: {
        escrowStatus: 'released',
        fundsReleasedAt: new Date(),
        'delivery.deliveredAt': new Date(),
      },
      $push: { timeline: { status: 'released', message: 'Buyer confirmed delivery. Funds released to seller.' } },
    },
    { new: true }
  ).populate('seller buyer');

  if (!releasedOrder) {
    const latestOrder = await Order.findById(order._id).populate('seller buyer');
    return successResponse(res, 200, 'Delivery already confirmed.', { order: latestOrder });
  }

  const seller = await User.findById(releasedOrder.seller._id);
  seller.wallet.balance += releasedOrder.sellerAmount;
  seller.totalSales = (seller.totalSales || 0) + 1;
  await seller.save();

  notifyUser(releasedOrder.buyer._id.toString(), 'ORDER_RELEASED', { orderId: releasedOrder._id, status: 'released' });
  notifyUser(releasedOrder.seller._id.toString(), 'ORDER_RELEASED', { orderId: releasedOrder._id, status: 'released' });
  notifyUser(releasedOrder.seller._id.toString(), 'FUNDS_RELEASED', { orderId: releasedOrder._id, status: 'released', amount: releasedOrder.sellerAmount });
  await sendEmail({ to: releasedOrder.seller.email, template: 'fundsReleased', data: releasedOrder.sellerAmount });

  successResponse(res, 200, 'Delivery confirmed. Funds released to seller.', { order: releasedOrder });
  
});


export const autoReleaseEscrow = asyncHandler(async (req, res) => {
  const order = await Order.findOneAndUpdate(
    { _id: req.params.orderId, escrowStatus: 'funded' },
    {
      $set: { escrowStatus: 'released', fundsReleasedAt: new Date() },
      $push: { timeline: { status: 'released', message: 'Funds auto-released after 7 days.' } },
    },
    { new: true }
  ).populate('seller');
  if (!order) return res.json({ skipped: true });

  const seller = await User.findById(order.seller._id);
  seller.wallet.balance += order.sellerAmount;
  seller.totalSales = (seller.totalSales || 0) + 1;
  await seller.save();

  notifyUser(order.buyer.toString(), 'ORDER_RELEASED', { orderId: order._id, status: 'released' });
  notifyUser(order.seller._id.toString(), 'ORDER_RELEASED', { orderId: order._id, status: 'released' });
  notifyUser(order.seller._id.toString(), 'FUNDS_RELEASED', { orderId: order._id, status: 'released', amount: order.sellerAmount });
  await sendEmail({ to: order.seller.email, template: 'fundsReleased', data: order.sellerAmount });

  res.json({ success: true });
});

export const getWallet = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('wallet');
  successResponse(res, 200, 'Wallet fetched.', { wallet: user.wallet });
});
