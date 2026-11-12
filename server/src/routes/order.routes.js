import express from 'express';
import { placeOrder, getMyOrders, getOrderById, markDelivered, cancelOrder } from '../controllers/order.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { validateObjectId, validateBody } from '../middlewares/validate.js';

const router = express.Router();

router.post('/',                     protect, validateBody({ productId: { isObjectId: true, required: true } }), placeOrder);
router.get('/my',                    protect, getMyOrders);
router.get('/:id',                   protect, validateObjectId('id'), getOrderById);
router.patch('/:id/mark-delivered',  protect, validateObjectId('id'), markDelivered);
router.patch('/:id/cancel',          protect, validateObjectId('id'), cancelOrder);

export default router;
