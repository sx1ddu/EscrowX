import mongoose from 'mongoose';

const payoutSchema = new mongoose.Schema({
  payoutId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 100, // Minimum withdrawal amount
  },
  amountInPaise: {
    type: Number,
    required: true,
    min: 10000,
  },
  currency: {
    type: String,
    default: 'INR',
    uppercase: true,
  },
  status: {
    type: String,
    enum: ['requested', 'processing', 'completed', 'failed', 'cancelled'],
    default: 'requested',
    index: true,
  },
  bankAccount: {
    accountHolderName: { type: String, required: true, trim: true },
    accountNumber:     { type: String, required: true, trim: true },
    ifscCode:          { type: String, required: true, uppercase: true, trim: true },
    bankName:          { type: String, trim: true },
  },
  providerTransferId: {
    type: String,
  },
  idempotencyKey: {
    type: String,
    unique: true,
    sparse: true,
  },
  failureReason: {
    type: String,
  },
  processedAt: {
    type: Date,
  },
  transaction: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
  },
  adminNotes: {
    type: String,
  },
}, { timestamps: true });

payoutSchema.index({ seller: 1, createdAt: -1 });

export default mongoose.model('Payout', payoutSchema);
