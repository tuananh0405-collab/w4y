import { Router } from "express";
import { getChatHistory, getChatToken } from "../controllers/chat.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const chatRouter = Router();

chatRouter.post("/chatToken", authenticate, getChatToken);
chatRouter.post("/chatHistory", authenticate, getChatHistory);

export default chatRouter;
