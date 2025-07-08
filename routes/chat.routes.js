import { Router } from "express";
import {
  getRecruitersGroupedByApplications,
  getChatHistory,
  getChatToken,
  getRecentMessagedUsers,
  getApplicantsGroupedByApplications,
  markMessagesAsRead,
} from "../controllers/chat.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const chatRouter = Router();

// Note: in the backend, id queries (such as "userId" or "senderId") that is a literal string "@" will be replaced by user id from the cookie.
chatRouter.get("/chatToken", authenticate, getChatToken);
chatRouter.get("/chatHistory", authenticate, getChatHistory);
chatRouter.get("/recentMessagedUsers", authenticate, getRecentMessagedUsers);
chatRouter.get(
  "/recruitersGroupedByApplications",
  authenticate,
  getRecruitersGroupedByApplications,
);

chatRouter.get(
  "/applicantsGroupedByApplications",
  authenticate,
  getApplicantsGroupedByApplications,
);
chatRouter.post("/markMessagesAsRead", authenticate, markMessagesAsRead);

export default chatRouter;
