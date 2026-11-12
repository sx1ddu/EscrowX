import express from 'express';
import { addReview, getUserReviews } from '../controllers/review.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { validateObjectId, validateBody } from '../middlewares/validate.js';

const router = express.Router();
router.post('/',         protect, validateBody({
  orderId: { isObjectId: true, required: true },
  rating: { type: 'number', required: true, min: 1, max: 5 },
  type: { type: 'string', required: true, enum: ['buyer_to_seller', 'seller_to_buyer'] }
}), addReview);
router.get('/:userId',   validateObjectId('userId'), getUserReviews);
export default router;
