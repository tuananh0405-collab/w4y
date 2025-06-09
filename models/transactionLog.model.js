import mongoose from "mongoose";

const transactionLogSchema = new mongoose.Schema({
  transactionId: { type: String, required: true, unique: true },
  description: String,
  amount: Number,
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("TransactionLog", transactionLogSchema);
