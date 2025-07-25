import { getAnalyticsData } from "../services/analytics.service.js";
import { GA_PROPERTY_ID } from "../config/env.js";

/**
 * POST /api/v1/analytics/web-traffic
 * Fetch web traffic (sessions) from Google Analytics for a given date range.
 * Allowed Roles: Admin
 */
export const getWebTrafficReport = async (req, res, next) => {
  try {
    const { dateRanges, granularity } = req.body;

    if (!dateRanges || !Array.isArray(dateRanges) || dateRanges.length === 0) {
      return res.status(400).json({
        success: false,
        message: "A valid 'dateRanges' array is required.",
      });
    }

    if (!GA_PROPERTY_ID) {
      console.error(
        "Google Analytics Property ID is not configured on the server.",
      );
      return res.status(500).json({
        success: false,
        message: "Analytics service is not configured correctly.",
      });
    }

    const dimensions = [{ name: "date" }];
    if (granularity === "hourly") {
      dimensions.push({ name: "hour" });
    }
    const metrics = [{ name: "sessions" }];

    const report = await getAnalyticsData(
      GA_PROPERTY_ID,
      dateRanges,
      dimensions,
      metrics,
    );

    return res.status(200).json({
      success: true,
      message: "Web traffic report fetched successfully.",
      data: report,
    });
  } catch (error) {
    next(error);
  }
};
