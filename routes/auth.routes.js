import { Router } from "express";
import {
    refreshToken,
    signIn,
    signOut,
    signUp,
    verifyEmail,
    googleAuth,
    googleCallback,
    validateSignUp,
  } from "../controllers/auth.controller.js";
const authRouter = Router();

authRouter.post("/sign-up", validateSignUp, signUp);
authRouter.post("/sign-in", signIn);
authRouter.post("/sign-out", signOut);
authRouter.post("/verify-email", verifyEmail);
authRouter.post("/refresh-token", refreshToken);

// Google OAuth routes
authRouter.get("/google", googleAuth);
authRouter.get("/google/callback", googleCallback);

export default authRouter;
