import { Router } from "express";
import {
  createJobCategory,
  getJobCategoriesByParent,
  getJobCategoriesRecursive,
} from "../controllers/jobCategory.controller.js";

const jobCategoryRouter = Router();

/**
 * GET /api/v1/job-categories/:parentId
 * Get job categories by parent ID
 * Allowed Roles: All
 */
jobCategoryRouter.get("/:parentId", getJobCategoriesByParent);

/**
 * GET /api/v1/job-categories/recursive/:categoryId
 * Get job categories recursively starting from a given category ID
 * Allowed Roles: All
 */
jobCategoryRouter.get("/recursive/:categoryId", getJobCategoriesRecursive);

/**
 * POST /api/v1/job-categories
 * Create a new job category
 * Allowed Roles: Admin
 */
jobCategoryRouter.post("/", createJobCategory);

export default jobCategoryRouter;
