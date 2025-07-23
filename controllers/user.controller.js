import { EMAIL_ACCOUNT, JWT_EXPIRES_IN, JWT_SECRET } from "../config/env.js";
import transporter from "../config/nodemailer.js";
import User from "../models/user.model.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { generateEmailTemplate } from "../utils/email-template.js";
import ApplicantProfile from "../models/applicantProfile.model.js";
import cloudinary from '../config/cloudinary.js';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';
import path from 'path';
import { buildMongoFilters } from "../utils/buildMongoFilters.js";

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    resource_type: 'raw',
    public_id: (req, file) => {
      const ext = path.extname(file.originalname);
      const baseName = path.parse(file.originalname).name;
      // Sanitize tên file để chỉ chứa ký tự an toàn
      const safeName = baseName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
      return `${req.user._id}-${safeName}-${Date.now()}${ext}`;
    },
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpg|jpeg|png/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error("Only JPG, JPEG, and PNG files are allowed!"));
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }  // Giới hạn kích thước image tối đa (5MB)
});

export const getUser = async (req, res, next) => {
  try {
    // Lấy userId từ JWT trong cookie
    const userId = req.user._id;

    // Tìm user lấy thông tin cơ bản
    const user = await User.findById(userId).select('name email phone city district avatarUrl');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Tìm ApplicantProfile theo userId lấy skills, education
    const profile = await ApplicantProfile.findOne({ userId }).select('skills education jobTitle resumeFiles userDetail level openToWork timeWork experience');

    res.status(200).json({
      success: true,
      data: {
        name: user.name,
        email: user.email,
        phone: user.phone,
        city: user.city,
        district: user.district,
        skills: profile?.skills || [],
        education: profile?.education || '',
        jobTitle: profile?.jobTitle || '',
        resumeFiles: profile?.resumeFiles || [],
        avatarUrl: user.avatarUrl || '',
        userDetail: profile?.userDetail || '',
        level: profile?.level || '',
        openToWork: profile?.openToWork || '',
        timeWork: profile?.timeWork || '',
        experience: profile?.experience || '',
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
    return res.status(200).json({ success: "Rest password link sent to your email." });
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
    return res.status(200).json({ message: "Password reset. Please log in again." });
  } catch (error) {
    console.log(error);

    return res.status(500).json({ message: "Error" });
  }
};

export const updateUserProfile = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Cập nhật user cơ bản (email, phone,...)
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.email = req.body.email || user.email;
    user.phone = req.body.phone || user.phone;
    user.city = req.body.city || user.city;
    user.district = req.body.district || user.district;

    await user.save();

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          phone: user.phone,
          city: user.city,
          district: user.district,
        }
      }
    });

  } catch (error) {
    next(error);
  }
};

export const uploadAvatar = [
  upload.single('avatar'),  // Đảm bảo rằng tên trường trong form-data là 'avatar'
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: "No file uploaded" });
      }
      const userId = req.user._id;
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      // Nếu user đã có avatarUrl, xóa ảnh cũ trên Cloudinary
      if (user.avatarUrl) {
        const urlParts = user.avatarUrl.split('/').pop();
        // Xóa ảnh cũ
        await cloudinary.uploader.destroy(urlParts, { resource_type: 'raw' });
      }
      if (!req.file.path) {
        return res.status(400).json({ success: false, message: "File upload failed" });
      }
      // Cập nhật URL ảnh đại diện mới
      user.avatarUrl = req.file.path;

      await user.save();

      res.status(200).json({
        success: true,
        data: { avatarUrl: user.avatarUrl },
      });
    } catch (error) {
      next(error);
    }
  },
];

export const getTotalUserCount = async (req, res) => {
  try {
    const applicantCount = await User.countDocuments({ accountType: "Ứng Viên" });
    const recruiterCount = await User.countDocuments({ accountType: "Nhà Tuyển Dụng" });

    const total = applicantCount + recruiterCount;

    res.json({ total });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getUserRoleCounts = async (req, res) => {
  try {
    const applicant = await User.countDocuments({ accountType: "Ứng Viên" });
    const recruiter = await User.countDocuments({ accountType: "Nhà Tuyển Dụng" });
    res.json({ applicant, recruiter });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getMonthlyUserGrowth = async (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();

    const startDate = new Date(`${year}-01-01`);
    const endDate = new Date(`${year + 1}-01-01`);

    const stats = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lt: endDate },
          accountType: { $in: ["Ứng Viên", "Nhà Tuyển Dụng"] },
        },
      },
      {
        $group: {
          _id: {
            month: { $month: "$createdAt" },
            role: "$accountType",
          },
          count: { $sum: 1 },
        },
      },
    ]);

    // Initialize 12 months
    const monthlyData = {
      applicant: Array(12).fill(0),
      recruiter: Array(12).fill(0),
    };

    stats.forEach(({ _id, count }) => {
      const { month, role } = _id;
      const index = month - 1;
      if (role === "Ứng Viên") monthlyData.applicant[index] = count;
      else if (role === "Nhà Tuyển Dụng") monthlyData.recruiter[index] = count;
    });

    res.json({ year, data: monthlyData });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch monthly user growth", error: err.message });
  }
};

export const getQuarterlyUserGrowth = async (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const startDate = new Date(`${year}-01-01`);
    const endDate = new Date(`${year + 1}-01-01`);

    const stats = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lt: endDate },
          accountType: { $in: ["Ứng Viên", "Nhà Tuyển Dụng"] },
        },
      },
      {
        $addFields: {
          quarter: { $ceil: { $divide: [{ $month: "$createdAt" }, 3] } },
        },
      },
      {
        $group: {
          _id: {
            quarter: "$quarter",
            role: "$accountType",
          },
          count: { $sum: 1 },
        },
      },
    ]);

    const quarterlyData = {
      applicant: Array(4).fill(0),
      recruiter: Array(4).fill(0),
    };

    stats.forEach(({ _id, count }) => {
      const { quarter, role } = _id;
      const index = quarter - 1;
      if (role === "Ứng Viên") quarterlyData.applicant[index] = count;
      else if (role === "Nhà Tuyển Dụng") quarterlyData.recruiter[index] = count;
    });

    res.json({ year, data: quarterlyData });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch quarterly user growth", error: err.message });
  }
};

export const getYearlyUserGrowth = async (req, res) => {
  try {
    const endYear = parseInt(req.query.endYear) || new Date().getFullYear();
    const startYear = endYear - 3;

    const startDate = new Date(`${startYear}-01-01`);
    const endDate = new Date(`${endYear + 1}-01-01`);

    const stats = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lt: endDate },
          accountType: { $in: ["Ứng Viên", "Nhà Tuyển Dụng"] },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            role: "$accountType",
          },
          count: { $sum: 1 },
        },
      },
    ]);

    const yearlyData = {
      applicant: Array(4).fill(0),
      recruiter: Array(4).fill(0),
    };

    stats.forEach(({ _id, count }) => {
      const { year, role } = _id;
      const index = year - startYear;
      if (role === "Ứng Viên") yearlyData.applicant[index] = count;
      else if (role === "Nhà Tuyển Dụng") yearlyData.recruiter[index] = count;
    });

    res.json({ years: [startYear, startYear + 1, startYear + 2, endYear], data: yearlyData });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch yearly user growth", error: err.message });
  }
};

export const getUserList = async (req, res) => {
  try {
    const {
      page = 1,
      pageSize = 10,
      sortField = "createdAt",
      sortOrder = "desc",
      filters = [],
    } = req.query;

    const parsedFilters = typeof filters === "string" ? JSON.parse(filters) : filters;

    const filterQuery = buildMongoFilters(parsedFilters);

    // Exclude Admins
    filterQuery.accountType = { $ne: "Admin" };

    const skip = (Number(page) - 1) * Number(pageSize);

    const total = await User.countDocuments(filterQuery);

    const users = await User.find(filterQuery)
      .sort({ [sortField]: sortOrder === "desc" ? -1 : 1 })
      .skip(skip)
      .limit(Number(pageSize));

    res.json({
      users,
      total,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getTopCities = async (req, res) => {
  try {
    const topCities = await User.aggregate([
      { 
        $match: { city: { $ne: null, $ne: "" } } 
      },
      {
        $group: {
          _id: "$city",
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 10
      },
      {
        $project: {
          _id: 0,
          city: "$_id",
          count: 1
        }
      }
    ]);

    res.json(topCities);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getAgeGenderPyramid = async (req, res) => {
  try {
    const pyramid = await User.aggregate([
      {
        $match: {
          dateOfBirth: { $ne: null },
          gender: { $in: ["male", "female"] },
        },
      },
      {
        $addFields: {
          age: {
            $subtract: [
              { $year: new Date() },
              { $year: "$dateOfBirth" },
            ],
          },
        },
      },
      {
        $group: {
          _id: "$age",
          male: {
            $sum: {
              $cond: [{ $eq: ["$gender", "male"] }, 1, 0],
            },
          },
          female: {
            $sum: {
              $cond: [{ $eq: ["$gender", "female"] }, 1, 0],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          age: "$_id",
          male: 1,
          female: 1,
        },
      },
      {
        $sort: { age: 1 }, 
      },
    ]);

    res.json(pyramid);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

