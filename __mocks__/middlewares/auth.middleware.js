import mongoose from "mongoose";

export const mockUserId = new mongoose.Types.ObjectId();

export const authenticate = (req, res, next) => {
  req.user = { _id: mockUserId };
  next();
};
