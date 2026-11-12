import express from 'express';
import { createProduct, getProducts, getProductById, updateProduct, deleteProduct } from '../controllers/product.controller.js';
import { protect, authorize } from '../middlewares/auth.middleware.js';
import { upload } from '../config/cloudinary.js';

const router = express.Router();

router.get('/',     getProducts);
router.get('/:id',  getProductById);
router.post('/',    protect, authorize('seller','admin'), upload.array('images', 5), createProduct);
router.put('/:id',  protect, authorize('seller','admin'), updateProduct);
router.delete('/:id', protect, deleteProduct);

export default router;
