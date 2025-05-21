import express from "express";
import { JWT_SECRET, PORT, NODE_ENV } from "./config/env.js";
import cookieParser from "cookie-parser";
import cors from "cors";

import authRouter from "./routes/auth.routes.js";
import userRouter from "./routes/user.routes.js";
import applicantRouter from "./routes/applicant.routes.js";
import jobRouter from "./routes/job.routes.js";
import applicationRouter from "./routes/application.routes.js";
import paymentRouter from "./routes/payment.routes.js";
import reviewRouter from "./routes/review.routes.js";
import connectToDatabase from "./database/mongodb.js";
import errorMiddleware from "./middlewares/error.middleware.js";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors({ origin: "http://localhost:3001", credentials: true }));

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/user", userRouter);
app.use("/api/v1/applicant", applicantRouter);
app.use("/api/v1/job", jobRouter);
app.use("/api/v1/application", applicationRouter);
app.use("/api/v1/payment", paymentRouter);
app.use("/api/v1/review", reviewRouter);
app.use(errorMiddleware);

app.get("/", (req, res) => {
  res.send("Welcom to the W4Y");
});

if (NODE_ENV !== "test") {
  app.listen(PORT, async () => {
    console.log(`listening on http://localhost:${PORT}`);
    await connectToDatabase();
  });
}

export default app;
