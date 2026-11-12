import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name:          { type: String, required: true, trim: true },
  email:         { type: String, required: true, unique: true, lowercase: true },
  password:      { type: String, select: false },
  avatar:        { type: String, default: '' },
  role:          { type: String, enum: ['buyer', 'seller', 'admin'], default: 'buyer' },
  isVerified:    { type: Boolean, default: false },
  isBanned:      { type: Boolean, default: false },
  googleId:      { type: String },
  githubId:      { type: String },
  refreshTokens: [{ type: String }],
  otp:           { code: String, expiresAt: Date },
  rating:        { average: { type: Number, default: 0 }, count: { type: Number, default: 0 } },
  wallet:        { balance: { type: Number, default: 0 }, currency: { type: String, default: 'INR' } },
  address:       { street: String, city: String, state: String, pincode: String, country: String },
  bio:           { type: String, maxLength: 300 },
  totalSales:    { type: Number, default: 0 },
  totalPurchases:{ type: Number, default: 0 },
}, { timestamps: true });

userSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toPublicJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.refreshTokens;
  delete obj.otp;
  return obj;
};

export default mongoose.model('User', userSchema);
