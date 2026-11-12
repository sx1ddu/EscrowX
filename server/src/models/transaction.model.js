import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  transactionId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    index: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  type: {
    type: String,
    enum: [
      'escrow_funding',   // Buyer funded escrow
      'escrow_release',   // Escrow released to seller
      'platform_fee',     // Platform commission deducted
      'buyer_refund',     // Refund issued to buyer wallet
      'seller_payout',    // Seller requested withdrawal to bank
      'payout_reversal',  // Failed payout refunded back to wallet
      'adjustment',       // Administrative audit adjustment
    ],
    required: true,
  },
  direction: {
    type: String,
    enum: ['credit', 'debit'],
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  amountInPaise: {
    type: Number,
    required: true,
    min: 0,
  },
  currency: {
    type: String,
    default: 'INR',
    uppercase: true,
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'reversed'],
    default: 'completed',
    index: true,
  },
  balanceAfter: {
    type: Number,
    required: false,
  },
  idempotencyKey: {
    type: String,
    unique: true,
    sparse: true,
  },
  providerReference: {
    type: String,
  },
  description: {
    type: String,
    trim: true,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
}, { timestamps: true });

transactionSchema.index({ user: 1, createdAt: -1 });
transactionSchema.index({ order: 1, type: 1 });

export default mongoose.model('Transaction', transactionSchema);
