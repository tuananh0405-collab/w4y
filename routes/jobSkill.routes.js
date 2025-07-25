import { Router } from "express";
import {
  createJobSkill,
  getJobSkills,
  getJobSkillsByIds,
} from "../controllers/jobSkill.controller.js";

const jobSkillRouter = Router();

/**
 * GET /api/v1/job-skills
 * Get job skills with pagination and filtering
 * Allowed Roles: All
 */
jobSkillRouter.get("/", getJobSkills);

/**
 * POST /api/v1/job-skills
 * Create a new job skill
 * Allowed Roles: Admin
 */
jobSkillRouter.post("/", createJobSkill);

/**
 * POST /api/v1/job-skills/by-ids
 * Get multiple job skills by their IDs
 * Allowed Roles: All
 */
jobSkillRouter.post("/by-ids", getJobSkillsByIds);

export default jobSkillRouter;
