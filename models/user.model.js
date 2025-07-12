import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },

  email: {
    type: String,
    required: true,
    unique: true,
  },

  password: {
    type: String,
    required: true,
  },

  avatarUrl: {
    type: String,
    default: "",
  },

  accountType: {
    type: String,
    enum: ["Nhà Tuyển Dụng", "Ứng Viên", "Admin"],
    required: true,
  },

  googleId: {
    type: String,
    unique: true,
    sparse: true,
  },

  points: {
    type: Number,
    default: 0,
    min: 0,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },

  isVerified: {
    type: Boolean,
    default: false,
  },

  verificationCode: String,

  gender: {
    type: String,
    enum: ["male", "female"],
  },

  phone: String,

  company: String,

  city: String,

  district: String,

  dateOfBirth: {
    type: Date,
  },

  status: {
    type: String,
    enum: ["Active", "Suspended"],
    default: "Active",
  },
  dateOfBirth: {
    type: Date,
  },
  status: {
    type: String,
    enum: ["Active", "Suspended"],
    default: "Active",
  },
});

const User = mongoose.model("User", userSchema);

export default User;
