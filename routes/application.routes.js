import { Router } from "express";
import { applyJob, getApplications, updateApplicationStatus, viewApplicationStatus } from "../controllers/application.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const applicationRouter = Router()

applicationRouter.post('/apply/:jobId',authenticate, applyJob)
applicationRouter.get("/status/:applicationId",authenticate, viewApplicationStatus)
applicationRouter.get('/applications/:employerId', getApplications);
applicationRouter.patch('/update-status/:applicationId', authenticate, updateApplicationStatus);

export default applicationRouter