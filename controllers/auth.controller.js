import bcrypt from "bcryptjs";
import User from "../models/user.model.js";
import generateToken from "../utils/generateToken.js";
import crypto from "crypto";
import transporter from "../config/nodemailer.js";
import { EMAIL_ACCOUNT, JWT_EXPIRES_IN, JWT_SECRET, NODE_ENV } from "../config/env.js";
import jwt from "jsonwebtoken";

// Đăng ký người dùng
// export const signUp = async (req, res, next) => {
//   try {
//     const { name, email, password, accountType } = req.body;

//     // Kiểm tra người dùng đã tồn tại chưa
//     const existingUser = await User.findOne({ email });

//     if (existingUser) {
//       const error = new Error("User already exists");
//       error.statusCode = 409;
//       throw error;
//     }

//     // Tạo người dùng mới
//     const newUser = new User({
//       name,
//       email,
//       password, 
//       accountType,
//     });

//     // Tạo mã xác minh
//     const verificationCode = crypto.randomBytes(3).toString("hex").toUpperCase();
//     newUser.verificationCode = verificationCode;

//     // Lưu người dùng mới vào cơ sở dữ liệu
//     await newUser.save();

//     // Gửi email với mã xác minh
//     const mailOptions = {
//       from: EMAIL_ACCOUNT,
//       to: email,
//       subject: "Verify Your Email",
//       text: `Your verification code is: ${verificationCode}`,
//     };

//     await transporter.sendMail(mailOptions);

//     res.status(200).json({
//       success: true,
//       message: "Verification code sent to your email. Please verify your email before logging in.",
//     });
//   } catch (error) {
//     next(error);
//   }
// };

export const signUp = async (req, res, next) => {
  try {
    const { name, email, password, accountType, gender, phone, company, city, district } = req.body;

    // Kiểm tra người dùng đã tồn tại chưa
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      const error = new Error("User already exists");
      error.statusCode = 409;
      throw error;
    }

    // Tạo người dùng mới
    const newUser = new User({
      name,
      email,
      password,
      accountType,
      gender,
      phone,
      company,
      city,
      district,
    });

    // Mã hóa mật khẩu trước khi lưu vào DB
    const salt = await bcrypt.genSalt(10);
    newUser.password = await bcrypt.hash(password, salt);

    // Tạo mã xác minh
    const verificationCode = crypto.randomBytes(3).toString("hex").toUpperCase();
    newUser.verificationCode = verificationCode;

    // Lưu người dùng mới vào cơ sở dữ liệu
    await newUser.save();

    // Gửi email với mã xác minh
    const mailOptions = {
      from: EMAIL_ACCOUNT,
      to: email,
      subject: "Verify Your Email",
      text: `Your verification code is: ${verificationCode}`,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({
      success: true,
      message: "Verification code sent to your email. Please verify your email before logging in.",
    });
  } catch (error) {
    next(error);
  }
};

// Đăng nhập người dùng
export const signIn = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Tìm người dùng theo email
    const user = await User.findOne({ email });

    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }

    // Kiểm tra mật khẩu
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      const error = new Error("Invalid password");
      error.statusCode = 401;
      throw error;
    }

    // Kiểm tra xem email đã được xác minh chưa
    if (!user.isVerified) {
      const error = new Error("Email not verified");
      error.statusCode = 403;
      throw error;
    }

    // Tạo JWT Token
    generateToken(res, user._id);
    res.status(200).json({
      success: true,
      message: "User signed in successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        accountType: user.accountType,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Đăng xuất người dùng
export const signOut = async (req, res, next) => {
  try {
    res.cookie("accessToken", "", {
      httpOnly: true,
      expires: new Date(0),
    });
    res.cookie("refreshToken", "", {
      httpOnly: true,
      expires: new Date(0),
    });

    res.status(200).json({
      success: true,
      message: "User signed out successfully",
    });
  } catch (error) {
    next(error);
  }
};

// Xác minh email người dùng
export const verifyEmail = async (req, res, next) => {
  try {
    const { email, verificationCode, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Kiểm tra mã xác minh
    if (user.isVerified) {
      return res.status(400).json({ success: false, message: "Email already verified" });
    }

    if (user.verificationCode !== verificationCode) {
      return res.status(400).json({ success: false, message: "Invalid verification code" });
    }

    // Mã hóa lại mật khẩu và xác minh email
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    user.isVerified = true;
    user.verificationCode = null; // Xóa mã xác minh

    await user.save();

    res.status(200).json({
      success: true,
      message: "Email verified successfully. You can now log in.",
    });
  } catch (error) {
    next(error);
  }
};

// Refresh token
export const refreshToken = async (req, res, next) => {
  const { refreshToken } = req.cookies;

  if (!refreshToken) {
    return res.status(401).json({ message: "No refresh token provided" });
  }

  try {
    const decoded = jwt.verify(refreshToken, JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    const accessToken = jwt.sign({ userId: user._id }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });

    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: NODE_ENV !== "development",
      sameSite: "strict",
      maxAge: 24*60*60*1000,
    });

    res.status(200).json({
      success: true,
      accessToken,
    });
  } catch (err) {
    console.error(err);
    return res.status(401).json({ message: "Invalid refresh token" });
  }
};
