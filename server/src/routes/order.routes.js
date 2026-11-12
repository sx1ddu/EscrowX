import express from 'express';
import { placeOrder, getMyOrders, getOrderById, markDelivered, cancelOrder } from '../controllers/order.controller.js';
import { protect } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.post('/',                     protect, placeOrder);
router.get('/my',                    protect, getMyOrders);
router.get('/:id',                   protect, getOrderById);
router.patch('/:id/mark-delivered',  protect, markDelivered);
router.patch('/:id/cancel',          protect, cancelOrder);

export default router;
