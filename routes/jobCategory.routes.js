import { Router } from "express";
import {
  getJobCategoriesByParent,
  getJobCategoriesRecursive,
} from "../controllers/jobCategory.controller.js";

const jobCategoryRouter = Router();

/**
 * GET /api/v1/job/categories-by-parent
 * Get job categories by parent ID
 * Allowed Roles: All
 */
jobCategoryRouter.get("/:parentId", getJobCategoriesByParent);
jobCategoryRouter.get("/recursive/:categoryId", getJobCategoriesRecursive);

export default jobCategoryRouter;
