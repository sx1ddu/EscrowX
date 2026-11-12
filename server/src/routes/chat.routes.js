import express from 'express';
import { getMyChats, getChatById, startChat, sendMessage } from '../controllers/chat.controller.js';
import { protect } from '../middlewares/auth.middleware.js';

const router = express.Router();
router.get('/',            protect, getMyChats);
router.get('/:id',         protect, getChatById);
router.post('/start',      protect, startChat);
router.post('/:id/messages', protect, sendMessage);
export default router;
