import mongoose from 'mongoose';

const disputeSchema = new mongoose.Schema({
  order:        { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  raisedBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  against:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reason:       { type: String, required: true },
  description:  { type: String, required: true },
  evidence:     [{ url: String, publicId: String, type: String }],
  status:       { type: String, enum: ['open','under_review','resolved_buyer','resolved_seller','closed'], default: 'open' },
  adminNotes:   String,
  resolvedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resolvedAt:   Date,
  resolution:   String,
  aiRiskScore:  { type: Number, default: 0 }, // 0-100 AI fraud score
}, { timestamps: true });

export default mongoose.model('Dispute', disputeSchema);
