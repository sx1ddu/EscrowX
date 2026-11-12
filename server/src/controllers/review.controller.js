import asyncHandler from 'express-async-handler';
import Review from '../models/review.model.js';
import User from '../models/user.model.js';
import Order from '../models/order.model.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

// @POST /api/reviews
export const addReview = asyncHandler(async (req, res) => {
  const { orderId, rating, comment, type = 'buyer_to_seller' } = req.body;

  const numRating = Number(rating);
  if (!numRating || numRating < 1 || numRating > 5) {
    return errorResponse(res, 400, 'Rating must be a number between 1 and 5.');
  }

  const order = await Order.findById(orderId);
  if (!order) return errorResponse(res, 404, 'Order not found.');
  if (order.escrowStatus !== 'released') {
    return errorResponse(res, 400, 'Reviews can only be submitted for completed orders with released escrow.');
  }

  const isBuyer = order.buyer.toString() === req.user._id.toString();
  const isSeller = order.seller.toString() === req.user._id.toString();

  if (!isBuyer && !isSeller) {
    return errorResponse(res, 403, 'You are not a participant in this order.');
  }

  const reviewType = type === 'seller_to_buyer' ? 'seller_to_buyer' : 'buyer_to_seller';
  if (reviewType === 'buyer_to_seller' && !isBuyer) {
    return errorResponse(res, 403, 'Only the buyer can submit a seller review.');
  }
  if (reviewType === 'seller_to_buyer' && !isSeller) {
    return errorResponse(res, 403, 'Only the seller can submit a buyer review.');
  }

  const existingReview = await Review.findOne({ order: orderId, type: reviewType });
  if (existingReview) {
    return errorResponse(res, 409, 'A review of this type has already been submitted for this order.');
  }

  const revieweeId = reviewType === 'buyer_to_seller' ? order.seller : order.buyer;

  const review = await Review.create({
    reviewer: req.user._id,
    reviewee: revieweeId,
    order: orderId,
    product: order.product,
    rating: numRating,
    comment: comment?.trim() || '',
    type: reviewType,
  });

  // Update reviewee rating aggregate
  const reviews = await Review.find({ reviewee: revieweeId });
  const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  await User.findByIdAndUpdate(revieweeId, {
    'rating.average': parseFloat(avg.toFixed(2)),
    'rating.count': reviews.length,
  });

  successResponse(res, 201, 'Review added successfully.', { review });
});

// @GET /api/reviews/:userId
export const getUserReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.find({ reviewee: req.params.userId })
    .populate('reviewer', 'name avatar')
    .sort({ createdAt: -1 });
  successResponse(res, 200, 'Reviews fetched.', { reviews });
});
