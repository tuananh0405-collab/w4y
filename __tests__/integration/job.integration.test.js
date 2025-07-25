import { mockUserId } from "../../__mocks__/middlewares/auth.middleware.js";
import request from "supertest";
import mongoose from "mongoose";
import app from "../../app.js";
import { testingApp } from "../config/setup.integration.mjs";

describe("Job API Integration", () => {
  let createdJobId;

  it("should return job list (empty at first)", async () => {
    const res = await request(testingApp).get("/api/v1/job/list");
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(0);
  });

  it("should create a job when authenticated", async () => {
    const jobData = {
      title: "Integration Test Job",
      description: "Test job description",
      requirements: "Test requirements",
      salary: "1000",
      deliveryTime: "1 week",
      priorityLevel: "Nổi bật",
      quantity: 2,
      level: "Senior",
      industry: "IT",
      position: "Developer",
      location: "Hanoi",
      experience: "3 years",
      deadline: new Date(),
      createdBy: mockUserId
    };
    const res = await request(testingApp)
      .post("/api/v1/job/create")
      .send(jobData)
      .set("Cookie", ["accessToken=mocktoken"]); // Simulate auth
    expect(res.statusCode).toBe(201);
    expect(res.body.data.title).toBe(jobData.title);
    createdJobId = res.body.data._id || res.body.data.id;
  });

  it("should return job list with one job", async () => {
    const res = await request(testingApp).get("/api/v1/job/list");
    expect(res.statusCode).toBe(200);
    expect(res.body.data.length).toBe(1);
  });

  it("should get job detail", async () => {
    const res = await request(testingApp).get(`/api/v1/job/detail/${createdJobId}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.title).toBe("Integration Test Job");
  });

  it("should update the job", async () => {
    const res = await request(testingApp)
      .put(`/api/v1/job/update/${createdJobId}`)
      .send({ title: "Updated Job Title" })
      .set("Cookie", ["accessToken=mocktoken"]);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.title).toBe("Updated Job Title");
  });

  it("should get filter options", async () => {
    const res = await request(testingApp).get("/api/v1/job/get-filter-options");
    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveProperty("locations");
    expect(res.body.data).toHaveProperty("positions");
  });

  it("should get jobs by employer", async () => {
    const res = await request(testingApp).get(`/api/v1/job/get-by-employer/${mockUserId}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it("should delete the job", async () => {
    const res = await request(testingApp)
      .delete(`/api/v1/job/delete/${createdJobId}`)
      .set("Cookie", ["accessToken=mocktoken"]);
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toMatch(/deleted/i);
  });

  it("should return job list (empty after delete)", async () => {
    const res = await request(testingApp).get("/api/v1/job/list");
    expect(res.statusCode).toBe(200);
    expect(res.body.data.length).toBe(0);
  });
});
