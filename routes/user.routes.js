import { Router } from "express";
import {
  forgotPassword,
  getUser,
  resetPassword,
  updateUserByID,
  updateUserProfile,
  uploadAvatar,
  getTotalUserCount,
  getUserRoleCounts,
  getMonthlyUserGrowth,
  getQuarterlyUserGrowth,
  getYearlyUserGrowth,
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

// Admin dashboard features
//require authentication
userRouter.get("/stats/total", getTotalUserCount);
userRouter.get("/stats/role-counts", getUserRoleCounts);
userRouter.get("/stats/monthly-growth", getMonthlyUserGrowth);
userRouter.get("/stats/quarterly-growth", getQuarterlyUserGrowth); 
userRouter.get("/stats/yearly-growth", getYearlyUserGrowth);


export default userRouter;
