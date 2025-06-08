import { JWT_SECRET } from "../config/env.js";
import jwt from "jsonwebtoken";

export default async function withChatTokenValidation(chatToken, socket, callback) {
  try {
    const decoded = await new Promise((resolve, reject) => {
      jwt.verify(chatToken, JWT_SECRET, (err, decoded) => {
        if (err) return reject(err);
        resolve(decoded);
      });
    });

    if (!decoded.senderId) {
      return socket.emit("sendMessageError", {
        success: false,
        statusCode: 400,
        message: "Faulty token (missing senderId)",
      });
    }

    await callback(decoded);
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      socket.emit("sendMessageError", {
        success: false,
        statusCode: 401,
        message: "Token expired",
      });
    } else {
      socket.emit("sendMessageError", {
        success: false,
        statusCode: 400,
        message: "Token error",
      });
    }
  }
};
