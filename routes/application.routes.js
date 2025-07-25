import { Router } from "express";
import { applyJob, getApplications, updateApplicationStatus, viewApplicationStatus, listAppliedJobs, getApplicationStatusDistribution, getApplicationsByJob, getApplicationsSubmittedOverTime, getAllApplications } from "../controllers/application.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const applicationRouter = Router()

applicationRouter.post('/apply/:jobId',authenticate, applyJob)
applicationRouter.get("/status/:applicationId",authenticate, viewApplicationStatus)
applicationRouter.get('/applications/:employerId', getApplications);
applicationRouter.patch('/update-status/:applicationId', authenticate, updateApplicationStatus);
applicationRouter.get('/applied-jobs', authenticate, listAppliedJobs);

// Admin dashboard chart data
applicationRouter.get('/stats/status-distribution', getApplicationStatusDistribution);
applicationRouter.get('/stats/by-job', getApplicationsByJob);
applicationRouter.get('/stats/submitted-over-time', getApplicationsSubmittedOverTime);

// Admin: get all applications
applicationRouter.get('/all-applications', getAllApplications);

export default applicationRouter