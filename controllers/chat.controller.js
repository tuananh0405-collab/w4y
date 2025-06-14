import jwt from "jsonwebtoken";
import { JWT_EXPIRES_IN, JWT_SECRET } from "../config/env.js";
import ChatMessage from "../models/chatMessage.model.js";
import mongoose from "mongoose";
import toObjectId from "../utils/toObjectId.js";
import Application from "../models/application.model.js";
import Job from "../models/job.model.js";

export const getChatToken = (req, res, next) => {
  try {
    const { senderId } = req.query;

    const chatToken = jwt.sign({ senderId }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN, // For now
    });

    res.status(200).json({
      success: true,
      message: "Validated successfully",
      data: chatToken,
    });
  } catch (error) {
    next(error);
  }
};

export const getChatHistory = async (req, res, next) => {
  try {
    const { senderId, receiverId } = req.query;

    if (!senderId) {
      res.status(400).json({
        success: false,
        message: `Missing senderId (${senderId})`,
        data: [],
      });
      return;
    }

    // Not an error because this acts as like a standby mode
    if (!receiverId || receiverId === "null") {
      res.status(200).json({
        success: false,
        message: `Empty list due to missing receiverId (${receiverId})`,
        data: [],
      });
      return;
    }

    const messageList = await ChatMessage.find({
      $or: [
        { senderId: senderId, receiverId: receiverId },
        { receiverId: senderId, senderId: receiverId },
      ],
    }).sort({ sentAt: -1 });

    res.status(200).json({
      success: true,
      message: `Fetched message list by ${senderId} and ${receiverId} (${messageList.length})`,
      data: messageList,
    });
  } catch (error) {
    next(error);
  }
};

export const getRecentMessagedUsers = async (req, res, next) => {
  try {
    // const senderId = req.user._id;
    let { senderId } = req.query;
    senderId = toObjectId(senderId);

    const results = await ChatMessage.aggregate([
      {
        // Get all messages that have senderId as sender or receiver
        $match: {
          $or: [{ senderId: senderId }, { receiverId: senderId }],
        },
      },
      {
        $sort: {
          sentAt: -1,
        },
      },
      {
        // Get partnerId, the *other* user of the message, the sender/receiver of the message that the user received from/sent to
        $addFields: {
          partnerId: {
            $cond: [
              { $eq: ["$senderId", senderId] },
              "$receiverId",
              "$senderId",
            ],
          },
        },
      },
      {
        $group: {
          _id: "$partnerId",
          lastMessageAt: { $first: "$sentAt" },
          lastMessage: { $first: "$message" },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "partner",
        },
      },
      {
        $unwind: "$partner",
      },
      {
        $project: {
          _id: 0,
          receiverId: "$_id",
          name: "$partner.name",
          email: "$partner.email",
          lastMessage: "$lastMessage",
          lastMessageAt: "$lastMessageAt",
        },
      },
      {
        $sort: { lastMessageAt: -1 },
      },
    ]);

    res.status(200).json({
      success: true,
      message: `Fetched ${results.length} record(s)`,
      data: results,
    });
  } catch (error) {
    next(error);
  }
};

/* Get a list recruiters whose job the applicant applied
 * [
 *   recruiter: User,
 *   jobs: [{
 *    applicationStatus,
 *    appliedAt: Date,
 *    job: Job,
 *    resumeFile,
 *   }],
 * ]
 */
export const getRecruitersGroupedByApplications = async (req, res, next) => {
  try {
    const { applicantId } = req.query;

    if (!mongoose.Types.ObjectId.isValid(applicantId)) {
      return res.status(400).json({
        success: false,
        message: `Invalid applicant id (${applicantId})`,
        data: [],
      });
    }

    const applications = await Application.find({ applicantId })
      .populate({
        path: "jobId",
        populate: { path: "employerId", model: "User" },
      })
      .exec();

    const groupedByRecruiters = {};

    for (const app of applications) {
      const job = app.jobId;
      if (!job || !job.employerId) continue;

      const employerId = job.employerId._id.toString();

      if (!groupedByRecruiters[employerId]) {
        groupedByRecruiters[employerId] = {
          recruiter: job.employerId,
          jobs: [],
        };
      }

      groupedByRecruiters[employerId].jobs.push({
        job,
        applicationStatus: app.status,
        appliedAt: app.appliedAt,
        resumeFile: app.resumeFile,
      });
    }

    const results = Object.values(groupedByRecruiters);

    return res.status(200).json({
      success: true,
      message: `Fetched ${results.length} record(s)`,
      data: results,
    });
  } catch (err) {
    next(err);
  }
};

/* Get a list applicants who applied for a job that the recruiter posted
 * [
 *   recruiter: User,
 *   jobs: [{
 *    applicationStatus,
 *    appliedAt: Date,
 *    job: Job,
 *    resumeFile,
 *   }],
 * ]
 */
export const getApplicantsGroupedByApplications = async (req, res, next) => {
  try {
    const { recruiterId } = req.query;

    if (!mongoose.Types.ObjectId.isValid(recruiterId)) {
      return res.status(400).json({
        success: false,
        message: `Invalid recruiter Id (${recruiterId})`,
        data: [],
      });
    }

    const now = new Date();

    // Get active jobs of this recruiter
    const activeJobs = await Job.find({
      employerId: recruiterId,
      $or: [
        { deadline: { $gte: now } },
        { deadline: { $exists: false } },
        { deadline: null },
      ],
    }).select("_id title");

    // Map put fetched jobs in a map to search by id later, could have been an array.filter but idk
    const jobMap = new Map(activeJobs.map((job) => [job._id.toString(), job]));
    const jobIds = [...jobMap.keys()];

    console.log("Your map, sir");
    console.log(jobMap);

    // Get recent applications for those jobs
    const applications = await Application.find({ jobId: { $in: jobIds } })
      .sort({ appliedAt: -1 })
      .limit(50) // Hardcoded for now
      .populate("applicantId", "name email phone gender city district company")
      .exec();

    // Group those applications by their applicant.
    const groupedByApplicants = {};

    for (const app of applications) {
      const applicantId = app.applicantId._id.toString();

      if (!groupedByApplicants[applicantId]) {
        groupedByApplicants[applicantId] = {
          applicant: app.applicantId,
          applications: [],
        };
      }

      groupedByApplicants[applicantId].applications.push({
        job: jobMap.get(app.jobId.toString()),
        applicationStatus: app.status,
        appliedAt: app.appliedAt,
        resumeFile: app.resumeFile,
      });
    }

    const results = Object.values(groupedByApplicants);

    return res.status(200).json({
      success: true,
      message: `Fetched ${results.length} record(s)`,
      data: results,
    });
  } catch (err) {
    next(err);
  }
};
