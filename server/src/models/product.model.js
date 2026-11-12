import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  seller:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title:       { type: String, required: true, trim: true, maxLength: 100 },
  description: { type: String, required: true, maxLength: 2000 },
  price:       { type: Number, required: true, min: 1 },
  category:    { type: String, required: true, enum: ['Electronics','Clothing','Books','Furniture','Vehicles','Other'] },
  condition:   { type: String, enum: ['new','like-new','good','fair'], default: 'good' },
  images:      [{ url: String, publicId: String }],
  location:    { city: String, state: String, pincode: String },
  status:      { type: String, enum: ['active','sold','paused','deleted'], default: 'active' },
  views:       { type: Number, default: 0 },
  aiDescription: { type: String },
  isFeatured:  { type: Boolean, default: false },
  tags:        [String],
}, { timestamps: true });

productSchema.index({ title: 'text', description: 'text', tags: 'text' });
productSchema.index({ category: 1, status: 1, price: 1 });

export default mongoose.model('Product', productSchema);
