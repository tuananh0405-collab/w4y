import ChatMessage from "../models/chatMessage.model.js";
import User from "../models/user.model.js";
import makeConvesationId from "../utils/makeConversationId.js";
import withChatTokenValidation from "../utils/withChatTokenValidation.js";

export const setOnSendChatMessage = (
  sockio,
  socket,
  UsersActiveConversationMap,
) => {
  socket.on("sendChatMessage", ({ chatToken, receiverId, message }) => {
    withChatTokenValidation(chatToken, socket, async (decoded) => {
      try {
        const { senderId } = decoded;

        const receiver = await User.findById(receiverId);
        if (!receiver) {
          socket.emit("sendMessageError", {
            success: false,
            statusCode: 400,
            message: "Receiver does not exists",
          });
          console.log("Receiver does not exists");
          return;
        }

        const newMessage = new ChatMessage({
          senderId,
          receiverId,
          message,
          is_read: false,
        });

        console.log("Saving message");
        console.log(newMessage);

        await newMessage.save();

        const senderConversation = UsersActiveConversationMap[senderId];
        if (senderConversation && senderConversation.activeConversationId) {
          sockio
            .to(senderConversation.activeConversationId)
            .emit("receivedChatMessage", newMessage);
        } else {
          // Kinda sus that the sender isn't in a conversation but still sending messages but idk it can be an automated messaging system or smth
          const conversationId = makeConvesationId(senderId, receiverId);
          sockio.to(conversationId).emit("receivedChatMessage", newMessage);
        }
      } catch (e) {
        socket.emit("sendMessageError", {
          success: false,
          statusCode: 500,
          message: "Server error",
        });
      }
    });
  });
};
