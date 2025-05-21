import request from "supertest";
import app from "../app.js";
import User from "../models/user.model.js";
import bcrypt from "bcryptjs";

const agent = request.agent(app);

describe("Auth Controller", () => {
  describe("POST /api/v1/auth/sign-up", () => {
    test("should create a new user successfully", async () => {
      const userData = {
        name: "Test User",
        email: "test@example.com",
        password: "password123",
        accountType: "Applicant",
        gender: "male",
        phone: "1234567890",
        company: "Test Company",
        city: "Test City",
        district: "Test District",
      };

      const response = await agent.post("/api/v1/auth/sign-up").send(userData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain("Verification code sent");

      // Verify user was created in database
      const user = await User.findOne({ email: userData.email });
      expect(user).toBeTruthy();
      expect(user.name).toBe(userData.name);
      expect(user.accountType).toBe(userData.accountType);
      expect(user.isVerified).toBe(false);
    });

    test("should return error if user already exists", async () => {
      // First create a user
      const userData = {
        name: "Test User",
        email: "test@example.com",
        password: "password123",
        accountType: "Applicant",
      };

      await agent.post("/api/v1/auth/sign-up").send(userData);

      // Try to create same user again
      const response = await agent.post("/api/v1/auth/sign-up").send(userData);

      expect(response.status).toBe(409);
      expect(response.body.message).toBe("User already exists");
    });
  });

  describe("POST /api/v1/auth/sign-in", () => {
    beforeEach(async () => {
      // Create a verified user for testing
      const hashedPassword = await bcrypt.hash("password123", 10);
      await User.create({
        name: "Test User",
        email: "test@example.com",
        password: hashedPassword,
        accountType: "Applicant",
        isVerified: true,
      });
    });

    test("should sign in successfully with correct credentials", async () => {
      const response = await agent.post("/api/v1/auth/sign-in").send({
        email: "test@example.com",
        password: "password123",
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeTruthy();
      expect(response.body.user.email).toBe("test@example.com");
    });

    test("should return error with incorrect password", async () => {
      const response = await agent.post("/api/v1/auth/sign-in").send({
        email: "test@example.com",
        password: "wrongpassword",
      });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe("Invalid password");
    });

    test("should return error if user not found", async () => {
      const response = await agent.post("/api/v1/auth/sign-in").send({
        email: "nonexistent@example.com",
        password: "password123",
      });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("User not found");
    });
  });

  describe("POST /api/v1/auth/sign-out", () => {
    test("should sign out successfully", async () => {
      const response = await agent.post("/api/v1/auth/sign-out");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("User signed out successfully");
    });
  });

  describe("POST /api/v1/auth/verify-email", () => {
    beforeEach(async () => {
      // Create an unverified user with verification code
      await User.create({
        name: "Test User",
        email: "test@example.com",
        password: "password123",
        accountType: "Applicant",
        isVerified: false,
        verificationCode: "ABC123",
      });
    });

    test("should verify email successfully", async () => {
      const response = await agent.post("/api/v1/auth/verify-email").send({
        email: "test@example.com",
        verificationCode: "ABC123",
        password: "newpassword123",
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain("Email verified successfully");

      // Verify user is now verified
      const user = await User.findOne({ email: "test@example.com" });
      expect(user.isVerified).toBe(true);
      expect(user.verificationCode).toBeNull();
    });

    test("should return error with invalid verification code", async () => {
      const response = await agent.post("/api/v1/auth/verify-email").send({
        email: "test@example.com",
        verificationCode: "WRONG123",
        password: "newpassword123",
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Invalid verification code");
    });
  });

  describe("POST /api/v1/auth/refresh-token", () => {
    test("should return error if no refresh token provided", async () => {
      const response = await agent.post("/api/v1/auth/refresh-token");

      expect(response.status).toBe(401);
      expect(response.body.message).toBe("No refresh token provided");
    });
  });
});
