import jwt from "jsonwebtoken";
import { JWT_EXPIRES_IN, JWT_SECRET } from "../config/env";

export const getChatToken = (req, res, next) => {
  try {
    const { sender_id, receiver_id } = req.body;

    const chatToken = jwt.sign({ sender_id, receiver_id }, JWT_SECRET, {
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
