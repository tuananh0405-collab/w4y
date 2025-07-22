import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import {
  getChatToken,
  getMessages,
  getConversations,
  getRecruitersGroupedByApplications,
  getApplicantsGroupedByApplications,
  markMessagesAsRead,
  getUnreadMessagesSenders
} from "../../controllers/chat.controller.js";
import ChatMessage from "../../models/chatMessage.model.js";
import Application from "../../models/application.model.js";
import Job from "../../models/job.model.js";
import toObjectId from "../../utils/toObjectId.js";
import { JWT_EXPIRES_IN, JWT_SECRET } from "../../config/env.js";

jest.mock("jsonwebtoken");
jest.mock("mongoose");
jest.mock("../../models/chatMessage.model.js", () => ({
  find: jest.fn(),
  countDocuments: jest.fn(),
  aggregate: jest.fn(),
  updateMany: jest.fn()
}));
jest.mock("../../models/application.model.js", () => ({
  find: jest.fn()
}));
jest.mock("../../models/job.model.js", () => ({
  find: jest.fn()
}));
jest.mock("../../utils/toObjectId.js");
jest.mock("../../config/env.js", () => ({
  JWT_SECRET: "test-secret",
  JWT_EXPIRES_IN: "1h"
}));

describe("Chat Controller", () => {
  let req, res, next;

  beforeEach(() => {
    req = { 
      body: {}, 
      params: {}, 
      query: {},
      user: { _id: "user123" }
    };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
    
    // Reset all mocks completely
    jest.clearAllMocks();
    
    // Mock mongoose Types
    mongoose.Types = {
      ObjectId: {
        isValid: jest.fn(),
        createFromHexString: jest.fn()
      }
    };
    
    // Reset model methods
    ChatMessage.find.mockClear();
    ChatMessage.countDocuments.mockClear();
    ChatMessage.aggregate.mockClear();
    ChatMessage.updateMany.mockClear();
    Application.find.mockClear();
    Job.find.mockClear();
    
    jwt.sign = jest.fn();
    toObjectId.mockImplementation((id) => id);
  });

  describe("getChatToken", () => {
    it("should generate chat token successfully", () => {
      const mockToken = "mock-jwt-token";
      jwt.sign.mockReturnValue(mockToken);

      getChatToken(req, res, next);

      expect(jwt.sign).toHaveBeenCalledWith(
        { senderId: "user123" },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Validated successfully",
        data: mockToken
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should handle jwt.sign errors", () => {
      const error = new Error("JWT sign error");
      jwt.sign.mockImplementation(() => {
        throw error;
      });

      getChatToken(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    it("should handle missing user ID", () => {
      req.user = {}; // No _id

      const error = new Error("Cannot read properties of undefined");
      jwt.sign.mockImplementation(() => {
        throw error;
      });

      getChatToken(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe("getMessages", () => {
    it("should return messages with pagination successfully", async () => {
      const mockMessages = [
        {
          _id: "msg1",
          senderId: "user1",
          receiverId: "user2",
          message: "Hello",
          sentAt: new Date(),
          is_read: false
        },
        {
          _id: "msg2",
          senderId: "user2",
          receiverId: "user1",
          message: "Hi",
          sentAt: new Date(),
          is_read: true
        }
      ];

      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockMessages)
      };

      ChatMessage.countDocuments = jest.fn().mockResolvedValue(2);
      ChatMessage.find = jest.fn().mockReturnValue(mockQuery);

      req.query = {
        senderId: "user1",
        receiverId: "user2",
        page: 1,
        limit: 20
      };

      await getMessages(req, res, next);

      expect(ChatMessage.countDocuments).toHaveBeenCalledWith({
        $or: [
          { senderId: "user1", receiverId: "user2" },
          { receiverId: "user1", senderId: "user2" }
        ]
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Fetched message list between user1 and user2 (2)",
        data: mockMessages,
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalItems: 2,
          hasNextPage: false,
          hasPrevPage: false
        }
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should return 400 when senderId is missing", async () => {
      req.query = {
        receiverId: "user2",
        page: 1,
        limit: 20
      };

      await getMessages(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Missing senderId (undefined)",
        data: [],
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalItems: 0,
          hasNextPage: false,
          hasPrevPage: false
        }
      });
      expect(ChatMessage.find).not.toHaveBeenCalled();
    });

    it("should return 200 with empty data when receiverId is missing or null", async () => {
      req.query = {
        senderId: "user1",
        receiverId: "null",
        page: 1,
        limit: 20
      };

      await getMessages(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Empty list due to missing receiverId (null)",
        data: [],
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalItems: 0,
          hasNextPage: false,
          hasPrevPage: false
        }
      });
      expect(ChatMessage.find).not.toHaveBeenCalled();
    });

    it("should handle pagination with multiple pages", async () => {
      const mockMessages = [{ _id: "msg1", message: "test" }];
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockMessages)
      };

      ChatMessage.countDocuments = jest.fn().mockResolvedValue(25);
      ChatMessage.find = jest.fn().mockReturnValue(mockQuery);

      req.query = {
        senderId: "user1",
        receiverId: "user2",
        page: 2,
        limit: 10
      };

      await getMessages(req, res, next);

      expect(mockQuery.skip).toHaveBeenCalledWith(10);
      expect(mockQuery.limit).toHaveBeenCalledWith(10);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          pagination: {
            currentPage: 2,
            totalPages: 3,
            totalItems: 25,
            hasNextPage: true,
            hasPrevPage: true
          }
        })
      );
    });

    it("should handle database errors", async () => {
      const error = new Error("Database error");
      ChatMessage.countDocuments = jest.fn().mockRejectedValue(error);

      req.query = {
        senderId: "user1",
        receiverId: "user2"
      };

      await getMessages(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe("getConversations", () => {
    it("should return conversations successfully", async () => {
      const mockResults = [
        {
          receiverId: "user2",
          name: "John Doe",
          email: "john@example.com",
          lastMessage: "Hello",
          lastMessageAt: new Date()
        }
      ];

      toObjectId.mockReturnValue("objectid-user1");
      ChatMessage.aggregate = jest.fn().mockResolvedValue(mockResults);

      req.query = {
        senderId: "user1",
        query: "john"
      };

      await getConversations(req, res, next);

      expect(toObjectId).toHaveBeenCalledWith("user1");
      expect(ChatMessage.aggregate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            $match: {
              $or: [
                { senderId: "objectid-user1" },
                { receiverId: "objectid-user1" }
              ]
            }
          })
        ])
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Fetched 1 record(s)",
        data: mockResults
      });
    });

    it("should handle empty query parameter", async () => {
      const mockResults = [];
      toObjectId.mockReturnValue("objectid-user1");
      ChatMessage.aggregate = jest.fn().mockResolvedValue(mockResults);

      req.query = {
        senderId: "user1",
        query: ""
      };

      await getConversations(req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Fetched 0 record(s)",
        data: mockResults
      });
    });

    it("should handle database errors", async () => {
      const error = new Error("Aggregation error");
      toObjectId.mockReturnValue("objectid-user1");
      ChatMessage.aggregate = jest.fn().mockRejectedValue(error);

      req.query = {
        senderId: "user1",
        query: "test"
      };

      await getConversations(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe("getRecruitersGroupedByApplications", () => {
    it("should return recruiters grouped by applications successfully", async () => {
      const mockApplications = [
        {
          jobId: {
            _id: "job1",
            title: "Developer",
            employerId: {
              _id: "recruiter1",
              name: "Company A",
              email: "company@a.com"
            }
          },
          status: "Pending",
          appliedAt: new Date(),
          resumeFile: { path: "resume1.pdf" }
        },
        {
          jobId: {
            _id: "job2",
            title: "Designer",
            employerId: {
              _id: "recruiter1",
              name: "Company A",
              email: "company@a.com"
            }
          },
          status: "Phỏng vấn",
          appliedAt: new Date(),
          resumeFile: { path: "resume2.pdf" }
        }
      ];

      mongoose.Types.ObjectId.isValid.mockReturnValue(true);
      
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockApplications)
      };
      
      Application.find = jest.fn().mockReturnValue(mockQuery);

      req.query = { applicantId: "applicant123" };

      await getRecruitersGroupedByApplications(req, res, next);

      expect(mongoose.Types.ObjectId.isValid).toHaveBeenCalledWith("applicant123");
      expect(Application.find).toHaveBeenCalledWith({ applicantId: "applicant123" });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Fetched 1 record(s)",
        data: expect.arrayContaining([
          expect.objectContaining({
            recruiter: expect.objectContaining({
              _id: "recruiter1",
              name: "Company A"
            }),
            jobs: expect.arrayContaining([
              expect.objectContaining({
                applicationStatus: "Pending"
              }),
              expect.objectContaining({
                applicationStatus: "Phỏng vấn"
              })
            ])
          })
        ])
      });
    });

    it("should return 400 for invalid applicantId", async () => {
      mongoose.Types.ObjectId.isValid.mockReturnValue(false);

      req.query = { applicantId: "invalid-id" };

      await getRecruitersGroupedByApplications(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Invalid applicant id (invalid-id)",
        data: []
      });
      expect(Application.find).not.toHaveBeenCalled();
    });

    it("should handle applications with missing job or employer data", async () => {
      const mockApplications = [
        {
          jobId: null, // Missing job
          status: "Pending",
          appliedAt: new Date()
        },
        {
          jobId: {
            _id: "job2",
            title: "Designer",
            employerId: null // Missing employer
          },
          status: "Phỏng vấn",
          appliedAt: new Date()
        }
      ];

      mongoose.Types.ObjectId.isValid.mockReturnValue(true);
      
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockApplications)
      };
      
      Application.find = jest.fn().mockReturnValue(mockQuery);

      req.query = { applicantId: "applicant123" };

      await getRecruitersGroupedByApplications(req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Fetched 0 record(s)",
        data: []
      });
    });

    it("should handle database errors", async () => {
      const error = new Error("Database error");
      mongoose.Types.ObjectId.isValid.mockReturnValue(true);
      
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockRejectedValue(error)
      };
      
      Application.find = jest.fn().mockReturnValue(mockQuery);

      req.query = { applicantId: "applicant123" };

      await getRecruitersGroupedByApplications(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe("getApplicantsGroupedByApplications", () => {
    it("should return applicants grouped by applications successfully", async () => {
      const mockActiveJobs = [
        { _id: "job1", title: "Developer" },
        { _id: "job2", title: "Designer" }
      ];

      const mockApplications = [
        {
          jobId: "job1",
          applicantId: {
            _id: "applicant1",
            name: "John Doe",
            email: "john@example.com"
          },
          status: "Pending",
          appliedAt: new Date(),
          resumeFile: { path: "resume1.pdf" }
        }
      ];

      mongoose.Types.ObjectId.isValid.mockReturnValue(true);
      
      const mockJobQuery = {
        select: jest.fn().mockResolvedValue(mockActiveJobs)
      };
      Job.find = jest.fn().mockReturnValue(mockJobQuery);

      const mockAppQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockApplications)
      };
      Application.find = jest.fn().mockReturnValue(mockAppQuery);

      req.query = { recruiterId: "recruiter123" };

      await getApplicantsGroupedByApplications(req, res, next);

      expect(mongoose.Types.ObjectId.isValid).toHaveBeenCalledWith("recruiter123");
      expect(Job.find).toHaveBeenCalledWith({
        employerId: "recruiter123",
        $or: [
          { deadline: { $gte: expect.any(Date) } },
          { deadline: { $exists: false } },
          { deadline: null }
        ]
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Fetched 1 record(s)",
        data: expect.arrayContaining([
          expect.objectContaining({
            applicant: expect.objectContaining({
              _id: "applicant1",
              name: "John Doe"
            }),
            applications: expect.arrayContaining([
              expect.objectContaining({
                applicationStatus: "Pending"
              })
            ])
          })
        ])
      });
    });

    it("should return 400 for invalid recruiterId", async () => {
      mongoose.Types.ObjectId.isValid.mockReturnValue(false);

      req.query = { recruiterId: "invalid-id" };

      await getApplicantsGroupedByApplications(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Invalid recruiter Id (invalid-id)",
        data: []
      });
    });

    it("should handle empty active jobs", async () => {
      mongoose.Types.ObjectId.isValid.mockReturnValue(true);
      
      const mockJobQuery = {
        select: jest.fn().mockResolvedValue([])
      };
      Job.find = jest.fn().mockReturnValue(mockJobQuery);

      const mockAppQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([])
      };
      Application.find = jest.fn().mockReturnValue(mockAppQuery);

      req.query = { recruiterId: "recruiter123" };

      await getApplicantsGroupedByApplications(req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Fetched 0 record(s)",
        data: []
      });
    });

    it("should handle database errors", async () => {
      const error = new Error("Database error");
      mongoose.Types.ObjectId.isValid.mockReturnValue(true);
      
      const mockJobQuery = {
        select: jest.fn().mockRejectedValue(error)
      };
      Job.find = jest.fn().mockReturnValue(mockJobQuery);

      req.query = { recruiterId: "recruiter123" };

      await getApplicantsGroupedByApplications(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe("markMessagesAsRead", () => {
    it("should mark messages as read successfully", async () => {
      const messageIds = ["msg1", "msg2"];
      const mockUpdateResult = {
        modifiedCount: 2,
        matchedCount: 2
      };
      const mockModifiedMessages = [
        { _id: "msg1" },
        { _id: "msg2" }
      ];

      mongoose.Types.ObjectId.isValid.mockReturnValue(true);
      ChatMessage.updateMany.mockResolvedValue(mockUpdateResult);
      
      const mockQuery = {
        select: jest.fn().mockResolvedValue(mockModifiedMessages)
      };
      ChatMessage.find.mockReturnValue(mockQuery);

      req.body = { messageIds, is_read: true };

      await markMessagesAsRead(req, res, next);

      expect(ChatMessage.updateMany).toHaveBeenCalledWith(
        { _id: { $in: messageIds } },
        { $set: { is_read: true } }
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Updated 2 message(s)",
        data: {
          ...mockUpdateResult,
          modifiedIds: ["msg1", "msg2"],
          is_read: true
        }
      });
    });

    it("should return 400 when messageIds is not an array", async () => {
      req.body = { messageIds: "not-an-array" };

      await markMessagesAsRead(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "messageIds (array) is required",
        data: []
      });
      expect(ChatMessage.updateMany).not.toHaveBeenCalled();
    });

    it("should return 400 when messageIds is empty array", async () => {
      req.body = { messageIds: [] };

      await markMessagesAsRead(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "messageIds (array) is required",
        data: []
      });
    });

    it("should return 400 when no valid ObjectIds provided", async () => {
      mongoose.Types.ObjectId.isValid.mockReturnValue(false);

      req.body = { messageIds: ["invalid1", "invalid2"] };

      await markMessagesAsRead(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "No valid message IDs provided",
        data: []
      });
    });

    it("should handle database errors", async () => {
      const error = new Error("Update error");
      mongoose.Types.ObjectId.isValid.mockReturnValue(true);
      ChatMessage.updateMany.mockRejectedValue(error);

      req.body = { messageIds: ["msg1"] };

      await markMessagesAsRead(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe("getUnreadMessagesSenders", () => {
    it("should return unread messages senders successfully", async () => {
      const mockResults = [
        {
          senderId: "sender1",
          name: "John Doe",
          email: "john@example.com",
          avatarUrl: "avatar1.jpg",
          unreadCount: 3,
          latestMessage: "Hello",
          latestSentAt: new Date()
        }
      ];

      ChatMessage.aggregate = jest.fn().mockResolvedValue(mockResults);

      req.query = {};

      await getUnreadMessagesSenders(req, res, next);

      expect(ChatMessage.aggregate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            $match: {
              receiverId: "user123",
              is_read: false
            }
          })
        ])
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Fetched 1 sender(s) with unread messages",
        data: mockResults
      });
    });

    it("should filter by date range when provided", async () => {
      const mockResults = [];
      ChatMessage.aggregate = jest.fn().mockResolvedValue(mockResults);

      req.query = {
        startDate: "2023-01-01",
        endDate: "2023-12-31"
      };

      await getUnreadMessagesSenders(req, res, next);

      expect(ChatMessage.aggregate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            $match: {
              receiverId: "user123",
              is_read: false,
              sentAt: {
                $gte: new Date("2023-01-01"),
                $lte: new Date("2023-12-31")
              }
            }
          })
        ])
      );
    });

    it("should filter by startDate only", async () => {
      const mockResults = [];
      ChatMessage.aggregate = jest.fn().mockResolvedValue(mockResults);

      req.query = {
        startDate: "2023-01-01"
      };

      await getUnreadMessagesSenders(req, res, next);

      expect(ChatMessage.aggregate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            $match: {
              receiverId: "user123",
              is_read: false,
              sentAt: {
                $gte: new Date("2023-01-01")
              }
            }
          })
        ])
      );
    });

    it("should handle database errors", async () => {
      const error = new Error("Aggregation error");
      ChatMessage.aggregate = jest.fn().mockRejectedValue(error);

      req.query = {};

      await getUnreadMessagesSenders(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });

    it("should return empty results when no unread messages", async () => {
      ChatMessage.aggregate = jest.fn().mockResolvedValue([]);

      req.query = {};

      await getUnreadMessagesSenders(req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Fetched 0 sender(s) with unread messages",
        data: []
      });
    });
  });
});
