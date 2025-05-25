import { EMAIL_ACCOUNT, JWT_EXPIRES_IN, JWT_SECRET } from "../config/env.js";
import transporter from "../config/nodemailer.js";
import User from "../models/user.model.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { generateEmailTemplate } from "../utils/email-template.js";
import Job from "../models/job.model.js";

// Admin: Create new user (o)
export const createUser = async (req, res, next) => {
  try {
    const {
      name,
      email,
      password,
      accountType,
      phone,
      company,
      city,
      district,
      gender,
    } = req.body;

    // Check if user is admin
    if (req.user.accountType !== "Admin") {
      return res.status(403).json({ message: "Only admins can create users" });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    // Generate salt and hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      accountType,
      phone,
      company,
      city,
      district,
      gender,
      isVerified: true, // Admin-created accounts are automatically verified
    });

    await newUser.save();

    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        accountType: newUser.accountType,
        phone: newUser.phone,
        company: newUser.company,
        city: newUser.city,
        district: newUser.district,
        gender: newUser.gender,
        isVerified: newUser.isVerified,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Admin: Update user
export const adminUpdateUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const {
      name,
      email,
      password,
      accountType,
      phone,
      company,
      city,
      district,
      gender,
    } = req.body;

    // Check if user is admin
    if (req.user.accountType !== "Admin") {
      return res.status(403).json({ message: "Only admins can update users" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update fields if provided
    if (name) user.name = name;
    if (email) user.email = email;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }
    if (accountType) user.accountType = accountType;
    if (phone) user.phone = phone;
    if (company) user.company = company;
    if (city) user.city = city;
    if (district) user.district = district;
    if (gender) user.gender = gender;

    await user.save();

    res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        accountType: user.accountType,
        phone: user.phone,
        company: user.company,
        city: user.city,
        district: user.district,
        gender: user.gender,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Admin: Delete user
export const deleteUser = async (req, res, next) => {
  try {
    const { userId } = req.params;

    // Check if user is admin
    if (req.user.accountType !== "Admin") {
      return res.status(403).json({ message: "Only admins can delete users" });
    }

    // Check if trying to delete self
    if (userId === req.user._id.toString()) {
      return res
        .status(400)
        .json({ message: "Cannot delete your own account" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // If user is a recruiter, delete their jobs
    if (user.accountType === "Recruiter") {
      await Job.deleteMany({ recruiterId: userId });
    }

    await User.findByIdAndDelete(userId);

    res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

// Admin: Get all users with advanced search
export const getAllUsers = async (req, res, next) => {
  try {
    // Check if user is admin
    if (req.user.accountType !== "Admin") {
      return res
        .status(403)
        .json({ message: "Only admins can view all users" });
    }

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Sorting
    const sortField = req.query.sortBy || "createdAt";
    const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;
    const sort = { [sortField]: sortOrder };

    // Search and Filter
    const query = {};

    // Text search
    if (req.query.search) {
      query.$or = [
        { name: { $regex: req.query.search, $options: "i" } },
        { email: { $regex: req.query.search, $options: "i" } },
        { company: { $regex: req.query.search, $options: "i" } },
      ];
    }

    // Filter by account type - handle case sensitivity
    if (req.query.accountType) {
      // Convert to proper case format
      const accountType = req.query.accountType.charAt(0).toUpperCase() + 
                         req.query.accountType.slice(1).toLowerCase();
      query.accountType = accountType;
    }

    // Filter by verification status
    if (req.query.isVerified !== undefined) {
      query.isVerified = req.query.isVerified === "true";
    }

    // Filter by gender
    if (req.query.gender) {
      query.gender = req.query.gender;
    }

    // Filter by city
    if (req.query.city) {
      query.city = { $regex: req.query.city, $options: "i" };
    }

    // Filter by district
    if (req.query.district) {
      query.district = { $regex: req.query.district, $options: "i" };
    }

    // Date range filter
    if (req.query.startDate || req.query.endDate) {
      query.createdAt = {};
      if (req.query.startDate) {
        query.createdAt.$gte = new Date(req.query.startDate);
      }
      if (req.query.endDate) {
        query.createdAt.$lte = new Date(req.query.endDate);
      }
    }

    // Execute query with pagination and sorting
    const [users, total] = await Promise.all([
      User.find(query)
        .select("-password")
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(query),
    ]);

    // Calculate pagination info
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    res.status(200).json({
      success: true,
      data: {
        users,
        pagination: {
          total,
          totalPages,
          currentPage: page,
          limit,
          hasNextPage,
          hasPrevPage,
        },
        filters: {
          search: req.query.search || null,
          accountType: req.query.accountType || null,
          isVerified: req.query.isVerified || null,
          gender: req.query.gender || null,
          city: req.query.city || null,
          district: req.query.district || null,
          startDate: req.query.startDate || null,
          endDate: req.query.endDate || null,
        },
        sorting: {
          field: sortField,
          order: sortOrder === 1 ? "asc" : "desc",
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

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

// Get recruiter profile statistics
export const getRecruiterStats = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Get total jobs posted
    const totalJobs = await Job.countDocuments({ recruiterId: userId });

    // Get jobs by priority level
    const featuredJobs = await Job.countDocuments({
      recruiterId: userId,
      priorityLevel: "Featured",
    });

    const regularJobs = await Job.countDocuments({
      recruiterId: userId,
      priorityLevel: "Regular",
    });

    // Get user profile
    const user = await User.findById(userId)
      .select("name email phone company city district gender")
      .lean();

    res.status(200).json({
      success: true,
      data: {
        profile: user,
        statistics: {
          totalJobs,
          featuredJobs,
          regularJobs,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// Update recruiter profile
export const updateRecruiterProfile = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { name, phone, company, city, district, gender } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update fields if provided
    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (company) user.company = company;
    if (city) user.city = city;
    if (district) user.district = district;
    if (gender) user.gender = gender;

    await user.save();

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: {
        name: user.name,
        email: user.email,
        phone: user.phone,
        company: user.company,
        city: user.city,
        district: user.district,
        gender: user.gender,
      },
    });
  } catch (error) {
    next(error);
  }
};
