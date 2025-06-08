import jwt from "jsonwebtoken";
import { JWT_EXPIRES_IN, JWT_SECRET } from "../config/env.js";
import ChatMessage from "../models/chatMessage.model.js";

export const getChatToken = (req, res, next) => {
  try {
    const { senderId } = req.body;

    const chatToken = jwt.sign({ senderId }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN, // For now
    });

    res.status(200).json({
      success: true,
      chatToken,
      message: "Validated successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const getChatHistory = async (req, res, next) => {
  try {
    const { senderId, receiverId } = req.body;

    if (!senderId || !receiverId) {
      res.status(400).json({
        success: false,
        messageList: [],
        message: `Missing ${senderId} or ${receiverId}`,
      });
      return;
    }

    const messageList = await ChatMessage.find({
      $or: [
        { senderId: senderId, receiverId: receiverId },
        { receiverId: senderId, senderId: receiverId },
      ],
    }).sort({ sentAt: -1 });

    res.status(200).json({
      success: true,
      messageList,
      message: `Fetched message list by ${senderId} and ${receiverId}`,
    });
  } catch (error) {
    next(error);
  }
};
