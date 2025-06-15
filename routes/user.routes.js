import { Router } from "express";
import {
  forgotPassword,
  getUser,
  resetPassword,
  updateUserByID,
  updateUserProfile,
  uploadAvatar
} from "../controllers/user.controller.js";
import {
  authenticate,
} from "../middlewares/auth.middleware.js";
const userRouter = Router();

userRouter.get("/profile", authenticate, getUser);
userRouter.patch('/profile', authenticate, updateUserProfile);
userRouter.post("/upload_avatar", authenticate, uploadAvatar);
userRouter.put("/update", authenticate, updateUserByID);
userRouter.route("/forgot_password").post(forgotPassword);
userRouter.route("/reset_password/:token").post(resetPassword);

export default userRouter;
