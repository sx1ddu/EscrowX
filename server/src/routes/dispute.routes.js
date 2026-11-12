import express from 'express';
import { raiseDispute, getDisputes, resolveDispute } from '../controllers/dispute.controller.js';
import { protect, authorize } from '../middlewares/auth.middleware.js';
import { validateObjectId, validateBody } from '../middlewares/validate.js';

const router = express.Router();
router.post('/',              protect, validateBody({
  orderId: { isObjectId: true, required: true },
  reason: { type: 'string', required: true, minLength: 3 },
  description: { type: 'string', required: true, minLength: 10 }
}), raiseDispute);
router.get('/',               protect, getDisputes);
router.patch('/:id/resolve',  protect, authorize('admin'), validateObjectId('id'), resolveDispute);
export default router;
