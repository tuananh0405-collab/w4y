const jwt = require("jsonwebtoken");
const { default: ChatMessage } = require("../models/chatMessage.model");
const { JWT_SECRET } = require("../config/env");

export const setOnSendChatMessage = (sockio, socket, UsersConnectionList) => {
  socket.on("chatMsg", ({ chatToken, receiver_id, message }) => {
    jwt.verify(chatToken, JWT_SECRET, async (err, decoded) => {
      if (err) {
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
      } else if (!decoded.sender_id) {
        socket.emit("sendMessageError", {
          success: false,
          statusCode: 400,
          message: "Faulty token (missing sender_id)",
        });
      } else {
        try {
          const { sender_id } = decoded;
          const sender = await ChatMessage.findById(sender_id);
          if (!sender) {
            socket.emit("sendMessageError", {
              success: false,
              statusCode: 400,
              message: "Sender does not exists",
            });
            return;
          }

          const receiver = await ChatMessage.findById(receiver_id);
          if (!receiver) {
            socket.emit("sendMessageError", {
              success: false,
              statusCode: 400,
              message: "Receiver does not exists",
            });
            return;
          }

          const newMessage = new ChatMessage({
            sender_id,
            receiver_id,
            message,
            is_read: false,
          });

          await newMessage.save();

          const senderSocketId = UsersConnectionList[sender_id];
          if (senderSocketId) {
            sockio.to(senderSocketId).emit("receivedChatMessage", message);
          } else {
            // Kinda sus that sender's not connected to socket but still sending stuffs but idk it can be an automated messaging system or smth
          }

          const receiverSocketId = UsersConnectionList[receiver_id];
          if (receiverSocketId) {
            sockio.to(receiverSocketId).emit("receivedChatMessage", message);
          }
        } catch (e) {
          socket.emit("sendMessageError", {
            success: false,
            statusCode: 500,
            message: "Server error",
          });
        }
      }
    });
  });
};
