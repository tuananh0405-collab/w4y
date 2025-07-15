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
  getUserList,
  getTopCities,
  getAgeGenderPyramid
} from "../controllers/user.controller.js";
import {
  authenticate, authorizeAdmin
} from "../middlewares/auth.middleware.js";
const userRouter = Router();

userRouter.get("/profile", authenticate, getUser);
userRouter.patch('/profile', authenticate, updateUserProfile);
userRouter.post("/upload_avatar", authenticate, uploadAvatar);
userRouter.put("/update", authenticate, updateUserByID);
userRouter.route("/forgot_password").post(forgotPassword);
userRouter.route("/reset_password/:token").post(resetPassword);

// Admin dashboard features
userRouter.get("/stats/total", authenticate, authorizeAdmin, getTotalUserCount);
userRouter.get("/stats/role-counts", authenticate, authorizeAdmin, getUserRoleCounts);
userRouter.get("/stats/monthly-growth", authenticate, authorizeAdmin, getMonthlyUserGrowth);
userRouter.get("/stats/quarterly-growth", authenticate, authorizeAdmin, getQuarterlyUserGrowth); 
userRouter.get("/stats/yearly-growth", authenticate, authorizeAdmin, getYearlyUserGrowth);
userRouter.get("/control/list", authenticate, authorizeAdmin, getUserList);
userRouter.get("/stats/topcities", authenticate, authorizeAdmin, getTopCities);
userRouter.get("/stats/age-gender-pyramid", authenticate, authorizeAdmin, getAgeGenderPyramid);
export default userRouter;
