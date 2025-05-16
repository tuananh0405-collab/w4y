import mongoose from "mongoose";

// Payment Schema
const paymentSchema = new mongoose.Schema({
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    type: {
      type: String,
      enum: ['Job Posting', 'Application Fee'],
      required: true,
    },
    status: {
      type: String,
      enum: ['Completed', 'Failed'],
      default: 'Completed',
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  });
   const Payment = mongoose.model('Payment', paymentSchema);
   export default Payment;