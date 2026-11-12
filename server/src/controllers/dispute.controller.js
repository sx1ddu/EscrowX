import asyncHandler from 'express-async-handler';
import Dispute from '../models/dispute.model.js';
import Order from '../models/order.model.js';
import Product from '../models/product.model.js';
import User from '../models/user.model.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import { sendEmail } from '../utils/email.js';
import { notifyUser } from '../sockets/index.js';
import { GoogleGenAI } from "@google/genai";

const getGeminiClient = () => {
  if (!process.env.GEMINI_API_KEY) return null;

  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
  });
};

// @POST /api/disputes
export const raiseDispute = asyncHandler(async (req, res) => {
  const { orderId, reason, description } = req.body;
  const order = await Order.findById(orderId).populate('buyer seller');
  if (!order) return errorResponse(res, 404, 'Order not found.');
  if (!['funded','delivered'].includes(order.escrowStatus))
    return errorResponse(res, 400, 'Can only dispute funded or delivered orders.');

  const against = order.buyer._id.toString() === req.user._id.toString() ? order.seller._id : order.buyer._id;

  // AI risk scoring
  let aiRiskScore = 0;
  try {
    const genAI = getGeminiClient();
    if (!genAI) throw new Error('GEMINI_API_KEY is not configured');

    const response = await genAI.models.generateContent({
  model: "gemini-2.5-flash",
  contents: `Rate fraud risk from 0 to 100 for this dispute.

Reason: ${reason}
Description: ${description}

Reply ONLY with a number.`
});

const text = response.text?.trim() || "0";

aiRiskScore = parseInt(text, 10) || 0;
  } catch (err) {
    console.log('AI skip:', err.message);
  }

  const dispute = await Dispute.create({ order: orderId, raisedBy: req.user._id, against, reason, description, aiRiskScore });
  order.escrowStatus = 'disputed';
  order.timeline.push({ status: 'disputed', message: `Dispute raised: ${reason}` });
  await order.save();

  notifyUser(req.user._id.toString(), 'DISPUTE_RAISED', { disputeId: dispute._id, orderId, status: 'disputed' });
  notifyUser(against.toString(), 'DISPUTE_RAISED', { disputeId: dispute._id, orderId, status: 'disputed' });
  await sendEmail({ to: req.user.email, template: 'disputeRaised', data: dispute._id });

  successResponse(res, 201, 'Dispute raised. Our team will review within 48 hours.', { dispute, order });
});

// @GET /api/disputes
export const getDisputes = asyncHandler(async (req, res) => {
  const filter = req.user.role === 'admin' ? {} : {
    $or: [{ raisedBy: req.user._id }, { against: req.user._id }]
  };
  const disputes = await Dispute.find(filter)
    .populate('raisedBy against', 'name email')
    .populate('order', 'amount escrowStatus')
    .sort({ createdAt: -1 });
  successResponse(res, 200, 'Disputes fetched.', { disputes });
});

// @PATCH /api/disputes/:id/resolve (admin only)
export const resolveDispute = asyncHandler(async (req, res) => {
  const { resolution, adminNotes } = req.body;
  if (!['buyer', 'seller'].includes(resolution))
    return errorResponse(res, 400, 'Invalid dispute resolution.');

  const dispute = await Dispute.findById(req.params.id).populate({
    path: 'order',
    populate: [
      { path: 'buyer', select: 'name email wallet' },
      { path: 'seller', select: 'name email wallet totalSales' },
    ],
  });
  if (!dispute) return errorResponse(res, 404, 'Dispute not found.');
  const alreadyResolved = dispute.status === 'resolved_buyer' || dispute.status === 'resolved_seller';
  if (!['open', 'under_review'].includes(dispute.status) && !alreadyResolved)
    return errorResponse(res, 400, 'Dispute already resolved.');

  const order = dispute.order;
  if (!order) return errorResponse(res, 404, 'Order not found.');
  const effectiveResolution = alreadyResolved ? dispute.resolution || dispute.status.replace('resolved_', '') : resolution;
  if (alreadyResolved && effectiveResolution !== resolution)
    return errorResponse(res, 400, `Dispute already resolved in favor of ${effectiveResolution}.`);
  if (!['disputed', 'refunded', 'released'].includes(order.escrowStatus))
    return errorResponse(res, 400, `Cannot resolve order in status: ${order.escrowStatus}`);
  if (alreadyResolved && order.escrowStatus !== 'disputed')
    return successResponse(res, 200, 'Dispute already resolved.', { dispute, order });

  dispute.status    = `resolved_${effectiveResolution}`;
  dispute.resolvedBy = req.user._id;
  dispute.resolvedAt = dispute.resolvedAt || new Date();
  dispute.resolution = effectiveResolution;
  dispute.adminNotes = adminNotes;

  let resolvedOrder = order;
  if (order.escrowStatus === 'disputed') {
    if (effectiveResolution === 'buyer') {
      resolvedOrder = await Order.findOneAndUpdate(
        { _id: order._id, escrowStatus: 'disputed' },
        {
          $set: { escrowStatus: 'refunded' },
          $push: {
            timeline: {
              $each: [
                { status: 'refunded', message: 'Dispute resolved in favor of Buyer' },
                { status: 'refunded', message: 'Buyer Refunded' },
              ],
            },
          },
        },
        { new: true }
      ).populate('buyer seller');
      if (!resolvedOrder)
        return successResponse(res, 200, 'Dispute already resolved.', { dispute, order: await Order.findById(order._id).populate('buyer seller') });

      const buyer = await User.findById(order.buyer._id);
      buyer.wallet.balance += order.amount;
      await buyer.save();
      await Product.findByIdAndUpdate(order.product, { status: 'active' });
    } else {
      resolvedOrder = await Order.findOneAndUpdate(
        { _id: order._id, escrowStatus: 'disputed' },
        {
          $set: { escrowStatus: 'released', fundsReleasedAt: new Date() },
          $push: {
            timeline: {
              $each: [
                { status: 'released', message: 'Dispute resolved in favor of Seller' },
                { status: 'released', message: 'Funds released to Seller' },
              ],
            },
          },
        },
        { new: true }
      ).populate('buyer seller');
      if (!resolvedOrder)
        return successResponse(res, 200, 'Dispute already resolved.', { dispute, order: await Order.findById(order._id).populate('buyer seller') });

      const seller = await User.findById(order.seller._id);
      seller.wallet.balance += order.sellerAmount;
      seller.totalSales = (seller.totalSales || 0) + 1;
      await seller.save();
    }
  }

  await dispute.save();

  const status = effectiveResolution === 'buyer' ? 'refunded' : 'released';
  const amount = effectiveResolution === 'buyer' ? resolvedOrder.amount : resolvedOrder.sellerAmount;
  notifyUser(resolvedOrder.buyer._id.toString(), 'DISPUTE_RESOLVED', { orderId: resolvedOrder._id, resolution: effectiveResolution, status, amount });
  notifyUser(resolvedOrder.seller._id.toString(), 'DISPUTE_RESOLVED', { orderId: resolvedOrder._id, resolution: effectiveResolution, status, amount });
  if (effectiveResolution === 'buyer') await sendEmail({ to: resolvedOrder.buyer.email, template: 'buyerRefunded', data: resolvedOrder.amount });
  if (effectiveResolution === 'seller') await sendEmail({ to: resolvedOrder.seller.email, template: 'fundsReleased', data: resolvedOrder.sellerAmount });

  successResponse(res, 200, 'Dispute resolved.', { dispute, order: resolvedOrder });
});
