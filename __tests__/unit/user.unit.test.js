import {
  getUser,
  updateUserProfile,
  updateUserByID,
  forgotPassword,
  resetPassword,
  uploadAvatar,
  getTotalUserCount,
  getUserRoleCounts,
  getMonthlyUserGrowth,
  getQuarterlyUserGrowth,
  getYearlyUserGrowth,
  getUserList,
  getTopCities,
  getAgeGenderPyramid
} from "../../controllers/user.controller.js";

import User from "../../models/user.model.js";
import ApplicantProfile from "../../models/applicantProfile.model.js";

jest.mock("../../models/user.model.js");
jest.mock("../../models/applicantProfile.model.js");
jest.mock("cloudinary");

// Mock multer
jest.mock("multer", () => {
  const multerMock = () => ({
    single: () => (req, res, next) => {
      next();
    }
  });
  multerMock.diskStorage = () => ({});
  return multerMock;
});

describe("User Controller", () => {
  let req, res, next;

  beforeEach(() => {
    req = { body: {}, params: {}, query: {}, user: { _id: "userId" } };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe("getUser", () => {
    it("should return 404 if user not found", async () => {
      User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(null)
      });
      await getUser(req, res, next);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "User not found"
      });
    });

    it("should return user profile with applicant data if found", async () => {
      User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({
          name: "Test User",
          email: "test@example.com",
          phone: "1234567890",
          avatarUrl: "test.jpg"
        })
      });

      ApplicantProfile.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue({
          skillIds: ["1", "2"],
          education: "Test Education",
          jobTitle: "Developer",
          resumeFiles: ["resume.pdf"]
        })
      });

      await getUser(req, res, next);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          name: "Test User",
          email: "test@example.com",
          skillIds: expect.any(Array),
          education: expect.any(String)
        })
      });
    });
  });

  describe("updateUserProfile", () => {
    it("should return 404 if user not found", async () => {
      User.findById.mockResolvedValue(null);
      await updateUserProfile(req, res, next);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: "User not found" });
    });

    it("should update user and applicant profile", async () => {
      const mockUser = {
        email: "test@example.com",
        phone: "1234567890",
        city: "Test City",
        district: "Test District",
        save: jest.fn().mockResolvedValue({})
      };
      
      const mockProfile = {
        jobTitle: "Developer",
        skillIds: ["1", "2"],
        save: jest.fn().mockResolvedValue({})
      };

      User.findById.mockResolvedValue(mockUser);
      ApplicantProfile.findOne.mockResolvedValue(mockProfile);

      req.body = {
        email: "new@example.com",
        phone: "0987654321",
        jobTitle: "Senior Developer",
        skillIds: ["3", "4"]
      };

      await updateUserProfile(req, res, next);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          user: expect.any(Object),
          profile: expect.any(Object)
        })
      });
    });
  });

  describe("uploadAvatar", () => {
    let uploadMiddleware;
    let handler;

    beforeEach(() => {
      // Reset middleware and handler before each test
      uploadMiddleware = uploadAvatar[0];
      handler = uploadAvatar[1];
    });

    it("should return 400 if no file uploaded", async () => {
      req.file = undefined;
      await handler(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "No file uploaded"
      });
    });

    it("should upload avatar and update user", async () => {
      const mockUser = {
        avatarUrl: "old.jpg",
        save: jest.fn().mockResolvedValue({})
      };

      User.findById.mockResolvedValue(mockUser);
      req.file = { path: "new.jpg" };

      await handler(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { avatarUrl: "new.jpg" }
      });
    });

    it("should return 404 if user not found", async () => {
      User.findById.mockResolvedValue(null);
      req.file = { path: "new.jpg" };

      await handler(req, res, next);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "User not found"
      });
    });

    it("should handle errors", async () => {
      const error = new Error("Upload failed");
      User.findById.mockRejectedValue(error);
      req.file = { path: "new.jpg" };

      await handler(req, res, next);
      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe("getUserList", () => {
    it("should return filtered user list", async () => {
      const mockUsers = [
        { _id: "1", name: "User 1" },
        { _id: "2", name: "User 2" }
      ];

      User.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockUsers)
      });

      User.countDocuments.mockResolvedValue(2);

      req.query = {
        page: 1,
        pageSize: 10,
        sortField: "createdAt",
        sortOrder: "desc",
        filters: "[]"
      };

      await getUserList(req, res);
      expect(res.json).toHaveBeenCalledWith({
        users: mockUsers,
        total: 2
      });
    });
  });

  describe("getMonthlyUserGrowth", () => {
    it("should return monthly user growth stats", async () => {
      const mockStats = [
        { _id: { month: 1, role: "Ứng Viên" }, count: 5 },
        { _id: { month: 1, role: "Nhà Tuyển Dụng" }, count: 3 }
      ];

      User.aggregate.mockResolvedValue(mockStats);

      req.query = { year: 2025 };

      await getMonthlyUserGrowth(req, res);
      expect(res.json).toHaveBeenCalledWith({
        year: 2025,
        data: expect.objectContaining({
          applicant: expect.any(Array),
          recruiter: expect.any(Array)
        })
      });
    });

    it("should handle errors", async () => {
      User.aggregate.mockRejectedValue(new Error("Database error"));
      await getMonthlyUserGrowth(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe("updateUserByID", () => {
    it("should return 404 if user not found", async () => {
      User.findById.mockResolvedValue(null);
      await updateUserByID(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });

    it("should update and return user data", async () => {
      const mockUser = {
        _id: "userId",
        name: "Old Name",
        email: "old@example.com",
        accountType: "Ứng Viên",
        isVerified: true,
        createdAt: new Date(),
        save: jest.fn().mockResolvedValue({
          _id: "userId",
          name: "New Name",
          email: "new@example.com",
          accountType: "Ứng Viên",
          isVerified: true,
          createdAt: new Date()
        })
      };

      User.findById.mockResolvedValue(mockUser);
      req.body = {
        name: "New Name",
        email: "new@example.com"
      };

      await updateUserByID(req, res, next);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        user: expect.objectContaining({
          name: "New Name",
          email: "new@example.com"
        })
      });
    });
  });

  describe("forgotPassword", () => {
    let mockTransporter;
    let mockJwt;

    beforeEach(() => {
      // Reset mocks before each test
      mockTransporter = {
        sendMail: jest.fn().mockResolvedValue({ messageId: 'mock-id' })
      };
      mockJwt = {
        sign: jest.fn().mockReturnValue('mock-reset-token')
      };

      jest.mock("../../config/nodemailer", () => mockTransporter);
      jest.mock("jsonwebtoken", () => mockJwt);
    });

    it("should return 400 if email not provided", async () => {
      req.body = {};
      await forgotPassword(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ 
        success: false,
        message: "Enter email!" 
      });
    });

    it("should return 400 if email not registered", async () => {
      User.findOne.mockResolvedValue(null);
      req.body = { email: "nonexistent@example.com" };
      await forgotPassword(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ 
        success: false,
        message: "This email not registered!" 
      });
    });

    it("should send reset password email if email exists", async () => {
      const mockUser = { 
        _id: 'user123',
        email: "test@example.com",
        name: "Test User"
      };
      User.findOne.mockResolvedValue(mockUser);
      req.body = { email: "test@example.com" };
      
      await forgotPassword(req, res, next);

      // Verify JWT token was created
      expect(mockJwt.sign).toHaveBeenCalledWith(
        { userId: mockUser._id },
        expect.any(String),
        { expiresIn: '15m' }
      );

      // Verify email was sent
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: mockUser.email,
          subject: expect.any(String),
          html: expect.stringContaining('mock-reset-token')
        })
      );

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ 
        success: true,
        message: "Reset password link sent to your email." 
      });
    });

    it("should handle email sending errors", async () => {
      const mockUser = { email: "test@example.com" };
      User.findOne.mockResolvedValue(mockUser);
      mockTransporter.sendMail.mockRejectedValue(new Error('Failed to send email'));
      req.body = { email: "test@example.com" };

      await forgotPassword(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe("resetPassword", () => {
    beforeEach(() => {
      jest.mock("jsonwebtoken", () => ({
        verify: jest.fn().mockReturnValue({ email: "test@example.com" })
      }));
      jest.mock("bcryptjs", () => ({
        genSalt: jest.fn().mockResolvedValue("salt"),
        hash: jest.fn().mockResolvedValue("hashedPassword")
      }));
    });

    it("should return 400 if password not provided", async () => {
      req.body = {};
      req.params = { token: "validtoken" };
      await resetPassword(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: "Enter reset password" });
    });

    it("should reset password successfully", async () => {
      const mockUser = {
        email: "test@example.com",
        save: jest.fn().mockResolvedValue({})
      };

      User.findOne.mockResolvedValue(mockUser);
      req.params = { token: "validtoken" };
      req.body = { password: "newpassword" };

      await resetPassword(req, res, next);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ 
        message: "Password reset. Please log in again." 
      });
    });

    it("should return 404 if user not found", async () => {
      User.findOne.mockResolvedValue(null);
      req.params = { token: "validtoken" };
      req.body = { password: "newpassword" };

      await resetPassword(req, res, next);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ 
        message: "User not found" 
      });
    });
  });

  describe("getTotalUserCount", () => {
    it("should return total user count", async () => {
      User.countDocuments.mockResolvedValueOnce(50) // Applicants
        .mockResolvedValueOnce(30); // Recruiters

      await getTotalUserCount(req, res);
      expect(res.json).toHaveBeenCalledWith({ total: 80 });
    });

    it("should handle errors", async () => {
      User.countDocuments.mockRejectedValue(new Error("Database error"));
      await getTotalUserCount(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe("getUserRoleCounts", () => {
    it("should return counts for each role", async () => {
      User.countDocuments
        .mockResolvedValueOnce(50) // Applicants
        .mockResolvedValueOnce(30); // Recruiters

      await getUserRoleCounts(req, res);
      expect(res.json).toHaveBeenCalledWith({
        applicant: 50,
        recruiter: 30
      });
    });

    it("should handle errors", async () => {
      User.countDocuments.mockRejectedValue(new Error("Database error"));
      await getUserRoleCounts(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe("getQuarterlyUserGrowth", () => {
    it("should return quarterly user growth stats", async () => {
      const mockStats = [
        { _id: { quarter: 1, role: "Ứng Viên" }, count: 10 },
        { _id: { quarter: 1, role: "Nhà Tuyển Dụng" }, count: 5 }
      ];

      User.aggregate.mockResolvedValue(mockStats);
      req.query = { year: 2025 };

      await getQuarterlyUserGrowth(req, res);
      expect(res.json).toHaveBeenCalledWith({
        year: 2025,
        data: expect.objectContaining({
          applicant: expect.any(Array),
          recruiter: expect.any(Array)
        })
      });
    });

    it("should handle errors", async () => {
      User.aggregate.mockRejectedValue(new Error("Database error"));
      await getQuarterlyUserGrowth(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe("getYearlyUserGrowth", () => {
    it("should return yearly user growth stats", async () => {
      const mockStats = [
        { _id: { year: 2025, role: "Ứng Viên" }, count: 50 },
        { _id: { year: 2025, role: "Nhà Tuyển Dụng" }, count: 30 }
      ];

      User.aggregate.mockResolvedValue(mockStats);
      req.query = { endYear: 2025 };

      await getYearlyUserGrowth(req, res);
      expect(res.json).toHaveBeenCalledWith({
        years: expect.any(Array),
        data: expect.objectContaining({
          applicant: expect.any(Array),
          recruiter: expect.any(Array)
        })
      });
    });

    it("should handle errors", async () => {
      User.aggregate.mockRejectedValue(new Error("Database error"));
      await getYearlyUserGrowth(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe("getTopCities", () => {
    it("should return top 10 cities with user counts", async () => {
      const mockCities = [
        { city: "City 1", count: 100 },
        { city: "City 2", count: 50 }
      ];

      User.aggregate.mockResolvedValue(mockCities);

      await getTopCities(req, res);
      expect(res.json).toHaveBeenCalledWith(mockCities);
    });

    it("should handle errors", async () => {
      User.aggregate.mockRejectedValue(new Error("Database error"));
      await getTopCities(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe("getAgeGenderPyramid", () => {
    it("should return age-gender distribution", async () => {
      const mockPyramid = [
        { age: 25, male: 30, female: 20 },
        { age: 30, male: 40, female: 35 }
      ];

      User.aggregate.mockResolvedValue(mockPyramid);

      await getAgeGenderPyramid(req, res);
      expect(res.json).toHaveBeenCalledWith(mockPyramid);
    });

    it("should handle errors", async () => {
      User.aggregate.mockRejectedValue(new Error("Database error"));
      await getAgeGenderPyramid(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
