import express from 'express';
import { raiseDispute, getDisputes, resolveDispute } from '../controllers/dispute.controller.js';
import { protect, authorize } from '../middlewares/auth.middleware.js';

const router = express.Router();
router.post('/',              protect, raiseDispute);
router.get('/',               protect, getDisputes);
router.patch('/:id/resolve',  protect, authorize('admin'), resolveDispute);
export default router;
