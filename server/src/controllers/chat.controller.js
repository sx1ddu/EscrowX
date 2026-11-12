import asyncHandler from 'express-async-handler';
import Chat from '../models/chat.model.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import { broadcastToChat } from '../sockets/index.js';

// @GET /api/chats
export const getMyChats = asyncHandler(async (req, res) => {
  const chats = await Chat.find({ participants: req.user._id, isBlocked: false })
    .populate('participants', 'name avatar')
    .populate('product', 'title images')
    .sort({ updatedAt: -1 });
  successResponse(res, 200, 'Chats fetched.', { chats });
});

// @GET /api/chats/:id
export const getChatById = asyncHandler(async (req, res) => {
  const chat = await Chat.findById(req.params.id)
    .populate('participants', 'name avatar')
    .populate('messages.sender', 'name avatar');
  if (!chat) return errorResponse(res, 404, 'Chat not found.');
  const isParticipant = chat.participants.some(p => p._id.toString() === req.user._id.toString());
  if (!isParticipant) return errorResponse(res, 403, 'Access denied.');
  successResponse(res, 200, 'Chat fetched.', { ...chat.toObject(), messages: chat.messages });
});

// @POST /api/chats/start
export const startChat = asyncHandler(async (req, res) => {
  const { recipientId, productId } = req.body;
  if (!recipientId || !productId)
    return errorResponse(res, 400, 'Recipient and product are required.');
  if (recipientId.toString() === req.user._id.toString())
    return errorResponse(res, 400, 'Cannot start a chat with yourself.');

  let chat = await Chat.findOne({
    participants: { $all: [req.user._id, recipientId] },
    product: productId,
  });
  if (!chat) {
    chat = await Chat.create({ participants: [req.user._id, recipientId], product: productId });
  }
  chat = await Chat.findById(chat._id)
    .populate('participants', 'name avatar')
    .populate('product', 'title images');
  successResponse(res, 200, 'Chat ready.', { chatId: chat._id, chat });
});

// @POST /api/chats/:id/messages
export const sendMessage = asyncHandler(async (req, res) => {
  const { content, type = 'text' } = req.body;
  const chat = await Chat.findById(req.params.id);
  if (!chat) return errorResponse(res, 404, 'Chat not found.');
  if (!chat.participants.some(id => id.toString() === req.user._id.toString()))
    return errorResponse(res, 403, 'Access denied.');
  if (!content?.trim()) return errorResponse(res, 400, 'Message cannot be empty.');

  const message = { sender: req.user._id, content: content.trim(), type };
  chat.messages.push(message);
  chat.lastMessage = { content: content.trim(), sender: req.user._id, at: new Date() };
  await chat.save();

  const savedMessage = chat.messages[chat.messages.length - 1].toObject();
  const populatedMsg = {
    ...savedMessage,
    sender: { _id: req.user._id, name: req.user.name, avatar: req.user.avatar },
  };
  broadcastToChat(chat._id.toString(), 'NEW_MESSAGE', { chatId: chat._id, message: populatedMsg });
  successResponse(res, 201, 'Message sent.', { message: populatedMsg });
});
