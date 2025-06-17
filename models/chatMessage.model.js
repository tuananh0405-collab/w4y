import mongoose from "mongoose";

// Chat Message Schema
const chatMessageSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  sentAt: {
    type: Date,
    default: Date.now,
  },
  is_read: {
    type: Boolean,
    required: true,
  },
});
const ChatMessage = mongoose.model("ChatMessage", chatMessageSchema);
export default ChatMessage;
