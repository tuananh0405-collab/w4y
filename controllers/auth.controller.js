import bcrypt from "bcryptjs";
import User from "../models/user.model.js";
import generateToken from "../utils/generateToken.js";
import crypto from "crypto";
import transporter from "../config/nodemailer.js";
import {
  EMAIL_ACCOUNT,
  FE_URL,
  JWT_EXPIRES_IN,
  JWT_SECRET,
  NODE_ENV,
} from "../config/env.js";
import jwt from "jsonwebtoken";
import passport from "../config/passport.js";
import { body, validationResult } from "express-validator";

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

// Validation middleware for sign up
export const validateSignUp = [
  body("name")
    .trim()
    .notEmpty().withMessage("Name is required")
    .isLength({ min: 2, max: 50 }).withMessage("Name must be 2-50 characters")
    .matches(/^[a-zA-ZÀ-ỹ\s'.-]+$/u).withMessage("Name must be valid and not random characters"),
  body("email")
    .trim()
    .notEmpty().withMessage("Email is required")
    .isEmail().withMessage("Invalid email address"),
  body("password")
    .notEmpty().withMessage("Password is required")
    .isLength({ min: 8, max: 50 }).withMessage("Password must be 8-50 characters")
    .matches(/[A-Za-z]/).withMessage("Password must contain letters")
    .matches(/[0-9]/).withMessage("Password must contain numbers"),
  body("accountType")
    .notEmpty().withMessage("Account type is required")
    .isIn(["Nhà Tuyển Dụng", "Ứng Viên", "Admin"]).withMessage("Invalid account type"),
  body("gender")
    .optional()
    .isIn(["male", "female"]).withMessage("Gender must be 'male' or 'female'"),
  body("phone")
    .optional()
    .isMobilePhone("vi-VN").withMessage("Invalid Vietnamese phone number"),
  body("company")
    .optional()
    .isLength({ min: 2, max: 100 }).withMessage("Company name must be 2-100 characters")
    .matches(/^[a-zA-Z0-9À-ỹ\s'.-]+$/u).withMessage("Company name must be valid and not random characters"),
  body("city")
    .optional()
    .isLength({ min: 2, max: 100 }).withMessage("City must be 2-100 characters")
    .matches(/^[a-zA-ZÀ-ỹ\s'.-]+$/u).withMessage("City must be valid and not random characters"),
  body("district")
    .optional()
    .isLength({ min: 2, max: 100 }).withMessage("District must be 2-100 characters")
    .matches(/^[a-zA-ZÀ-ỹ\s'.-]+$/u).withMessage("District must be valid and not random characters"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    next();
  },
];

export const signUp = async (req, res, next) => {
  try {
    const {
      name,
      email,
      password,
      accountType,
      gender,
      phone,
      company,
      city,
      district,
    } = req.body;

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
    const verificationCode = crypto
      .randomBytes(3)
      .toString("hex")
      .toUpperCase();
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
      message:
        "Verification code sent to your email. Please verify your email before logging in.",
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
        points: user.points,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Đăng nhập admin
export const signInAdmin = async (req, res, next) => {
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

    if (user.accountType !== "Admin") {
      const error = new Error("You are not authorized to access this");
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
        points: user.points,
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
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Kiểm tra mã xác minh
    if (user.isVerified) {
      return res
        .status(400)
        .json({ success: false, message: "Email already verified" });
    }

    if (user.verificationCode !== verificationCode) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid verification code" });
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
      maxAge: 24 * 60 * 60 * 1000,
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

// Google Authentication Routes
export const googleAuth = (req, res, next) => {
  const accountType = req.query.accountType;
  passport.authenticate("google", {
    scope: ["profile", "email"],
    state: accountType, // Pass account type in state parameter
  })(req, res, next);
};

export const googleCallback = (req, res, next) => {
  passport.authenticate("google", { failureRedirect: "/auth" }, async (err, user) => {
    try {
      if (err) {
        const error = new Error(err.message);
        error.statusCode = 500;
        throw error;
      }

      if (!user) {
        const error = new Error("Google authentication failed");
        error.statusCode = 401;
        throw error;
      }

      // Generate JWT tokens
      generateToken(res, user._id);

      // Create user object with required structure to match normal login
      const userData = {
        success: true,
        message: "Google authentication successful",
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          accountType: user.accountType,
        },
        redirectUrl:FE_URL
      };

      // Send response with redirect URL and user data
      res.redirect(
        `${FE_URL}/auth/google/callback?user=${encodeURIComponent(
          JSON.stringify(userData)
        )}`
      );
    } catch (error) {
      next(error);
    }
  })(req, res, next);
};

// Validation middleware for admin sign up
export const validateAdminSignUp = [
  body("name")
    .trim()
    .notEmpty().withMessage("Name is required")
    .isLength({ min: 2, max: 50 }).withMessage("Name must be 2-50 characters")
    .matches(/^[a-zA-ZÀ-ỹ\s'.-]+$/u).withMessage("Name must be valid and not random characters"),
  body("email")
    .trim()
    .notEmpty().withMessage("Email is required")
    .isEmail().withMessage("Invalid email address"),
  body("password")
    .notEmpty().withMessage("Password is required")
    .isLength({ min: 8, max: 50 }).withMessage("Password must be 8-50 characters")
    .matches(/[A-Za-z]/).withMessage("Password must contain letters")
    .matches(/[0-9]/).withMessage("Password must contain numbers"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    next();
  },
];

// Admin sign up
export const adminSignUp = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ success: false, message: "Admin already exists" });
    }

    // Create new admin user
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      accountType: "Admin",
      isVerified: true, // Admins are verified by default
    });
    await newUser.save();

    res.status(201).json({
      success: true,
      message: "Admin account created successfully",
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        accountType: newUser.accountType,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Validation middleware for admin sign in
export const validateAdminSignIn = [
  body("email")
    .trim()
    .notEmpty().withMessage("Email is required")
    .isEmail().withMessage("Invalid email address"),
  body("password")
    .notEmpty().withMessage("Password is required"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    next();
  },
];

// Admin sign in
export const adminSignIn = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || user.accountType !== "Admin") {
      return res.status(404).json({ success: false, message: "Admin not found" });
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: "Invalid password" });
    }
    if (!user.isVerified) {
      return res.status(403).json({ success: false, message: "Admin account not verified" });
    }
    generateToken(res, user._id);
    res.status(200).json({
      success: true,
      message: "Admin signed in successfully",
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
