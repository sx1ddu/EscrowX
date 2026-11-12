import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  sender:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content:   { type: String, trim: true },
  type:      { type: String, enum: ['text','image','file','system'], default: 'text' },
  fileUrl:   String,
  isRead:    { type: Boolean, default: false },
  readAt:    Date,
}, { timestamps: true });

const chatSchema = new mongoose.Schema({
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  product:      { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  order:        { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  messages:     [messageSchema],
  lastMessage:  { content: String, sender: mongoose.Schema.Types.ObjectId, at: Date },
  isBlocked:    { type: Boolean, default: false },
}, { timestamps: true });

chatSchema.index({ participants: 1 });

export default mongoose.model('Chat', chatSchema);
