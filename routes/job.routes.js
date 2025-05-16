import { Router } from "express";
import {
  createJobPosting,
  deleteJob,
  updateJob,
  viewJobDetail,
  viewJobList,
} from "../controllers/job.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
const jobRouter = Router();

jobRouter.post("/create", authenticate, createJobPosting);
jobRouter.get("/list", viewJobList);
jobRouter.get("/detail/:jobId", viewJobDetail);
jobRouter.put("/update/:jobId", authenticate, updateJob);
jobRouter.delete("/delete/:jobId", authenticate, deleteJob);

export default jobRouter;
