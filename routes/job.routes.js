import { Router } from "express";
import {
  createJobPosting,
  deleteJob,
  updateJob,
  viewJobDetail,
  viewJobList,
  getJobStatistics,
  getRecruitmentList,
  getRecruiterDetails,
} from "../controllers/job.controller.js";
import { authenticate, authorizeAdmin } from "../middlewares/auth.middleware.js";

const jobRouter = Router();

// Public routes
jobRouter.get("/list", viewJobList);
jobRouter.get("/detail/:jobId", viewJobDetail);

// Protected routes
jobRouter.post("/create", authenticate, createJobPosting);
jobRouter.put("/update/:jobId", authenticate, updateJob);
jobRouter.delete("/delete/:jobId", authenticate, deleteJob);

// Statistics and recruitment routes
jobRouter.get("/statistics", authenticate, getJobStatistics);
jobRouter.get("/recruitment-list", authenticate, authorizeAdmin, getRecruitmentList);
jobRouter.get("/recruiter/:recruiterId", authenticate, authorizeAdmin, getRecruiterDetails);

export default jobRouter;
