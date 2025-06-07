import { Router } from "express";
import { getChatToken } from "../controllers/chat.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const chatRouter = Router();

chatRouter.post("/getChatToken", authenticate, getChatToken);

export default chatRouter;
