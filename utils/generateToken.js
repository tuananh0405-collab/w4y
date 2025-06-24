import jwt from "jsonwebtoken";
import { JWT_EXPIRES_IN, JWT_REFRESH_EXPIRES_IN, JWT_SECRET, NODE_ENV } from "../config/env.js";

const generateToken = (res, userId) => {
  const accessToken = jwt.sign({ userId }, JWT_SECRET,  { expiresIn: JWT_EXPIRES_IN });
  const refreshToken = jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN });

  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: NODE_ENV !== "development",
    sameSite: "strict",
    maxAge:  24*60*60*1000,
  });
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: NODE_ENV !== "development",
    sameSite: "strict",
    maxAge:  24*60*60*1000*7,
  });
  
  return {accessToken, refreshToken};
};

export default generateToken;
