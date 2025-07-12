import jwt from "jsonwebtoken";

import { JWT_SECRET } from "../config/env.js";
import User from "../models/user.model.js";

const authenticate = async (req, res, next) => {
  const token = req.cookies.accessToken;

  if (!token) {
    console.log("Unauthorized - no token");
    return res.status(401).json({ message: "Unauthorized - no token" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = await User.findById(decoded.userId).select("-password");
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized - user not found" });
    }
    next();
  } catch (error) {
    console.log("Unauthorized - invalid token");
    return res.status(401).json({ message: "Unauthorized - token invalid" });
  }
};

const authorizeAdmin = (req, res, next) => {
  if (req.user && req.user.accountType === "Admin") {
    next();
  } else {
    return res.status(403).json("Forbidden - Admins only");
  }
};


export { authenticate, authorizeAdmin };

