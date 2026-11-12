import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  reviewer:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reviewee:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  order:     { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  product:   { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  rating:    { type: Number, required: true, min: 1, max: 5 },
  comment:   { type: String, maxLength: 500 },
  type:      { type: String, enum: ['buyer_to_seller', 'seller_to_buyer'], required: true },
}, { timestamps: true });

reviewSchema.index({ reviewee: 1 });
reviewSchema.index({ order: 1, type: 1 }, { unique: true });

export default mongoose.model('Review', reviewSchema);
