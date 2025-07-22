// Mock all dependencies BEFORE importing anything
jest.mock("../../models/user.model.js");
jest.mock("../../models/applicantProfile.model.js");
jest.mock("../../utils/generateToken.js");
jest.mock("../../config/nodemailer.js", () => ({
  default: {
    sendMail: jest.fn(),
  },
}));
jest.mock("../../config/cloudinary.js", () => ({
  default: {
    uploader: {
      destroy: jest.fn(),
    },
  },
}));
jest.mock("../../config/env.js", () => ({
  JWT_SECRET: "test-jwt-secret",
  JWT_EXPIRES_IN: "24h",
  EMAIL_ACCOUNT: "test@example.com",
  FE_URL: "http://localhost:3000"
}));
jest.mock("../../utils/email-template.js", () => ({
  generateEmailTemplate: jest.fn(),
}));
jest.mock("../../utils/buildMongoFilters.js", () => ({
  buildMongoFilters: jest.fn(),
}));
jest.mock("bcryptjs");
jest.mock("jsonwebtoken");
jest.mock("multer", () => {
  const multer = () => ({
    single: jest.fn(() => (req, res, next) => {
      req.file = {
        path: "http://cloudinary.com/test-avatar.jpg",
        originalname: "avatar.jpg",
      };
      next();
    }),
  });
  return multer;
});
jest.mock("multer-storage-cloudinary");

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
  getUser,
  updateUserByID,
  forgotPassword,
  resetPassword,
  updateUserProfile,
  uploadAvatar,
  getTotalUserCount,
  getUserRoleCounts,
  getMonthlyUserGrowth,
  getQuarterlyUserGrowth,
  getYearlyUserGrowth,
  getUserList,
  getTopCities,
  getAgeGenderPyramid,
} from "../../controllers/user.controller.js";
import User from "../../models/user.model.js";
import ApplicantProfile from "../../models/applicantProfile.model.js";
import transporter from "../../config/nodemailer.js";
import cloudinary from "../../config/cloudinary.js";
import { generateEmailTemplate } from "../../utils/email-template.js";
import { buildMongoFilters } from "../../utils/buildMongoFilters.js";

describe("User Controller", () => {
  let req, res, next;
  let mockUser, mockProfile;

  beforeEach(() => {
    req = {
      body: {},
      params: {},
      query: {},
      user: { _id: "user123" },
      file: null,
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();

    mockUser = {
      _id: "user123",
      name: "Test User",
      email: "test@example.com",
      phone: "0123456789",
      avatarUrl: "http://cloudinary.com/avatar.jpg",
      accountType: "Ứng Viên",
      isVerified: true,
      createdAt: new Date(),
      city: "Hanoi",
      district: "Ba Dinh",
      save: jest.fn().mockResolvedValue(),
    };

    mockProfile = {
      _id: "profile123",
      userId: "user123",
      skillIds: ["skill1", "skill2"],
      education: "University",
      jobTitle: "Developer",
      resumeFiles: [],
      save: jest.fn().mockResolvedValue(),
    };

    // Reset all mocks
    jest.clearAllMocks();

    // Setup default mocks
    User.findById = jest.fn();
    User.findOne = jest.fn();
    User.countDocuments = jest.fn();
    User.find = jest.fn();
    User.aggregate = jest.fn();
    User.prototype.save = jest.fn();
    ApplicantProfile.findOne = jest.fn();
    ApplicantProfile.prototype.save = jest.fn();
    bcrypt.genSalt = jest.fn();
    bcrypt.hash = jest.fn();
    jwt.sign = jest.fn();
    jwt.verify = jest.fn();
    transporter.sendMail = jest.fn();
    // Don't reassign cloudinary.uploader.destroy here since it's already mocked
    generateEmailTemplate.mockReturnValue("<html>Reset email</html>");
    buildMongoFilters.mockReturnValue({});
  });

  describe("getUser", () => {
    beforeEach(() => {
      req.user = { _id: "user123" };
    });

    it("should get user successfully with profile", async () => {
      User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser),
      });
      ApplicantProfile.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockProfile),
      });

      await getUser(req, res, next);

      expect(User.findById).toHaveBeenCalledWith("user123");
      expect(ApplicantProfile.findOne).toHaveBeenCalledWith({
        userId: "user123",
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          name: "Test User",
          email: "test@example.com",
          phone: "0123456789",
          skillIds: ["skill1", "skill2"],
          education: "University",
          jobTitle: "Developer",
          resumeFiles: [],
          avatarUrl: "http://cloudinary.com/avatar.jpg",
        },
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should get user successfully without profile", async () => {
      User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser),
      });
      ApplicantProfile.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      await getUser(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          name: "Test User",
          email: "test@example.com",
          phone: "0123456789",
          skillIds: [],
          education: "",
          jobTitle: "",
          resumeFiles: [],
          avatarUrl: "http://cloudinary.com/avatar.jpg",
        },
      });
    });

    it("should return error if user not found", async () => {
      User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      await getUser(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "User not found",
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should handle database errors", async () => {
      const error = new Error("Database error");
      User.findById.mockReturnValue({
        select: jest.fn().mockRejectedValue(error),
      });

      await getUser(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("updateUserByID", () => {
    beforeEach(() => {
      req.body = {
        name: "Updated Name",
        email: "updated@example.com",
      };
    });

    it("should update user successfully", async () => {
      User.findById.mockResolvedValue(mockUser);
      mockUser.save.mockResolvedValue({
        ...mockUser,
        name: "Updated Name",
        email: "updated@example.com",
      });

      await updateUserByID(req, res, next);

      expect(User.findById).toHaveBeenCalledWith("user123");
      expect(mockUser.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        user: {
          id: "user123",
          name: "Updated Name",
          email: "updated@example.com",
          accountType: "Ứng Viên",
          isVerified: true,
          createdAt: mockUser.createdAt,
        },
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should return error if user not found", async () => {
      User.findById.mockResolvedValue(null);

      await updateUserByID(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });

    it("should handle database errors", async () => {
      const error = new Error("Database error");
      User.findById.mockRejectedValue(error);

      await updateUserByID(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("forgotPassword", () => {
    beforeEach(() => {
      req.body = {
        email: "test@example.com",
      };
    });

    it("should send reset password email successfully", async () => {
      User.findOne.mockResolvedValue(mockUser);
      jwt.sign.mockReturnValue("reset-token");
      transporter.sendMail.mockResolvedValue({ messageId: "test" });

      await forgotPassword(req, res, next);

      expect(User.findOne).toHaveBeenCalledWith({ email: "test@example.com" });
      expect(jwt.sign).toHaveBeenCalledWith(
        { email: "test@example.com" },
        "test-jwt-secret",
        { expiresIn: "24h" }
      );
      expect(transporter.sendMail).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: "Rest password link sent to your email.",
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should return error if email not provided", async () => {
      req.body = {};

      await forgotPassword(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "Enter email!",
      });
    });

    it("should return error if email not registered", async () => {
      User.findOne.mockResolvedValue(null);

      await forgotPassword(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "This email not registered!",
      });
    });

    it("should handle email sending errors", async () => {
      User.findOne.mockResolvedValue(mockUser);
      jwt.sign.mockReturnValue("reset-token");
      const emailError = new Error("Email sending failed");
      transporter.sendMail.mockRejectedValue(emailError);

      await forgotPassword(req, res, next);

      expect(next).toHaveBeenCalledWith(emailError);
    });
  });

  describe("resetPassword", () => {
    beforeEach(() => {
      req.params = { token: "valid-token" };
      req.body = { password: "newpassword123" };
    });

    it("should reset password successfully", async () => {
      jwt.verify.mockReturnValue({ email: "test@example.com" });
      User.findOne.mockResolvedValue(mockUser);
      bcrypt.genSalt.mockResolvedValue("salt");
      bcrypt.hash.mockResolvedValue("hashedNewPassword");

      await resetPassword(req, res);

      expect(jwt.verify).toHaveBeenCalledWith("valid-token", "test-jwt-secret");
      expect(User.findOne).toHaveBeenCalledWith({ email: "test@example.com" });
      expect(bcrypt.genSalt).toHaveBeenCalledWith(10);
      expect(bcrypt.hash).toHaveBeenCalledWith("newpassword123", "salt");
      expect(mockUser.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "Password reset. Please log in again.",
      });
    });

    it("should return error if password not provided", async () => {
      req.body = {};

      await resetPassword(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "Enter reset password",
      });
    });

    it("should handle invalid token", async () => {
      jwt.verify.mockImplementation(() => {
        throw new Error("Invalid token");
      });

      await resetPassword(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "Error",
      });
    });

    it("should handle user not found (but this won't happen in real implementation)", async () => {
      // Note: In the actual implementation, if user is not found, 
      // it will throw an error when trying to set password on null user
      jwt.verify.mockReturnValue({ email: "test@example.com" });
      User.findOne.mockResolvedValue(null);

      await resetPassword(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "Error",
      });
    });
  });

  describe("updateUserProfile", () => {
    beforeEach(() => {
      req.body = {
        email: "updated@example.com",
        phone: "0987654321",
        city: "Ho Chi Minh",
        district: "District 1",
        jobTitle: "Senior Developer",
        skillIds: ["skill3", "skill4"],
      };
    });

    it("should update user profile successfully", async () => {
      User.findById.mockResolvedValue(mockUser);
      ApplicantProfile.findOne.mockResolvedValue(mockProfile);

      await updateUserProfile(req, res, next);

      expect(User.findById).toHaveBeenCalledWith("user123");
      expect(ApplicantProfile.findOne).toHaveBeenCalledWith({
        userId: "user123",
      });
      expect(mockUser.save).toHaveBeenCalled();
      expect(mockProfile.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          user: {
            id: "user123",
            email: "updated@example.com",
            phone: "0987654321",
            city: "Ho Chi Minh",
            district: "District 1",
          },
          profile: {
            jobTitle: "Senior Developer",
            skillIds: ["skill3", "skill4"],
          },
        },
      });
    });

    it("should create new profile if not exists", async () => {
      User.findById.mockResolvedValue(mockUser);
      ApplicantProfile.findOne.mockResolvedValue(null);
      const newProfile = new ApplicantProfile({ userId: "user123" });
      newProfile.save = jest.fn().mockResolvedValue();

      await updateUserProfile(req, res, next);

      expect(mockUser.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("should return error if user not found", async () => {
      User.findById.mockResolvedValue(null);

      await updateUserProfile(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: "User not found",
      });
    });
  });

  describe("getTotalUserCount", () => {
    it("should get total user count successfully", async () => {
      User.countDocuments
        .mockResolvedValueOnce(100) // applicant count
        .mockResolvedValueOnce(50); // recruiter count

      await getTotalUserCount(req, res);

      expect(User.countDocuments).toHaveBeenCalledWith({
        accountType: "Ứng Viên",
      });
      expect(User.countDocuments).toHaveBeenCalledWith({
        accountType: "Nhà Tuyển Dụng",
      });
      expect(res.json).toHaveBeenCalledWith({ total: 150 });
    });

    it("should handle database errors", async () => {
      User.countDocuments.mockRejectedValue(new Error("Database error"));

      await getTotalUserCount(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "Server error",
      });
    });
  });

  describe("getUserRoleCounts", () => {
    it("should get user role counts successfully", async () => {
      User.countDocuments
        .mockResolvedValueOnce(100) // applicant
        .mockResolvedValueOnce(50); // recruiter

      await getUserRoleCounts(req, res);

      expect(res.json).toHaveBeenCalledWith({
        applicant: 100,
        recruiter: 50,
      });
    });

    it("should handle database errors", async () => {
      User.countDocuments.mockRejectedValue(new Error("Database error"));

      await getUserRoleCounts(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "Server error",
      });
    });
  });

  describe("getMonthlyUserGrowth", () => {
    beforeEach(() => {
      req.query = { year: "2024" };
    });

    it("should get monthly user growth successfully", async () => {
      const mockStats = [
        { _id: { month: 1, role: "Ứng Viên" }, count: 10 },
        { _id: { month: 1, role: "Nhà Tuyển Dụng" }, count: 5 },
        { _id: { month: 2, role: "Ứng Viên" }, count: 15 },
      ];
      User.aggregate.mockResolvedValue(mockStats);

      await getMonthlyUserGrowth(req, res);

      expect(User.aggregate).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        year: 2024,
        data: {
          applicant: [10, 15, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          recruiter: [5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        },
      });
    });

    it("should use current year if year not provided", async () => {
      req.query = {};
      User.aggregate.mockResolvedValue([]);

      await getMonthlyUserGrowth(req, res);

      const currentYear = new Date().getFullYear();
      expect(res.json).toHaveBeenCalledWith({
        year: currentYear,
        data: {
          applicant: Array(12).fill(0),
          recruiter: Array(12).fill(0),
        },
      });
    });
  });

  describe("getQuarterlyUserGrowth", () => {
    beforeEach(() => {
      req.query = { year: "2024" };
    });

    it("should get quarterly user growth successfully", async () => {
      const mockStats = [
        { _id: { quarter: 1, role: "Ứng Viên" }, count: 25 },
        { _id: { quarter: 1, role: "Nhà Tuyển Dụng" }, count: 15 },
      ];
      User.aggregate.mockResolvedValue(mockStats);

      await getQuarterlyUserGrowth(req, res);

      expect(User.aggregate).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        year: 2024,
        data: {
          applicant: [25, 0, 0, 0],
          recruiter: [15, 0, 0, 0],
        },
      });
    });

    it("should handle database errors", async () => {
      User.aggregate.mockRejectedValue(new Error("Database error"));

      await getQuarterlyUserGrowth(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "Failed to fetch quarterly user growth",
        error: "Database error",
      });
    });
  });

  describe("getYearlyUserGrowth", () => {
    beforeEach(() => {
      req.query = { endYear: "2024" };
    });

    it("should get yearly user growth successfully", async () => {
      const mockStats = [
        { _id: { year: 2021, role: "Ứng Viên" }, count: 100 },
        { _id: { year: 2022, role: "Nhà Tuyển Dụng" }, count: 50 },
      ];
      User.aggregate.mockResolvedValue(mockStats);

      await getYearlyUserGrowth(req, res);

      expect(User.aggregate).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        years: [2021, 2022, 2023, 2024],
        data: {
          applicant: [100, 0, 0, 0],
          recruiter: [0, 50, 0, 0],
        },
      });
    });

    it("should handle database errors", async () => {
      User.aggregate.mockRejectedValue(new Error("Database error"));

      await getYearlyUserGrowth(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "Failed to fetch yearly user growth",
        error: "Database error",
      });
    });
  });

  describe("getUserList", () => {
    beforeEach(() => {
      req.query = {
        page: "1",
        pageSize: "10",
        sortField: "createdAt",
        sortOrder: "desc",
        filters: "[]",
      };
    });

    it("should get user list successfully", async () => {
      const mockUsers = [mockUser];
      User.countDocuments.mockResolvedValue(1);
      User.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue(mockUsers),
          }),
        }),
      });

      await getUserList(req, res);

      expect(buildMongoFilters).toHaveBeenCalledWith([]);
      expect(User.countDocuments).toHaveBeenCalled();
      expect(User.find).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        users: mockUsers,
        total: 1,
      });
    });

    it("should handle database errors", async () => {
      User.countDocuments.mockRejectedValue(new Error("Database error"));

      await getUserList(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "Server error",
      });
    });
  });

  describe("getTopCities", () => {
    it("should get top cities successfully", async () => {
      const mockCities = [
        { city: "Hanoi", count: 100 },
        { city: "Ho Chi Minh", count: 80 },
      ];
      User.aggregate.mockResolvedValue(mockCities);

      await getTopCities(req, res);

      expect(User.aggregate).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(mockCities);
    });

    it("should handle database errors", async () => {
      User.aggregate.mockRejectedValue(new Error("Database error"));

      await getTopCities(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "Server error",
      });
    });
  });

  describe("getAgeGenderPyramid", () => {
    it("should get age gender pyramid successfully", async () => {
      const mockPyramid = [
        { age: 25, male: 10, female: 8 },
        { age: 30, male: 15, female: 12 },
      ];
      User.aggregate.mockResolvedValue(mockPyramid);

      await getAgeGenderPyramid(req, res);

      expect(User.aggregate).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(mockPyramid);
    });

    it("should handle database errors", async () => {
      User.aggregate.mockRejectedValue(new Error("Database error"));

      await getAgeGenderPyramid(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "Server error",
      });
    });
  });

  describe("uploadAvatar", () => {
    beforeEach(() => {
      req.file = {
        path: "http://cloudinary.com/test-avatar.jpg",
        originalname: "avatar.jpg",
      };
    });

    it("should upload avatar successfully", async () => {
      User.findById.mockResolvedValue(mockUser);
      // Mock cloudinary.uploader.destroy properly
      cloudinary.uploader = {
        destroy: jest.fn().mockResolvedValue({ result: "ok" })
      };

      // uploadAvatar is an array [middleware, handler], we test the handler
      const handler = uploadAvatar[1];
      await handler(req, res, next);

      expect(User.findById).toHaveBeenCalledWith("user123");
      expect(cloudinary.uploader.destroy).toHaveBeenCalled();
      expect(mockUser.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { avatarUrl: "http://cloudinary.com/test-avatar.jpg" },
      });
    });

    it("should return error if no file uploaded", async () => {
      req.file = null;
      const handler = uploadAvatar[1];

      await handler(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "No file uploaded",
      });
    });

    it("should return error if user not found", async () => {
      User.findById.mockResolvedValue(null);
      const handler = uploadAvatar[1];

      await handler(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "User not found",
      });
    });

    it("should return error if file upload failed", async () => {
      // File object without path property will cause upload to fail
      req.file = { 
        originalname: "avatar.jpg"
      }; 
      User.findById.mockResolvedValue(mockUser);
      // Mock cloudinary.uploader.destroy properly
      cloudinary.uploader = {
        destroy: jest.fn().mockResolvedValue({ result: "ok" })
      };
      const handler = uploadAvatar[1];

      await handler(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "File upload failed",
      });
    });

    it("should handle database errors", async () => {
      const error = new Error("Database error");
      User.findById.mockRejectedValue(error);
      const handler = uploadAvatar[1];

      await handler(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});
