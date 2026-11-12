import asyncHandler from 'express-async-handler';
import Dispute from '../models/dispute.model.js';
import Order from '../models/order.model.js';
import EscrowService from '../services/escrow.service.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
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
  const order = await Order.findById(orderId);
  if (!order) return errorResponse(res, 404, 'Order not found.');
  if (!['funded', 'delivered'].includes(order.escrowStatus))
    return errorResponse(res, 400, 'Can only dispute funded or delivered orders.');

  // AI risk scoring
  let aiRiskScore = 0;
  try {
    const genAI = getGeminiClient();
    if (genAI) {
      const response = await genAI.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Rate fraud risk from 0 to 100 for this dispute.

Reason: ${reason}
Description: ${description}

Reply ONLY with a number.`
      });

      const text = response.text?.trim() || "0";
      aiRiskScore = parseInt(text, 10) || 0;
    }
  } catch (err) {
    // Non-fatal, AI scoring fallback
  }

  const { dispute, order: updatedOrder } = await EscrowService.raiseDispute({
    orderId,
    userId: req.user._id,
    reason,
    description,
    aiRiskScore,
  });

  successResponse(res, 201, 'Dispute raised. Our team will review within 48 hours.', { dispute, order: updatedOrder });
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
    return errorResponse(res, 400, 'Invalid dispute resolution. Must be "buyer" or "seller".');

  const { dispute, order } = await EscrowService.resolveDispute({
    disputeId: req.params.id,
    adminId: req.user._id,
    resolution,
    adminNotes,
  });

  successResponse(res, 200, 'Dispute resolved.', { dispute, order });
});
