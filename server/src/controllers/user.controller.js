import asyncHandler from 'express-async-handler';
import User from '../models/user.model.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

// @GET /api/users/me
export const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  successResponse(res, 200, 'User fetched.', { user: user.toPublicJSON() });
});

// @PUT /api/users/me
export const updateMe = asyncHandler(async (req, res) => {
  const allowed = ['name', 'bio', 'address'];
  const updates = {};
  allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
  if (req.file) updates.avatar = req.file.path;
  const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true });
  successResponse(res, 200, 'Profile updated.', { user: user.toPublicJSON() });
});

// @GET /api/users/:id
export const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('name avatar rating bio totalSales createdAt');
  if (!user) return errorResponse(res, 404, 'User not found.');
  successResponse(res, 200, 'User fetched.', { user });
});
