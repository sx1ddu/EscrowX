import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  buyer:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  seller:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  product:       { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  amount:        { type: Number, required: true },
  platformFee:   { type: Number, default: 0 },
  sellerAmount:  { type: Number, default: 0 },

  // ESCROW CORE
  escrowStatus:  {
    type: String,
    enum: ['pending','funded','delivered','released','disputed','refunded','cancelled'],
    default: 'pending'
  },
  escrowHeldAt:     Date,
  deliveryConfirmedAt: Date,
  fundsReleasedAt:  Date,
  autoReleaseAt:    Date, // 7 days after delivery if buyer doesn't respond

  // Payment
  payment: {
    razorpayOrderId:   String,
    razorpayPaymentId: String,
    idempotencyKey:    { type: String, unique: true, sparse: true },
    method:            String,
    status:            { type: String, enum: ['pending','paid','failed'], default: 'pending' },
  },

  // Delivery
  delivery: {
    method:      { type: String, enum: ['shipping','pickup','digital'], default: 'shipping' },
    trackingId:  String,
    address:     { street: String, city: String, state: String, pincode: String },
    deliveredAt: Date,
  },

  // Status Timeline
  timeline: [{
    status:    String,
    message:   String,
    timestamp: { type: Date, default: Date.now },
  }],

  notes:          String,
  cancellationReason: String,
}, { timestamps: true });

orderSchema.index({ buyer: 1, escrowStatus: 1 });
orderSchema.index({ seller: 1, escrowStatus: 1 });
orderSchema.index({ 'payment.razorpayOrderId': 1 });

export default mongoose.model('Order', orderSchema);
