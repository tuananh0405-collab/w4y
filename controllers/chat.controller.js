import jwt from "jsonwebtoken";
import { JWT_EXPIRES_IN, JWT_SECRET } from "../config/env.js";
import ChatMessage from "../models/chatMessage.model.js";
import mongoose from "mongoose";
import toObjectId from "../utils/toObjectId.js";
import Application from "../models/application.model.js";
import Job from "../models/job.model.js";

/**
 * GET /api/v1/chat/token
 * Generate a chat token for socket authentication
 * Allowed Roles: Authenticated users
 */
export const getChatToken = (req, res, next) => {
  try {
    const senderId = req.user._id;

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

/**
 * GET /api/v1/chat/messages
 * Get a paginated list of messages between two users
 * Allowed Roles: Authenticated users
 */
export const getMessages = async (req, res, next) => {
  try {
    const { senderId, receiverId, page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.max(1, parseInt(limit));

    if (!senderId) {
      res.status(400).json({
        success: false,
        message: `Missing senderId (${senderId})`,
        data: [],
        pagination: {
          currentPage: pageNum,
          totalPages: 0,
          totalJobs: 0,
          hasNextPage: false,
          hasPrevPage: false,
        },
      });
      return;
    }

    if (!receiverId || receiverId === "null") {
      res.status(200).json({
        success: false,
        message: `Empty list due to missing receiverId (${receiverId})`,
        data: [],
        pagination: {
          currentPage: pageNum,
          totalPages: 0,
          totalJobs: 0,
          hasNextPage: false,
          hasPrevPage: false,
        },
      });
      return;
    }

    const chatQuery = {
      $or: [
        { senderId: senderId, receiverId: receiverId },
        { receiverId: senderId, senderId: receiverId },
      ],
    };

    const totalJobs = await ChatMessage.countDocuments(chatQuery);
    const totalPages = Math.ceil(totalJobs / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    const messageList = await ChatMessage.find(chatQuery)
      .sort({ sentAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    res.status(200).json({
      success: true,
      message: `Fetched message list between ${senderId} and ${receiverId} (${messageList.length})`,
      data: messageList,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalJobs,
        hasNextPage,
        hasPrevPage,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/chat/conversations
 * Get a list of users that the specific user has messages with
 * Allowed Roles: Authenticated users
 */
export const getConversations = async (req, res, next) => {
  try {
    // const senderId = req.user._id;
    let { senderId, query } = req.query;
    senderId = toObjectId(senderId);

    // Sanitize query and turn it into a case insensitive regex
    query = new RegExp(query.toString().replace(/[^a-zA-Z\d_ ]/g, ""), "i");

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
        $match: {
          $or: [
            { "partner.name": { $regex: query } },
            { "partner.email": { $regex: query } },
          ],
        },
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

/**
 * GET /api/v1/chat/recruiters-by-applications
 * Get a list of recruiters grouped by applications for a specific applicant
 * Allowed Roles: Authenticated users
 */
/* Return format:
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

/**
 * GET /api/v1/chat/applicants-by-applications
 * Get a list of applicants grouped by applications for recruiter's active jobs
 * Allowed Roles: Authenticated users
 */
/* Return format:
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

/**
 * PATCH /api/v1/chat/mark-read
 * Mark messages as read by IDs
 * Allowed Roles: Authenticated users
 */
export const markMessagesAsRead = async (req, res, next) => {
  try {
    const { messageIds, is_read = true } = req.body;

    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "messageIds (array) is required",
        data: [],
      });
    }

    // Validate ObjectIds
    const validIds = messageIds.filter((id) =>
      mongoose.Types.ObjectId.isValid(id),
    );
    if (validIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid message IDs provided",
        data: [],
      });
    }

    const result = await ChatMessage.updateMany(
      { _id: { $in: validIds } },
      { $set: { is_read } },
    );

    const modifiedMessages = await ChatMessage.find({
      _id: { $in: validIds },
      is_read,
    }).select("_id");

    const modifiedIds = modifiedMessages.map((doc) => doc._id);

    return res.status(200).json({
      success: true,
      message: `Updated ${result.modifiedCount} message(s)`,
      data: { ...result, modifiedIds, is_read },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/chat/unread-messages-senders
 * Get a list of users who have sent unread messages to the user
 * Allowed Roles: Authenticated users
 */
export const getUnreadMessagesSenders = async (req, res, next) => {
  try {
    let { startDate, endDate } = req.query;
    const userId = req.user._id;
    const query = {
      receiverId: userId,
      is_read: false,
    };
    if (startDate || endDate) {
      query.sentAt = {};
      if (startDate) query.sentAt.$gte = new Date(startDate);
      if (endDate) query.sentAt.$lte = new Date(endDate);
    }

    const results = await ChatMessage.aggregate([
      { $match: query },
      {
        $sort: { sentAt: -1 },
      },
      {
        $group: {
          _id: "$senderId",
          unreadCount: { $sum: 1 },
          latestMessage: { $first: "$message" },
          latestSentAt: { $first: "$sentAt" },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "sender",
        },
      },
      { $unwind: "$sender" },
      {
        $project: {
          _id: 0,
          senderId: "$sender._id",
          name: "$sender.name",
          email: "$sender.email",
          avatarUrl: "$sender.avatarUrl",
          unreadCount: 1,
          latestMessage: 1,
          latestSentAt: 1,
        },
      },
      { $sort: { latestSentAt: -1 } },
    ]);
    return res.status(200).json({
      success: true,
      message: `Fetched ${results.length} sender(s) with unread messages`,
      data: results,
    });
  } catch (err) {
    next(err);
  }
};
