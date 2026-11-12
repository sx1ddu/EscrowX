import express from 'express';
import { addReview, getUserReviews } from '../controllers/review.controller.js';
import { protect } from '../middlewares/auth.middleware.js';

const router = express.Router();
router.post('/',         protect, addReview);
router.get('/:userId',   getUserReviews);
export default router;
