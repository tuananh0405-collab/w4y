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

  //Admin dashboard features
  getMonthlyJobStats,
  getQuarterlyJobStats,
  getYearlyJobStats,
  validateCreateJob,
  validateUpdateJob,
  validateUpdateJobStatus,
  validateUpdateApplicationStatus,
} from "../controllers/job.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const jobRouter = Router();

jobRouter.post("/create", authenticate, validateCreateJob, createJobPosting);
jobRouter.get("/list", viewJobList);
jobRouter.get("/get-by-employer/:employerId", getJobsByEmployer);
jobRouter.get("/get-filter-options", getFilterOptions);
jobRouter.get("/detail/:jobId", viewJobDetail);
jobRouter.put("/update/:jobId", authenticate, validateUpdateJob, updateJob);
jobRouter.delete("/delete/:jobId", authenticate, deleteJob);
// ===== ADMIN DASHBOARD FEATURES =====
/**
 * GET /api/v1/job/stats/monthly
 * Get monthly job statistics for the admin dashboard
 * Allowed Roles: Admin
 */
//admin athen required
jobRouter.get("/stats/monthly", getMonthlyJobStats);

/**
 * GET /api/v1/job/stats/quarterly
 * Get quarterly job statistics for the admin dashboard
 * Allowed Roles: Admin
 */ 
jobRouter.get("/stats/quarterly", getQuarterlyJobStats);

/**
 * GET /api/v1/job/stats/yearly
 * Get yearly job statistics for the admin dashboard
 * Allowed Roles: Admin
 */
jobRouter.get("/stats/yearly", getYearlyJobStats);

// ===== BASIC CRUD OPERATIONS =====

/**
 * POST /api/v1/job
 * Create a new job post
 * Allowed Roles: Recruiter (Nhà Tuyển Dụng)
 */
jobRouter.post("/", authenticate, validateCreateJob, createJobPosting);

/**
 * GET /api/v1/job
 * Get a list of job posts with filtering
 * Allowed Roles: All
 */
jobRouter.get("/", viewJobList);

/**
 * GET /api/v1/job/overview
 * Get an overview of job posts
 * Allowed Roles: Admin
 */
//authenticate required
jobRouter.get("/overview", getJobOverview);

/**
 * GET /api/v1/job/recommended
 * Get AI-recommended jobs for the logged-in applicant
 * Allowed Roles: Applicant
 */
jobRouter.get("/recommended", authenticate, getRecommendedJobs);

/**
 * GET /api/v1/job/expired
 * View expired job posts
 * Allowed Roles: Recruiter, Admin
 */
jobRouter.get("/expired", authenticate, getExpiredJobs);

/**
 * GET /api/v1/job/filter-options
 * Get filter options for job search
 * Allowed Roles: All
 */
jobRouter.get("/filter-options", getFilterOptions);

/**
 * GET /api/v1/job/:id
 * Get detailed information about a specific job
 * Allowed Roles: All
 */
jobRouter.get("/:id", viewJobDetail);

/**
 * PUT /api/v1/job/:id
 * Update an existing job post
 * Allowed Roles: Recruiter (owner of the job)
 */
jobRouter.put("/:id", authenticate, validateUpdateJob, updateJob);

/**
 * DELETE /api/v1/job/:id
 * Delete a job post (permanent delete)
 * Allowed Roles: Recruiter (owner of the job)
 */
jobRouter.delete("/:id", authenticate, deleteJob);

// ===== JOB MANAGEMENT =====

/**
 * PUT /api/v1/job/:id/hide
 * Temporarily hide a job from public view
 * Allowed Roles: Recruiter (owner of the job)
 */
jobRouter.put("/:id/hide", authenticate, hideJob);

/**
 * PATCH /api/v1/job/:id/status
 * Change the status of a job
 * Allowed Roles: Admin
 */
jobRouter.patch("/:id/status", authenticate, validateUpdateJobStatus, updateJobStatus);

/**
 * POST /api/v1/job/:id/view
 * Track the number of views for a job post
 * Allowed Roles: All (but typically called by frontend)
 */
jobRouter.post("/:id/view", trackJobView);

// ===== RECRUITER SPECIFIC =====

/**
 * GET /api/v1/job/recruiter/:recruiterId
 * Get all jobs posted by a specific recruiter
 * Allowed Roles: Admin, Recruiter (if viewing own jobs)
 */
jobRouter.get("/recruiter/:recruiterId", authenticate, getJobsByRecruiter);

/**
 * GET /api/v1/job/employer/:employerId
 * Get jobs by employer (backward compatibility)
 * Allowed Roles: All
 */
jobRouter.get("/employer/:employerId", getJobsByEmployer);

// ===== APPLICATION MANAGEMENT =====

/**
 * GET /api/v1/job/:id/applicants
 * View the list of applicants who applied for a specific job
 * Allowed Roles: Recruiter (owner of the job)
 */
jobRouter.get("/:id/applicants", authenticate, getJobApplicants);

/**
 * PATCH /api/v1/job/:id/applications/:applicantId
 * Update the application status of an applicant
 * Allowed Roles: Recruiter (owner of the job)
 */
jobRouter.patch("/:id/applications/:applicantId", authenticate, validateUpdateApplicationStatus, updateApplicationStatus);

/**
 * GET /api/v1/job/related/:id
 * Fetch similar or related jobs based on a specific job
 * Allowed Roles: All
 */
jobRouter.get("/related/:id", getRelatedJobs);




export default jobRouter;
