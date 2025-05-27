import { EMAIL_ACCOUNT, JWT_EXPIRES_IN, JWT_SECRET } from "../config/env.js";
import transporter from "../config/nodemailer.js";
import User from "../models/user.model.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { generateEmailTemplate } from "../utils/email-template.js";
import ApplicantProfile from "../models/applicantProfile.model.js";

export const getUser = async (req, res, next) => {
  try {
    // Lấy userId từ JWT trong cookie
    const userId = req.user._id;

    // Tìm user lấy thông tin cơ bản
    const user = await User.findById(userId).select('name email phone');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Tìm ApplicantProfile theo userId lấy skills, education
    const profile = await ApplicantProfile.findOne({ userId }).select('skills education jobTitle resumeFiles');

    res.status(200).json({
      success: true,
      data: {
        name: user.name,
        email: user.email,
        phone: user.phone,
        skills: profile?.skills || [],
        education: profile?.education || '',
        jobTitle: profile?.jobTitle || '',
        resumeFiles: profile?.resumeFiles || [],
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

    // Cập nhật hoặc tạo ApplicantProfile (skills, jobTitle)
    let profile = await ApplicantProfile.findOne({ userId });
    if (!profile) {
      profile = new ApplicantProfile({ userId });
    }

    profile.jobTitle = req.body.jobTitle || profile.jobTitle;
    profile.skills = req.body.skills || profile.skills; // expects array of strings

    await profile.save();

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          phone: user.phone,
          city: user.city,
          district: user.district,
        },
        profile: {
          jobTitle: profile.jobTitle,
          skills: profile.skills,
        }
      }
    });

  } catch (error) {
    next(error);
  }
};
