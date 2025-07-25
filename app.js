import express from "express";
import { FE_URL, JWT_SECRET, NODE_ENV, PORT } from "./config/env.js";
import cookieParser from "cookie-parser";
import cors from "cors";
import { Server } from "socket.io";
import http from "http";

import authRouter from "./routes/auth.routes.js";
import userRouter from "./routes/user.routes.js";
import applicantRouter from "./routes/applicant.routes.js";
import jobRouter from "./routes/job.routes.js";
import applicationRouter from "./routes/application.routes.js";
import paymentRouter from "./routes/payment.routes.js";
import reviewRouter from "./routes/review.routes.js";
import mediaRouter from "./routes/applicant-media-s3.routes.js";
import connectToDatabase from "./database/mongodb.js";
import errorMiddleware from "./middlewares/error.middleware.js";

import path from "path";
import { fileURLToPath } from "url";
import { setOnSendChatMessage } from "./events/onSendChatMessage.js";
import { setOnSetActiveConversation } from "./events/onSetActiveConversation.js";
import chatRouter from "./routes/chat.routes.js";
import jobCategoryRouter from "./routes/jobCategory.routes.js";
import jobSkillRouter from "./routes/jobSkill.routes.js";
import { connectToChromaDB } from "./database/chromadb.js";
import { syncAllJobsToChroma } from "./services/chroma.service.js";
import check from "check-types";
import analyticsRouter from "./routes/analytics.routes.js";

// Thêm đoạn này để lấy __dirname trong ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  cors({
    origin: FE_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// Thêm serve static để phục vụ thư mục uploads
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/user", userRouter);
app.use("/api/v1/applicant", applicantRouter);
app.use("/api/v1/job", jobRouter);
app.use("/api/v1/job-categories", jobCategoryRouter);
app.use("/api/v1/job-skills", jobSkillRouter);
app.use("/api/v1/application", applicationRouter);
app.use("/api/v1/payment", paymentRouter);
app.use("/api/v1/review", reviewRouter);
app.use("/api/v1/chat", chatRouter);
app.use("/api/v1/media", mediaRouter);
app.use("/api/v1/analytics", analyticsRouter);
app.use(errorMiddleware);

app.get("/", (req, res) => {
  res.send("Welcom to the W4Y");
});

// === Socket stuffs ===
const httpServer = http.createServer(app);
const sockio = new Server(httpServer, {
  cors: {
    origin: FE_URL,
    methods: ["GET", "POST", "PUT", "PATCH"],
    credentials: true,
  },
});

const UsersActiveConversationMap = [];
/* List of users and their conversation in memory
  {
     socketId: user's websocket id (mostly for socket-based identification)
     activeConversationId: id of the conversation on user's screen
  }
  */

sockio.on("connection", (socket) => {
  socket.emit("welcome", "init-ing"); // debug
  // console.log("Socket connected:", socket.id);

  setOnSetActiveConversation(socket, UsersActiveConversationMap);
  setOnSendChatMessage(sockio, socket, UsersActiveConversationMap);

  socket.on("disconnect", () => {
    // Removes user's entry from the active conversation list
    for (const [userId, conversation] of Object.entries(
      UsersActiveConversationMap,
    )) {
      if (conversation.socketId === socket.id) {
        delete UsersActiveConversationMap[userId];
        break;
      }
    }
  });
});

httpServer.listen(PORT, async () => {
  console.log(`listening on http://localhost:${PORT}`);

  if (NODE_ENV !== "test") {
    await connectToDatabase();
    await connectToChromaDB();
  }

  // Auto embed and sync (expensive on larger scales!) all jobs from mongodb to chromadb on production enviroment
  if (NODE_ENV === "production") {
    await syncAllJobsToChroma();
  }
});

export default app;
