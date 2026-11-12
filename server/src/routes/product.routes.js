import express from 'express';
import { createProduct, getProducts, getProductById, updateProduct, deleteProduct } from '../controllers/product.controller.js';
import { protect, authorize, optionalAuth } from '../middlewares/auth.middleware.js';
import { upload } from '../config/cloudinary.js';
import { validateObjectId } from '../middlewares/validate.js';

const router = express.Router();

router.get('/',        optionalAuth, getProducts);
router.get('/:id',     validateObjectId('id'), getProductById);
router.post('/',       protect, authorize('seller','admin'), upload.array('images', 5), createProduct);
router.put('/:id',     protect, authorize('seller','admin'), validateObjectId('id'), updateProduct);
router.delete('/:id',  protect, validateObjectId('id'), deleteProduct);

export default router;
