import { Router } from "express";
import { applyJob, viewApplicationStatus } from "../controllers/application.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const applicationRouter = Router()

applicationRouter.post('/apply/:jobId',authenticate, applyJob)
applicationRouter.get("/status/:applicationId",authenticate, viewApplicationStatus)

export default applicationRouter