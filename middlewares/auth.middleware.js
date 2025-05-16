import jwt from 'jsonwebtoken'

import { JWT_SECRET } from '../config/env.js'
import User from '../models/user.model.js'

const authenticate = async (req, res, next) => {
  let token;

  token = req.cookies.accessToken;

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = await User.findById(decoded.userId).select("-password");
      next();
    } catch (error) {
      res.status(401);
      throw new Error("Unauthorized - token invalid");
    }
  } else {
    res.status(401);
    throw new Error("Unauthorized - no token");
  }
}



export {authenticate}