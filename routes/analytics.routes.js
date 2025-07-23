import { Router } from "express";
import { getWebTrafficReport } from "../controllers/analytics.controller.js";
import {
  authenticate,
  authorizeAdmin,
} from "../middlewares/auth.middleware.js";

const analyticsRouter = Router();

/**
 * POST /api/v1/analytics/web-traffic
 * Fetch web traffic (sessions) from Google Analytics for a given date range.
 * Allowed Roles: Admin
 * @body {{ dateRanges: { startDate: string, endDate: string }[] }}
 */
analyticsRouter.post(
  "/web-traffic",
  authenticate,
  authorizeAdmin,
  getWebTrafficReport,
);

export default analyticsRouter;
