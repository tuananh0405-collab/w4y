import { Router } from "express";
import {
  forgotPassword,
  getUser,
  resetPassword,
  updateUserByID,
} from "../controllers/user.controller.js";
import {
  authenticate,
} from "../middlewares/auth.middleware.js";
const userRouter = Router();

userRouter.get("/profile", authenticate, getUser);
userRouter.put("/update", authenticate, updateUserByID);
userRouter.route("/forgot_password").post(forgotPassword);
userRouter.route("/reset_password/:token").post(resetPassword);

export default userRouter;
