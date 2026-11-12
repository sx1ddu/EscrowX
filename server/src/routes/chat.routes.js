import express from 'express';
import { getMyChats, getChatById, startChat, sendMessage } from '../controllers/chat.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { validateObjectId, validateBody } from '../middlewares/validate.js';

const router = express.Router();
router.get('/',            protect, getMyChats);
router.get('/:id',         protect, validateObjectId('id'), getChatById);
router.post('/start',      protect, validateBody({
  recipientId: { isObjectId: true, required: true },
  productId: { isObjectId: true, required: true }
}), startChat);
router.post('/:id/messages', protect, validateObjectId('id'), validateBody({
  content: { type: 'string', required: true, minLength: 1 }
}), sendMessage);
export default router;
