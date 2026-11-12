import asyncHandler from 'express-async-handler';
import Review from '../models/review.model.js';
import User from '../models/user.model.js';
//import Order from '../models/order.model.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

// @POST /api/reviews
export const addReview = asyncHandler(async (req, res) => {
  const { orderId, rating, comment, type } = req.body;
  const order = await Order.findById(orderId);
  if (!order || order.escrowStatus !== 'released')
    return errorResponse(res, 400, 'Can only review completed orders.');

  const revieweeId = type === 'buyer_to_seller' ? order.seller : order.buyer;
  const review = await Review.create({
    reviewer: req.user._id, reviewee: revieweeId,
    order: orderId, product: order.product,
    rating, comment, type,
  });

  // Update user rating
  const reviews = await Review.find({ reviewee: revieweeId });
  const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  await User.findByIdAndUpdate(revieweeId, { 'rating.average': avg, 'rating.count': reviews.length });

  successResponse(res, 201, 'Review added.', { review });
});

// @GET /api/reviews/:userId
export const getUserReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.find({ reviewee: req.params.userId })
    .populate('reviewer', 'name avatar')
    .sort({ createdAt: -1 });
  successResponse(res, 200, 'Reviews fetched.', { reviews });
});
