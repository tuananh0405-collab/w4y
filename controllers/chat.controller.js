import jwt from "jsonwebtoken";
import { JWT_EXPIRES_IN, JWT_SECRET } from "../config/env.js";
import ChatMessage from "../models/chatMessage.model.js";
import mongoose from "mongoose";
import toObjectId from "../utils/toObjectId.js";

export const getChatToken = (req, res, next) => {
  try {
    const { senderId } = req.query;

    const chatToken = jwt.sign({ senderId }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN, // For now
    });

    res.status(200).json({
      success: true,
      message: "Validated successfully",
      data: chatToken,
    });
  } catch (error) {
    next(error);
  }
};

export const getChatHistory = async (req, res, next) => {
  try {
    const { senderId, receiverId } = req.query;

    if (!senderId) {
      res.status(400).json({
        success: false,
        message: `Missing senderId`,
        data: [],
      });
      return;
    }

    // Not an error because this acts as like a standby mode
    if (!receiverId || receiverId === "null") {
      res.status(200).json({
        success: false,
        message: `Empty list due to missing receiverId`,
        data: [],
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
      message: `Fetched message list by ${senderId} and ${receiverId}`,
      data: messageList,
    });
  } catch (error) {
    next(error);
  }
};

export const getRecentMessagedUsers = async (req, res, next) => {
  try {
    // const senderId = req.user._id;
    let { senderId } = req.query;
    senderId = toObjectId(senderId);

    const results = await ChatMessage.aggregate([
      {
        // Get all messages that have senderId as sender or receiver
        $match: {
          $or: [{ senderId: senderId }, { receiverId: senderId }],
        },
      },
      {
        $sort: {
          sentAt: -1,
        },
      },
      {
        // Get partnerId, the *other* user of the message, the sender/receiver of the message that the user received from/sent to
        $addFields: {
          partnerId: {
            $cond: [
              { $eq: ["$senderId", senderId] },
              "$receiverId",
              "$senderId",
            ],
          },
        },
      },
      {
        $group: {
          _id: "$partnerId",
          lastMessageAt: { $first: "$sentAt" },
          lastMessage: { $first: "$message" },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "partner",
        },
      },
      {
        $unwind: "$partner",
      },
      {
        $project: {
          _id: 0,
          receiverId: "$_id",
          name: "$partner.name",
          email: "$partner.email",
          lastMessage: "$lastMessage",
          lastMessageAt: "$lastMessageAt",
        },
      },
      {
        $sort: { lastMessageAt: -1 },
      },
    ]);

    res.status(200).json({
      success: true,
      message: "Fetched recently messaged users",
      data: results,
    });
  } catch (error) {
    next(error);
  }
};
