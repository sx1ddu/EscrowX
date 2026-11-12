import asyncHandler from 'express-async-handler';
import User from '../models/user.model.js';
import Order from '../models/order.model.js';
import Product from '../models/product.model.js';
import Dispute from '../models/dispute.model.js';
import { successResponse } from '../utils/apiResponse.js';

export const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 }).select('-password -refreshTokens -otp');
  successResponse(res, 200, 'Users fetched.', { users });
});

export const banUser = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.id, { isBanned: req.body.isBanned }, { new: true });
  successResponse(res, 200, 'User updated.', { user: user.toPublicJSON() });
});

export const getDashboardStats = asyncHandler(async (req, res) => {
  const [users, products, orders, disputes] = await Promise.all([
    User.countDocuments(),
    Product.countDocuments({ status: 'active' }),
    Order.countDocuments(),
    Dispute.countDocuments({ status: 'open' }),
  ]);
  const revenueAgg = await Order.aggregate([
    { $match: { escrowStatus: 'released' } },
    { $group: { _id: null, total: { $sum: '$amount' }, fees: { $sum: '$platformFee' } } },
  ]);
  successResponse(res, 200, 'Stats fetched.', {
    users, products, orders, disputes,
    revenue: revenueAgg[0]?.total || 0,
    platformFee: revenueAgg[0]?.fees || 0,
  });
});
