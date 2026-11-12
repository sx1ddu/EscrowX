import asyncHandler from 'express-async-handler';
import Product from '../models/product.model.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import { getRedis } from '../config/redis.js';
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});
// @POST /api/products — Create product
export const createProduct = asyncHandler(async (req, res) => {
  const { title, description, price, category, condition, city, state, pincode, location, tags } = req.body;
  const images = req.files?.map(f => ({ url: f.path, publicId: f.filename })) || [];

  // AI: Generate enhanced description
  let aiDescription = '';

try {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `Write a compelling 2-sentence product listing for:
    "${title}".
    Category: ${category}.
    Description: "${description}"`,
  });

  aiDescription = response.text;

  console.log("✅ AI Description:", aiDescription);

} catch (err) {
  console.log("❌ FULL AI ERROR:", err);
}

  const product = await Product.create({
    seller: req.user._id,
    title, description, price, category, condition,
    images,
    location: location || { city, state, pincode },
    tags: Array.isArray(tags) ? tags : (tags ? tags.split(',').map(tag => tag.trim()).filter(Boolean) : []),
    aiDescription,
  });

  successResponse(res, 201, 'Product listed successfully.', { product });
});

// @GET /api/products — Get all products with search + filter
export const getProducts = asyncHandler(async (req, res) => {
  const { search, category, minPrice, maxPrice, condition, sort = '-createdAt', page = 1, limit = 12 } = req.query;

  // Cache key
  const redis    = getRedis();
  const cacheKey = `products:${JSON.stringify(req.query)}`;
  const cached   = await redis.get(cacheKey);
  if (cached) return successResponse(res, 200, 'Products fetched (cached).', JSON.parse(cached));

  const filter = { status: 'active' };
  if (search)   filter.$text = { $search: search };
  if (category) filter.category = category;
  if (condition) filter.condition = condition;
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }

  const [products, total] = await Promise.all([
    Product.find(filter)
      .populate('seller', 'name avatar rating')
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(parseInt(limit)),
    Product.countDocuments(filter),
  ]);

  const data = { products, total, page: parseInt(page), totalPages: Math.ceil(total / limit) };
  await redis.setex(cacheKey, 60, JSON.stringify(data)); // cache 60s

  successResponse(res, 200, 'Products fetched.', data);
});

// @GET /api/products/:id
export const getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndUpdate(
    req.params.id, { $inc: { views: 1 } }, { new: true }
  ).populate('seller', 'name avatar rating totalSales bio');

  if (!product || product.status === 'deleted')
    return errorResponse(res, 404, 'Product not found.');
  successResponse(res, 200, 'Product fetched.', { product });
});

// @PUT /api/products/:id
export const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return errorResponse(res, 404, 'Product not found.');
  if (product.seller.toString() !== req.user._id.toString())
    return errorResponse(res, 403, 'Not your product.');

  const updated = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  // Invalidate cache
  const redis = getRedis();
  const keys  = await redis.keys('products:*');
  if (keys.length) await redis.del(keys);

  successResponse(res, 200, 'Product updated.', { product: updated });
});

// @DELETE /api/products/:id
export const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return errorResponse(res, 404, 'Product not found.');
  if (product.seller.toString() !== req.user._id.toString() && req.user.role !== 'admin')
    return errorResponse(res, 403, 'Not authorized.');

  product.status = 'deleted';
  await product.save();
  successResponse(res, 200, 'Product deleted.');
});
