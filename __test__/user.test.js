import request from "supertest";
import app from "../app.js";
import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/env.js";

const agent = request.agent(app);

describe("User Controller", () => {
  let authToken;
  let testUser;

  beforeEach(async () => {
    // Create a test user
    const hashedPassword = await bcrypt.hash("password123", 10);
    testUser = await User.create({
      name: "Test User",
      email: "test@example.com",
      password: hashedPassword,
      accountType: "Applicant",
      isVerified: true,
    });

    // Generate auth token
    authToken = jwt.sign({ userId: testUser._id }, JWT_SECRET, {
      expiresIn: "1h",
    });
  });

  describe("GET /api/v1/user/profile", () => {
    test("should get user profile successfully", async () => {
      const response = await agent
        .get("/api/v1/user/profile")
        .set("Cookie", [`accessToken=${authToken}`]);

      expect(response.status).toBe(200);
      expect(response.body.user).toBeTruthy();
      expect(response.body.user.email).toBe(testUser.email);
      expect(response.body.user.name).toBe(testUser.name);
      expect(response.body.user.password).toBeUndefined();
    });

    test("should return 404 if user not found", async () => {
      // Delete the user first
      await User.findByIdAndDelete(testUser._id);

      const response = await agent
        .get("/api/v1/user/profile")
        .set("Cookie", [`accessToken=${authToken}`]);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("User not found");
    });
  });

  describe("PUT /api/v1/user/update", () => {
    test("should update user profile successfully", async () => {
      const updateData = {
        name: "Updated Name",
        email: "updated@example.com",
      };

      const response = await agent
        .put("/api/v1/user/update")
        .set("Cookie", [`accessToken=${authToken}`])
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.user.name).toBe(updateData.name);
      expect(response.body.user.email).toBe(updateData.email);

      // Verify changes in database
      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.name).toBe(updateData.name);
      expect(updatedUser.email).toBe(updateData.email);
    });

    test("should keep existing values if not provided in update", async () => {
      const updateData = {
        name: "Updated Name",
      };

      const response = await agent
        .put("/api/v1/user/update")
        .set("Cookie", [`accessToken=${authToken}`])
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.user.name).toBe(updateData.name);
      expect(response.body.user.email).toBe(testUser.email);
    });
  });

  describe("POST /api/v1/user/forgot_password", () => {
    test("should send reset password email successfully", async () => {
      const response = await agent
        .post("/api/v1/user/forgot_password")
        .send({ email: testUser.email });

      expect(response.status).toBe(200);
      expect(response.body.success).toBeTruthy();
      expect(response.body.message).toContain("Rest password link sent");
    });

    test("should return error if email not provided", async () => {
      const response = await agent
        .post("/api/v1/user/forgot_password")
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Enter email!");
    });

    test("should return error if email not registered", async () => {
      const response = await agent
        .post("/api/v1/user/forgot_password")
        .send({ email: "nonexistent@example.com" });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("This email not registered!");
    });
  });

  describe("POST /api/v1/user/reset_password/:token", () => {
    test("should reset password successfully", async () => {
      // Generate reset token
      const resetToken = jwt.sign({ email: testUser.email }, JWT_SECRET, {
        expiresIn: "1h",
      });

      const response = await agent
        .post(`/api/v1/user/reset_password/${resetToken}`)
        .send({ password: "newpassword123" });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain("Password reset");

      // Verify password was changed
      const updatedUser = await User.findById(testUser._id);
      const isPasswordValid = await bcrypt.compare(
        "newpassword123",
        updatedUser.password
      );
      expect(isPasswordValid).toBe(true);
    });

    test("should return error if password not provided", async () => {
      const resetToken = jwt.sign({ email: testUser.email }, JWT_SECRET, {
        expiresIn: "1h",
      });

      const response = await agent
        .post(`/api/v1/user/reset_password/${resetToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Enter reset password");
    });

    test("should return error with invalid token", async () => {
      const response = await agent
        .post("/api/v1/user/reset_password/invalid-token")
        .send({ password: "newpassword123" });

      expect(response.status).toBe(500);
      expect(response.body.message).toBe("Error");
    });
  });
});
