import { Router } from "express";
import {
  getRecruitersGroupedByApplications,
  getMessages,
  getChatToken,
  getConversations,
  getApplicantsGroupedByApplications,
  markMessagesAsRead,
  getUnreadMessagesSenders,
} from "../controllers/chat.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const chatRouter = Router();

chatRouter.get("/token", authenticate, getChatToken);
chatRouter.get("/messages", authenticate, getMessages);
chatRouter.get("/conversations", authenticate, getConversations);
chatRouter.get(
  "/recruiters-by-applications",
  authenticate,
  getRecruitersGroupedByApplications,
);

chatRouter.get(
  "/applicants-by-applications",
  authenticate,
  getApplicantsGroupedByApplications,
);
chatRouter.patch("/mark-read", authenticate, markMessagesAsRead);
chatRouter.get(
  "/unread-messages-senders",
  authenticate,
  getUnreadMessagesSenders,
);

export default chatRouter;
