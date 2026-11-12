import express from 'express';
import { getUsers, banUser, getDashboardStats } from '../controllers/admin.controller.js';
import { protect, authorize } from '../middlewares/auth.middleware.js';
import { validateObjectId } from '../middlewares/validate.js';

const router = express.Router();
router.use(protect, authorize('admin'));
router.get('/stats',          getDashboardStats);
router.get('/users',          getUsers);
router.patch('/users/:id/ban', validateObjectId('id'), banUser);
export default router;
