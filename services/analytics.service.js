import { BetaAnalyticsDataClient } from "@google-analytics/data";
import path from "path";

// Initialize the Google Analytics Data Client
const analyticsDataClient = new BetaAnalyticsDataClient({
  keyFilename: path.resolve(process.cwd(), "service-account.json"),
});

/**
 * Runs a report on a Google Analytics 4 property.
 * @param {string} propertyId - Your GA4 property ID.
 * @param {object[]} dateRanges - The date ranges for the report.
 * @param {object[]} dimensions - The dimensions to include in the report.
 * @param {object[]} metrics - The metrics to include in the report.
 * @returns {Promise<object>} The API response from Google Analytics.
 */
export const getAnalyticsData = async (
  propertyId,
  dateRanges,
  dimensions,
  metrics,
) => {
  try {
    const [response] = await analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges,
      dimensions,
      metrics,
    });
    return response;
  } catch (error) {
    console.error("Error fetching Google Analytics data:", error);
    throw new Error("Failed to retrieve analytics data.");
  }
};
