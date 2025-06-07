import { Router } from "express";
import {
  forgotPassword,
  getUser,
  resetPassword,
  updateUserByID,
  updateUserProfile,
  createUser,
  adminUpdateUser,
  deleteUser,
  getAllUsers,
  getRecruiterStats,
  updateRecruiterProfile,
} from "../controllers/user.controller.js";
import {
  authenticate,
  authorizeAdmin,
} from "../middlewares/auth.middleware.js";

const userRouter = Router();

userRouter.get("/profile", authenticate, getUser);
userRouter.patch('/profile', authenticate, updateUserProfile);
userRouter.put("/update", authenticate, updateUserByID);
userRouter.route("/forgot_password").post(forgotPassword);
userRouter.route("/reset_password/:token").post(resetPassword);

// Protected routes
userRouter.get("/profile", authenticate, getUser);
userRouter.put("/update", authenticate, updateUserByID);

// Admin routes
userRouter.post("/admin/create", authenticate, authorizeAdmin, createUser);
userRouter.put("/admin/update/:userId", authenticate, authorizeAdmin, adminUpdateUser);
userRouter.delete("/admin/delete/:userId", authenticate, authorizeAdmin, deleteUser);
userRouter.get("/admin/users", authenticate, authorizeAdmin, getAllUsers);

// Recruiter routes
userRouter.get("/recruiter/stats", authenticate, getRecruiterStats);
userRouter.put("/recruiter/profile", authenticate, updateRecruiterProfile);

export default userRouter;
