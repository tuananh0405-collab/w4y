import User from "../models/user.model.js";
import makeConversationId from "../utils/makeConversationId.js";
import withChatTokenValidation from "../utils/withChatTokenValidation.js";

export const setOnSetActiveConversation = (
  socket,
  UsersActiveConversationMap,
) => {
  socket.on("setActiveConversation", ({ chatToken, receiverId }) => {
    withChatTokenValidation(chatToken, socket, async (decoded) => {
      try {
        const { senderId } = decoded;

        const receiver = await User.findById(receiverId);
        if (!receiver) {
          socket.emit("connectToConversation", {
            success: false,
            statusCode: 400,
            message: "Receiver does not exists",
          });
          return;
        }

        if (UsersActiveConversationMap[senderId]?.conversationId) {
          socket.leave(UsersActiveConversationMap[senderId].conversationId);
        }

        // Assigns the conversation between sender and the requested receiver as sender's active conversation
        const conversationId = makeConversationId(senderId, receiverId);
        UsersActiveConversationMap[senderId] = {
          socketId: socket.id,
          activeConversationId: conversationId,
        };
        socket.join(conversationId);

        socket.emit("connectToConversation", {
          success: true,
          statusCode: 200,
          message: "Successfull",
          receiver,
        });
      } catch (e) {
        socket.emit("connectToConversation", {
          success: false,
          statusCode: 500,
          message: "Server error",
        });
      }
    });
  });
};
