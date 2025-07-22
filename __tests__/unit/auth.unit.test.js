// Mock all dependencies BEFORE importing anything
jest.mock("../../models/user.model.js");
jest.mock("../../utils/generateToken.js");
jest.mock("../../config/nodemailer.js", () => ({
  default: {
    sendMail: jest.fn()
  }
}));
jest.mock("../../config/passport.js", () => ({
  default: {
    authenticate: jest.fn()
  }
}));
jest.mock("../../config/env.js", () => ({
  JWT_SECRET: "test-jwt-secret",
  JWT_EXPIRES_IN: "24h",
  EMAIL_ACCOUNT: "test@example.com",
  FE_URL: "http://localhost:3000",
  NODE_ENV: "test"
}));
jest.mock("bcryptjs");
jest.mock("jsonwebtoken");
jest.mock("crypto");

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import {
  signUp,
  signIn,
  signInAdmin,
  signOut,
  verifyEmail,
  refreshToken,
  googleAuth,
  googleCallback,
  adminSignUp,
  adminSignIn
} from "../../controllers/auth.controller.js";
import User from "../../models/user.model.js";
import generateToken from "../../utils/generateToken.js";
import transporter from "../../config/nodemailer.js";
import passport from "../../config/passport.js";

describe("Auth Controller", () => {
  let req, res, next;
  let mockUser;
  let consoleSpy;

  beforeEach(() => {
    req = { body: {}, params: {}, query: {}, cookies: {} };
    res = { 
      status: jest.fn().mockReturnThis(), 
      json: jest.fn(),
      cookie: jest.fn(),
      redirect: jest.fn()
    };
    next = jest.fn();

    // Mock console methods to prevent log pollution in tests
    consoleSpy = {
      log: jest.spyOn(console, 'log').mockImplementation(() => {}),
      error: jest.spyOn(console, 'error').mockImplementation(() => {})
    };
    
    mockUser = {
      _id: "user123",
      name: "Test User",
      email: "test@example.com",
      password: "hashedPassword",
      accountType: "Ứng Viên",
      isVerified: true,
      verificationCode: null,
      points: 0,
      save: jest.fn()
    };
    
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup default mocks
    User.findOne = jest.fn();
    User.findById = jest.fn();
    User.prototype.save = jest.fn();
    generateToken.mockImplementation(() => {});
    bcrypt.genSalt = jest.fn();
    bcrypt.hash = jest.fn();
    bcrypt.compare = jest.fn();
    crypto.randomBytes = jest.fn();
    jwt.verify = jest.fn();
    jwt.sign = jest.fn();
    transporter.sendMail = jest.fn();
    passport.authenticate = jest.fn();
  });

  afterEach(() => {
    // Restore console methods
    consoleSpy.log.mockRestore();
    consoleSpy.error.mockRestore();
  });

  describe("signUp", () => {
    beforeEach(() => {
      req.body = {
        name: "Test User",
        email: "test@example.com",
        password: "password123",
        accountType: "Ứng Viên",
        gender: "male",
        phone: "0123456789",
        company: "Test Company",
        city: "Hanoi",
        district: "Ba Dinh"
      };
    });

    it("should register new user successfully", async () => {
      User.findOne.mockResolvedValue(null); // No existing user
      bcrypt.genSalt.mockResolvedValue("salt");
      bcrypt.hash.mockResolvedValue("hashedPassword");
      crypto.randomBytes.mockReturnValue({ toString: () => "abc123" });
      User.prototype.save.mockResolvedValue(mockUser);
      transporter.sendMail.mockResolvedValue({ messageId: "test" });

      await signUp(req, res, next);

      expect(User.findOne).toHaveBeenCalledWith({ email: "test@example.com" });
      expect(bcrypt.genSalt).toHaveBeenCalledWith(10);
      expect(bcrypt.hash).toHaveBeenCalledWith("password123", "salt");
      expect(transporter.sendMail).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Verification code sent to your email. Please verify your email before logging in."
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should return error if user already exists", async () => {
      User.findOne.mockResolvedValue(mockUser); // Existing user

      await signUp(req, res, next);

      expect(User.findOne).toHaveBeenCalledWith({ email: "test@example.com" });
      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        message: "User already exists",
        statusCode: 409
      }));
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    it("should handle database errors", async () => {
      const error = new Error("Database connection error");
      User.findOne.mockRejectedValue(error);

      await signUp(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    it("should handle email sending errors", async () => {
      User.findOne.mockResolvedValue(null);
      bcrypt.genSalt.mockResolvedValue("salt");
      bcrypt.hash.mockResolvedValue("hashedPassword");
      crypto.randomBytes.mockReturnValue({ toString: () => "abc123" });
      User.prototype.save.mockResolvedValue(mockUser);
      
      const emailError = new Error("Failed to send email");
      transporter.sendMail.mockRejectedValue(emailError);

      await signUp(req, res, next);

      expect(next).toHaveBeenCalledWith(emailError);
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("signIn", () => {
    beforeEach(() => {
      req.body = {
        email: "test@example.com",
        password: "password123"
      };
    });

    it("should sign in user successfully", async () => {
      User.findOne.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(true);

      await signIn(req, res, next);

      expect(User.findOne).toHaveBeenCalledWith({ email: "test@example.com" });
      expect(bcrypt.compare).toHaveBeenCalledWith("password123", "hashedPassword");
      expect(generateToken).toHaveBeenCalledWith(res, "user123");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "User signed in successfully",
        user: {
          id: "user123",
          name: "Test User",
          email: "test@example.com",
          accountType: "Ứng Viên",
          points: 0
        }
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should return error if user not found", async () => {
      User.findOne.mockResolvedValue(null);

      await signIn(req, res, next);

      expect(User.findOne).toHaveBeenCalledWith({ email: "test@example.com" });
      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        message: "User not found",
        statusCode: 404
      }));
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    it("should return error if password is invalid", async () => {
      User.findOne.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(false);

      await signIn(req, res, next);

      expect(bcrypt.compare).toHaveBeenCalledWith("password123", "hashedPassword");
      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        message: "Invalid password",
        statusCode: 401
      }));
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    it("should return error if email not verified", async () => {
      const unverifiedUser = { ...mockUser, isVerified: false };
      User.findOne.mockResolvedValue(unverifiedUser);
      bcrypt.compare.mockResolvedValue(true);

      await signIn(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        message: "Email not verified",
        statusCode: 403
      }));
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("signInAdmin", () => {
    beforeEach(() => {
      req.body = {
        email: "admin@example.com",
        password: "adminpass123"
      };
      mockUser.accountType = "Admin";
    });

    it("should sign in admin successfully", async () => {
      User.findOne.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(true);

      await signInAdmin(req, res, next);

      expect(User.findOne).toHaveBeenCalledWith({ email: "admin@example.com" });
      expect(bcrypt.compare).toHaveBeenCalledWith("adminpass123", "hashedPassword");
      expect(generateToken).toHaveBeenCalledWith(res, "user123");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "User signed in successfully",
        user: {
          id: "user123",
          name: "Test User",
          email: "test@example.com",
          accountType: "Admin",
          points: 0
        }
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should return error if user is not admin", async () => {
      mockUser.accountType = "Ứng Viên";
      User.findOne.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(true);

      await signInAdmin(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        message: "You are not authorized to access this",
        statusCode: 403
      }));
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    it("should return error if admin not found", async () => {
      User.findOne.mockResolvedValue(null);

      await signInAdmin(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        message: "User not found",
        statusCode: 404
      }));
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("signOut", () => {
    it("should sign out user successfully", async () => {
      await signOut(req, res, next);

      expect(res.cookie).toHaveBeenCalledWith("accessToken", "", {
        httpOnly: true,
        expires: new Date(0)
      });
      expect(res.cookie).toHaveBeenCalledWith("refreshToken", "", {
        httpOnly: true,
        expires: new Date(0)
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "User signed out successfully"
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should handle errors", async () => {
      const error = new Error("Cookie error");
      res.cookie.mockImplementation(() => {
        throw error;
      });

      await signOut(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("verifyEmail", () => {
    beforeEach(() => {
      req.body = {
        email: "test@example.com",
        verificationCode: "ABC123",
        password: "newpassword123"
      };
    });

    it("should verify email successfully", async () => {
      const unverifiedUser = {
        ...mockUser,
        isVerified: false,
        verificationCode: "ABC123",
        save: jest.fn().mockResolvedValue()
      };
      User.findOne.mockResolvedValue(unverifiedUser);
      bcrypt.genSalt.mockResolvedValue("salt");
      bcrypt.hash.mockResolvedValue("newHashedPassword");

      await verifyEmail(req, res, next);

      expect(User.findOne).toHaveBeenCalledWith({ email: "test@example.com" });
      expect(bcrypt.genSalt).toHaveBeenCalledWith(10);
      expect(bcrypt.hash).toHaveBeenCalledWith("newpassword123", "salt");
      expect(unverifiedUser.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Email verified successfully. You can now log in."
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should return error if user not found", async () => {
      User.findOne.mockResolvedValue(null);

      await verifyEmail(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "User not found"
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should return error if email already verified", async () => {
      User.findOne.mockResolvedValue(mockUser); // already verified

      await verifyEmail(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Email already verified"
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should return error if verification code invalid", async () => {
      const unverifiedUser = {
        ...mockUser,
        isVerified: false,
        verificationCode: "WRONG123"
      };
      User.findOne.mockResolvedValue(unverifiedUser);

      await verifyEmail(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Invalid verification code"
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe("refreshToken", () => {
    beforeEach(() => {
      req.cookies = {
        refreshToken: "validRefreshToken"
      };
    });

    it("should refresh token successfully", async () => {
      const decoded = { userId: "user123" };
      jwt.verify.mockReturnValue(decoded);
      User.findById.mockResolvedValue(mockUser);
      jwt.sign.mockReturnValue("newAccessToken");

      await refreshToken(req, res, next);

      expect(jwt.verify).toHaveBeenCalledWith("validRefreshToken", "test-jwt-secret");
      expect(User.findById).toHaveBeenCalledWith("user123");
      expect(jwt.sign).toHaveBeenCalled();
      expect(res.cookie).toHaveBeenCalledWith("accessToken", "newAccessToken", expect.any(Object));
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        accessToken: "newAccessToken"
      });
    });

    it("should return error if no refresh token provided", async () => {
      req.cookies = {};

      await refreshToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: "No refresh token provided"
      });
    });

    it("should return error if refresh token invalid", async () => {
      const error = new Error("Invalid token");
      jwt.verify.mockImplementation(() => {
        throw error;
      });

      await refreshToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: "Invalid refresh token"
      });
      expect(consoleSpy.error).toHaveBeenCalledWith(error);
    });

    it("should return error if user not found", async () => {
      const decoded = { userId: "nonexistent" };
      jwt.verify.mockReturnValue(decoded);
      User.findById.mockResolvedValue(null);

      await refreshToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: "User not found"
      });
    });
  });

  describe("adminSignUp", () => {
    beforeEach(() => {
      req.body = {
        name: "Admin User",
        email: "admin@example.com",
        password: "adminpass123"
      };
    });

    it("should create admin successfully", async () => {
      User.findOne.mockResolvedValue(null);
      bcrypt.genSalt.mockResolvedValue("salt");
      bcrypt.hash.mockResolvedValue("hashedPassword");
      const savedAdmin = {
        _id: "admin123",
        name: "Admin User",
        email: "admin@example.com",
        accountType: "Admin"
      };
      User.prototype.save.mockResolvedValue(savedAdmin);

      await adminSignUp(req, res, next);

      expect(User.findOne).toHaveBeenCalledWith({ email: "admin@example.com" });
      expect(bcrypt.genSalt).toHaveBeenCalledWith(10);
      expect(bcrypt.hash).toHaveBeenCalledWith("adminpass123", "salt");
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Admin account created successfully",
        user: {
          id: "admin123",
          name: "Admin User",
          email: "admin@example.com",
          accountType: "Admin"
        }
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should return error if admin already exists", async () => {
      User.findOne.mockResolvedValue(mockUser);

      await adminSignUp(req, res, next);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Admin already exists"
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should handle database errors", async () => {
      User.findOne.mockResolvedValue(null);
      bcrypt.genSalt.mockResolvedValue("salt");
      bcrypt.hash.mockResolvedValue("hashedPassword");
      const error = new Error("Database error");
      User.prototype.save.mockRejectedValue(error);

      await adminSignUp(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("adminSignIn", () => {
    beforeEach(() => {
      req.body = {
        email: "admin@example.com",
        password: "adminpass123"
      };
      mockUser.accountType = "Admin";
    });

    it("should sign in admin successfully", async () => {
      User.findOne.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(true);

      await adminSignIn(req, res, next);

      expect(User.findOne).toHaveBeenCalledWith({ email: "admin@example.com" });
      expect(bcrypt.compare).toHaveBeenCalledWith("adminpass123", "hashedPassword");
      expect(generateToken).toHaveBeenCalledWith(res, "user123");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Admin signed in successfully",
        user: {
          id: "user123",
          name: "Test User",
          email: "test@example.com",
          accountType: "Admin"
        }
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should return error if admin not found", async () => {
      User.findOne.mockResolvedValue(null);

      await adminSignIn(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Admin not found"
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should return error if user is not admin", async () => {
      mockUser.accountType = "Ứng Viên";
      User.findOne.mockResolvedValue(mockUser);

      await adminSignIn(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Admin not found"
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should return error if password invalid", async () => {
      User.findOne.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(false);

      await adminSignIn(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Invalid password"
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should return error if admin not verified", async () => {
      mockUser.isVerified = false;
      User.findOne.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(true);

      await adminSignIn(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Admin account not verified"
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe("googleAuth", () => {
    it("should initiate Google authentication", () => {
      req.query.accountType = "Ứng Viên";
      const mockAuthenticate = jest.fn().mockReturnValue((req, res, next) => {});
      passport.authenticate.mockReturnValue(mockAuthenticate);

      googleAuth(req, res, next);

      expect(passport.authenticate).toHaveBeenCalledWith("google", {
        scope: ["profile", "email"],
        state: "Ứng Viên"
      });
      expect(mockAuthenticate).toHaveBeenCalledWith(req, res, next);
    });
  });

  describe("googleCallback", () => {
    it("should handle Google callback successfully", async () => {
      // Mock passport.authenticate to directly execute the callback
      passport.authenticate.mockImplementation((strategy, options, callback) => {
        // Immediately call the callback with success case
        callback(null, mockUser);
        return (req, res, next) => {}; // Return a dummy middleware
      });

      googleCallback(req, res, next);

      expect(passport.authenticate).toHaveBeenCalledWith("google", 
        { failureRedirect: "/auth" }, 
        expect.any(Function)
      );
      
      // Wait a tick for async operations to complete
      await new Promise(resolve => setImmediate(resolve));
      
      expect(generateToken).toHaveBeenCalledWith(res, "user123");
      expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining("/auth/google/callback"));
    });

    it("should handle Google authentication errors", async () => {
      passport.authenticate.mockImplementation((strategy, options, callback) => {
        callback(new Error("Google auth error"), null);
        return (req, res, next) => {};
      });

      googleCallback(req, res, next);

      expect(passport.authenticate).toHaveBeenCalledWith("google", 
        { failureRedirect: "/auth" }, 
        expect.any(Function)
      );
      
      await new Promise(resolve => setImmediate(resolve));
      
      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        message: "Google auth error",
        statusCode: 500
      }));
      expect(res.redirect).not.toHaveBeenCalled();
    });

    it("should handle Google authentication failure", async () => {
      passport.authenticate.mockImplementation((strategy, options, callback) => {
        callback(null, null);
        return (req, res, next) => {};
      });

      googleCallback(req, res, next);

      expect(passport.authenticate).toHaveBeenCalledWith("google", 
        { failureRedirect: "/auth" }, 
        expect.any(Function)
      );
      
      await new Promise(resolve => setImmediate(resolve));
      
      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        message: "Google authentication failed",
        statusCode: 401
      }));
      expect(res.redirect).not.toHaveBeenCalled();
    });
  });
});
