import { EMAIL_ACCOUNT, JWT_EXPIRES_IN, JWT_SECRET } from "../config/env.js";
import transporter from "../config/nodemailer.js";
import User from "../models/user.model.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { generateEmailTemplate } from "../utils/email-template.js";

export const getUser = async (req, res, next) => {
  try {
    // Lấy userId từ JWT trong cookie
    const userId = req.user._id;

    // Tìm người dùng trong database theo userId
    const user = await User.findById(userId).select("-password");

    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }

    res.status(200).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        accountType: user.accountType,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateUserByID = async (req, res) => {
  try {
    // Lấy userId từ JWT trong cookie
    const userId = req.user._id;

    const user = await User.findById(userId);

    if (user) {
      user.name = req.body.name || user.name;
      user.email = req.body.email || user.email;

      // Lưu thông tin đã cập nhật
      const updatedUser = await user.save();

      res.status(200).json({
        user: {
          id: updatedUser._id,
          name: updatedUser.name,
          email: updatedUser.email,
          accountType: updatedUser.accountType,
          isVerified: updatedUser.isVerified,
          createdAt: updatedUser.createdAt,
        },
      });
    } else {
      res.status(404);
      throw new Error("User not found");
    }
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) return res.status(400).json({ message: "Enter email!" });

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "This email not registered!" });
    }

    const token = jwt.sign({ email }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });

    const receiver = {
      from: EMAIL_ACCOUNT,
      to: email,
      subject: "Works For You: Reset Password",
      html: generateEmailTemplate({ userEmail: email, resetToken: token }),
    };

    await transporter.sendMail(receiver);
    return res
      .status(200)
      .json({ success: "Rest password link sent to your email." });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password)
      return res.status(400).json({ message: "Enter reset password" });

    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await User.findOne({ email: decoded.email });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    user.password = hashedPassword;

    await user.save();
    return res
      .status(200)
      .json({ message: "Password reset. Please log in again." });
  } catch (error) {
    console.log(error);

    return res.status(500).json({ message: "Error" });
  }
};
