import supertest from "supertest";
import app from "../app.js"; // Ensure your Express app is exported as default from app.js
import Job from "../models/job.model.js";
import mongoose from "mongoose";

// You may need to set up a test database or use mocks for DB operations.
// For authentication, consider mocking the middleware or using a test JWT.

const api = supertest(app);

beforeAll(async () => {
  // Optionally connect to a test DB or clear data
  // If using a test DB URI, set it up here
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe("Job Controller API", () => {
  // You can use beforeAll/afterAll to set up and tear down test DB connections

  // --- BASIC CRUD ---
  it("POST /api/v1/job - should create a new job posting (Recruiter only)", async () => {
    // TODO: Mock authentication as recruiter
    // TODO: Provide valid job data
    // Example:
    // const token = getTestToken({ accountType: 'Nhà Tuyển Dụng' });
    // const res = await supertest(app)
    //   .post("/api/v1/job")
    //   .set('Authorization', `Bearer ${token}`)
    //   .send({ title: "Test Job", ... });
    // expect(res.status).toBe(201);
  });

  it("GET /api/v1/job - should return a list of jobs", async () => {
    const res = await api
      .get("/api/v1/job")
      .expect(200)
      .expect("Content-Type", /application\/json/);

    // The response should have a data array
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it("GET /api/v1/job/:id - should return job details", async () => {
    // TODO: Insert a test job and use its ID
    // const res = await supertest(app).get(`/api/v1/job/${jobId}`);
    // expect(res.status).toBe(200);
    // expect(res.body.data).toHaveProperty('title');
  });

  it("PUT /api/v1/job/:id - should update a job (Recruiter only)", async () => {
    // TODO: Mock authentication as recruiter and use a test job ID
    // const res = await supertest(app)
    //   .put(`/api/v1/job/${jobId}`)
    //   .set('Authorization', `Bearer ${token}`)
    //   .send({ title: "Updated Title" });
    // expect(res.status).toBe(200);
  });

  it("DELETE /api/v1/job/:id - should delete a job (Recruiter only)", async () => {
    // TODO: Mock authentication as recruiter and use a test job ID
    // const res = await supertest(app)
    //   .delete(`/api/v1/job/${jobId}`)
    //   .set('Authorization', `Bearer ${token}`);
    // expect(res.status).toBe(200);
  });

  // --- JOB MANAGEMENT ---
  it("PUT /api/v1/job/:id/hide - should hide/unhide a job (Recruiter only)", async () => {
    // TODO: Mock authentication as recruiter
    // const res = await supertest(app)
    //   .put(`/api/v1/job/${jobId}/hide`)
    //   .set('Authorization', `Bearer ${token}`);
    // expect(res.status).toBe(200);
  });

  it("PATCH /api/v1/job/:id/status - should update job status (Admin only)", async () => {
    // TODO: Mock authentication as admin
    // const res = await supertest(app)
    //   .patch(`/api/v1/job/${jobId}/status`)
    //   .set('Authorization', `Bearer ${adminToken}`)
    //   .send({ status: "inactive" });
    // expect(res.status).toBe(200);
  });

  it("POST /api/v1/job/:id/view - should track job view", async () => {
    // const res = await supertest(app).post(`/api/v1/job/${jobId}/view`);
    // expect(res.status).toBe(200);
  });

  // --- ANALYTICS & OVERVIEW ---
  it("GET /api/v1/job/overview - should return job overview (Admin only)", async () => {
    // TODO: Mock authentication as admin
    // const res = await supertest(app)
    //   .get("/api/v1/job/overview")
    //   .set('Authorization', `Bearer ${adminToken}`);
    // expect(res.status).toBe(200);
  });

  it("GET /api/v1/job/filter-options - should return filter options", async () => {
    const res = await api
      .get("/api/v1/job/filter-options")
      .expect(200)
      .expect("Content-Type", /application\/json/);
    // Should return filter options including locations, positions, industries, levels
    expect(res.body.data).toHaveProperty("locations");
    expect(res.body.data).toHaveProperty("positions");
    expect(res.body.data).toHaveProperty("industries");
    expect(res.body.data).toHaveProperty("levels");
  });

  // --- RECRUITER SPECIFIC ---
  it("GET /api/v1/job/recruiter/:recruiterId - should return jobs by recruiter (Recruiter/Admin only)", async () => {
    // TODO: Mock authentication as recruiter or admin
    // const res = await supertest(app)
    //   .get(`/api/v1/job/recruiter/${recruiterId}`)
    //   .set('Authorization', `Bearer ${token}`);
    // expect(res.status).toBe(200);
  });

  it("GET /api/v1/job/employer/:employerId - should return jobs by employer", async () => {
    // const res = await supertest(app).get(`/api/v1/job/employer/${employerId}`);
    // expect(res.status).toBe(200);
  });

  // --- APPLICATION MANAGEMENT ---
  it("GET /api/v1/job/:id/applicants - should return applicants for a job (Recruiter only)", async () => {
    // TODO: Mock authentication as recruiter
    // const res = await supertest(app)
    //   .get(`/api/v1/job/${jobId}/applicants`)
    //   .set('Authorization', `Bearer ${token}`);
    // expect(res.status).toBe(200);
  });

  it("PATCH /api/v1/job/:id/applications/:applicantId - should update application status (Recruiter only)", async () => {
    // TODO: Mock authentication as recruiter
    // const res = await supertest(app)
    //   .patch(`/api/v1/job/${jobId}/applications/${applicantId}`)
    //   .set('Authorization', `Bearer ${token}`)
    //   .send({ status: "Phỏng vấn" });
    // expect(res.status).toBe(200);
  });

  // --- SPECIAL FEATURES ---
  it("GET /api/v1/job/recommended - should return recommended jobs (Applicant only)", async () => {
    // TODO: Mock authentication as applicant
    // const res = await supertest(app)
    //   .get("/api/v1/job/recommended")
    //   .set('Authorization', `Bearer ${applicantToken}`);
    // expect(res.status).toBe(200);
  });

  it("GET /api/v1/job/expired - should return expired jobs (Recruiter/Admin only)", async () => {
    // TODO: Mock authentication as recruiter or admin
    // const res = await supertest(app)
    //   .get("/api/v1/job/expired")
    //   .set('Authorization', `Bearer ${token}`);
    // expect(res.status).toBe(200);
  });

  it("GET /api/v1/job/related/:id - should return related jobs", async () => {
    // const res = await supertest(app).get(`/api/v1/job/related/${jobId}`);
    // expect(res.status).toBe(200);
  });
});

describe("GET job endpoints", () => {
  let jobId;
  let employerId;

  beforeAll(async () => {
    // Insert a test job directly to DB
    employerId = new mongoose.Types.ObjectId();
    const job = new Job({
      employerId: employerId,
      title: "Test Job",
      description: "Test Description",
      requirements: "Test Requirements",
      salary: "1000",
      deliveryTime: "1 week",
      priorityLevel: "Nổi bật",
      status: "active",
      location: "Hanoi",
      industry: "IT",
      position: "Developer",
      level: "Junior",
      experience: "1 year"
    });
    const savedJob = await job.save();
    jobId = savedJob._id.toString();
  });

  afterAll(async () => {
    await Job.deleteMany({});
  });

  test("GET all jobs", async () => {
    const res = await api
      .get("/api/v1/job")
      .expect(200)
      .expect("Content-Type", /application\/json/);

    // The response should have a data array
    expect(Array.isArray(res.body.data)).toBe(true);
    // Our test job should be in the list
    const titles = res.body.data.map(j => j.title);
    expect(titles).toContain("Test Job");
  });

  test("GET job by id", async () => {
    const res = await api
      .get(`/api/v1/job/${jobId}`)
      .expect(200)
      .expect("Content-Type", /application\/json/);

    // The response should have the correct job id and title
    expect(res.body.data.id).toEqual(jobId);
    expect(res.body.data.title).toBe("Test Job");
  });

  test("all jobs have ids", async () => {
    const res = await api.get("/api/v1/job");
    for (const job of res.body.data) {
      expect(job.id).toBeDefined();
    }
  });

  test("GET filter options", async () => {
    const res = await api
      .get("/api/v1/job/filter-options")
      .expect(200)
      .expect("Content-Type", /application\/json/);
    // Should return filter options including locations, positions, industries, levels
    expect(res.body.data).toHaveProperty("locations");
    expect(res.body.data).toHaveProperty("positions");
    expect(res.body.data).toHaveProperty("industries");
    expect(res.body.data).toHaveProperty("levels");
    // Our test job's location, position, industry, and level should be present
    expect(res.body.data.locations).toContain("Hanoi");
    expect(res.body.data.positions).toContain("Developer");
    expect(res.body.data.industries).toContain("IT");
    expect(res.body.data.levels).toContain("Junior");
  });

  test("GET jobs by employer", async () => {
    const res = await api
      .get(`/api/v1/job/employer/${employerId}`)
      .expect(200)
      .expect("Content-Type", /application\/json/);
    // Should return jobs for the employer
    expect(Array.isArray(res.body.data)).toBe(true);
    const jobIds = res.body.data.map(j => j._id?.toString() || j.id);
    expect(jobIds).toContain(jobId);
  });
});
