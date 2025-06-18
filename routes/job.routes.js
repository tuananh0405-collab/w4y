import { Router } from "express";
import {
  // Basic CRUD operations
  createJobPosting,
  viewJobList,
  viewJobDetail,
  updateJob,
  deleteJob,
  
  // Job management
  hideJob,
  updateJobStatus,
  trackJobView,
  
  // Analytics and overview
  getJobOverview,
  getFilterOptions,
  
  // Recruiter specific
  getJobsByRecruiter,
  getJobsByEmployer, // Keep for backward compatibility
  
  // Application management
  getJobApplicants,
  updateApplicationStatus,
  
  // Special features
  getRecommendedJobs,
  getExpiredJobs,
  getRelatedJobs,
} from "../controllers/job.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const jobRouter = Router();

// ===== BASIC CRUD OPERATIONS =====

/**
 * POST /api/jobs
 * Create a new job post
 * Allowed Roles: Recruiter (Nhà Tuyển Dụng)
 */
jobRouter.post("/", authenticate, createJobPosting);

/**
 * GET /api/jobs
 * Get a list of job posts with filtering
 * Allowed Roles: All
 */
jobRouter.get("/", viewJobList);

/**
 * GET /api/jobs/:id
 * Get detailed information about a specific job
 * Allowed Roles: All
 */
jobRouter.get("/:id", viewJobDetail);

/**
 * PUT /api/jobs/:id
 * Update an existing job post
 * Allowed Roles: Recruiter (owner of the job)
 */
jobRouter.put("/:id", authenticate, updateJob);

/**
 * DELETE /api/jobs/:id
 * Delete a job post (permanent delete)
 * Allowed Roles: Recruiter (owner of the job)
 */
jobRouter.delete("/:id", authenticate, deleteJob);

// ===== JOB MANAGEMENT =====

/**
 * PUT /api/jobs/:id/hide
 * Temporarily hide a job from public view
 * Allowed Roles: Recruiter (owner of the job)
 */
jobRouter.put("/:id/hide", authenticate, hideJob);

/**
 * PATCH /api/jobs/:id/status
 * Change the status of a job
 * Allowed Roles: Admin
 */
jobRouter.patch("/:id/status", authenticate, updateJobStatus);

/**
 * POST /api/jobs/:id/view
 * Track the number of views for a job post
 * Allowed Roles: All (but typically called by frontend)
 */
jobRouter.post("/:id/view", trackJobView);

// ===== ANALYTICS AND OVERVIEW =====

/**
 * GET /api/jobs/overview
 * Get an overview of job posts
 * Allowed Roles: Admin
 */
jobRouter.get("/overview", authenticate, getJobOverview);

/**
 * GET /api/jobs/filter-options
 * Get filter options for job search
 * Allowed Roles: All
 */
jobRouter.get("/filter-options", getFilterOptions);

// ===== RECRUITER SPECIFIC =====

/**
 * GET /api/jobs/recruiter/:recruiterId
 * Get all jobs posted by a specific recruiter
 * Allowed Roles: Admin, Recruiter (if viewing own jobs)
 */
jobRouter.get("/recruiter/:recruiterId", authenticate, getJobsByRecruiter);

/**
 * GET /api/jobs/employer/:employerId
 * Get jobs by employer (backward compatibility)
 * Allowed Roles: All
 */
jobRouter.get("/employer/:employerId", getJobsByEmployer);

// ===== APPLICATION MANAGEMENT =====

/**
 * GET /api/jobs/:jobId/applicants
 * View the list of applicants who applied for a specific job
 * Allowed Roles: Recruiter (owner of the job)
 */
jobRouter.get("/:jobId/applicants", authenticate, getJobApplicants);

/**
 * PATCH /api/jobs/:jobId/applications/:applicantId
 * Update the application status of an applicant
 * Allowed Roles: Recruiter (owner of the job)
 */
jobRouter.patch("/:jobId/applications/:applicantId", authenticate, updateApplicationStatus);

// ===== SPECIAL FEATURES =====

/**
 * GET /api/jobs/recommended
 * Get AI-recommended jobs for the logged-in applicant
 * Allowed Roles: Applicant
 */
jobRouter.get("/recommended", authenticate, getRecommendedJobs);

/**
 * GET /api/jobs/expired
 * View expired job posts
 * Allowed Roles: Recruiter, Admin
 */
jobRouter.get("/expired", authenticate, getExpiredJobs);

/**
 * GET /api/jobs/related/:jobId
 * Fetch similar or related jobs based on a specific job
 * Allowed Roles: All
 */
jobRouter.get("/related/:jobId", getRelatedJobs);

export default jobRouter;
