// Mock all dependencies BEFORE importing anything
jest.mock("../../models/applicantProfile.model.js");
jest.mock("../../models/application.model.js");
jest.mock("../../models/user.model.js");
jest.mock("../../models/project.model.js");
jest.mock("../../config/cloudinary.js", () => ({
  uploader: {
    upload_stream: jest.fn(),
    destroy: jest.fn(),
  },
}));
jest.mock("../../config/convertdocx.js", () => ({
  convert: jest.fn(),
}));
jest.mock("../../config/aws-s3.js", () => jest.fn());
jest.mock("@aws-sdk/client-s3", () => ({
  DeleteObjectCommand: jest.fn(),
}));
jest.mock("multer", () => {
  const multer = () => ({
    single: jest.fn(() => (req, res, next) => {
      req.file = {
        buffer: Buffer.from("test file content"),
        originalname: "test-cv.pdf",
        mimetype: "application/pdf",
      };
      next();
    }),
  });
  multer.memoryStorage = jest.fn(() => ({}));
  return multer;
});
jest.mock("fs/promises");
jest.mock("os");
jest.mock("path", () => ({
  ...jest.requireActual("path"),
  join: jest.fn((...args) => args.join("/")),
  extname: jest.fn((filename) => {
    const lastDot = filename.lastIndexOf(".");
    return lastDot === -1 ? "" : filename.slice(lastDot);
  }),
  parse: jest.fn((filename) => ({
    name: filename.split(".")[0],
  })),
}));
jest.mock("uuid", () => ({
  v4: jest.fn(() => "mock-uuid"),
}));
jest.mock("check-types");

import {
  uploadCV,
  getUploadedCVs,
  deleteUploadedCV,
  getProfile,
  countApplicationsByApplicant,
  searchApplicants,
  createProject,
  getMyProjects,
  updateProject,
  deleteProject,
} from "../../controllers/applicant.controller.js";
import ApplicantProfile from "../../models/applicantProfile.model.js";
import Application from "../../models/application.model.js";
import User from "../../models/user.model.js";
import Project from "../../models/project.model.js";
import cloudinary from "../../config/cloudinary.js";
import convertApi from "../../config/convertdocx.js";
import connectS3 from "../../config/aws-s3.js";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs/promises";
import os from "os";
import check from "check-types";

// Set up global mocks before tests
global.cloudinary = cloudinary;
global.convertApi = convertApi;

describe("Applicant Controller", () => {
  let req, res, next;
  let consoleSpy;
  let mockApplicantProfile;
  let mockUser;
  let mockProject;
  let mockS3Client;

  beforeEach(() => {
    req = {
      body: {},
      params: {},
      query: {},
      user: { _id: "user123", accountType: "Ứng Viên" },
      file: null,
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();

    // Mock console methods to prevent log pollution in tests
    consoleSpy = {
      log: jest.spyOn(console, "log").mockImplementation(() => {}),
      error: jest.spyOn(console, "error").mockImplementation(() => {}),
    };

    mockApplicantProfile = {
      _id: "profile123",
      userId: "user123",
      jobTitle: "Developer",
      education: "University",
      skillIds: ["skill1", "skill2"],
      experience: "2 years",
      resumeFiles: [
        {
          _id: "file123",
          path: "http://cloudinary.com/test-cv.pdf",
          contentType: "application/pdf",
          uploadedAt: new Date(),
        },
      ],
      save: jest.fn().mockResolvedValue(),
      populate: jest.fn().mockReturnThis(),
    };

    mockUser = {
      _id: "user123",
      name: "Test User",
      email: "test@example.com",
      phone: "0123456789",
      city: "Hanoi",
      accountType: "Ứng Viên",
    };

    mockProject = {
      _id: "project123",
      name: "Test Project",
      description: "Test Description",
      applicantId: "profile123",
      media: [
        {
          url: "https://s3.amazonaws.com/career-shift/test-file.jpg",
        },
      ],
      save: jest.fn().mockResolvedValue(),
      deleteOne: jest.fn().mockResolvedValue(),
    };

    mockS3Client = {
      send: jest.fn().mockResolvedValue({}),
    };

    // Reset all mocks
    jest.clearAllMocks();

    // Setup default mocks
    ApplicantProfile.findOne = jest.fn();
    ApplicantProfile.prototype.save = jest.fn();
    Application.countDocuments = jest.fn();
    User.aggregate = jest.fn();
    Project.find = jest.fn();
    Project.findById = jest.fn();
    Project.prototype.save = jest.fn();
    connectS3.mockReturnValue(mockS3Client);

    // Reset cloudinary and convertApi mocks
    cloudinary.uploader = {
      upload_stream: jest.fn(),
      destroy: jest.fn(),
    };
    convertApi.convert = jest.fn();

    fs.writeFile = jest.fn();
    fs.unlink = jest.fn();
    os.tmpdir = jest.fn().mockReturnValue("/tmp");
    check.nonEmptyArray = jest.fn();

    // Mock path functions that are used in controller
    require("path").extname = jest.fn((filename) => {
      if (!filename) return "";
      const lastDot = filename.lastIndexOf(".");
      return lastDot === -1 ? "" : filename.slice(lastDot);
    });
    require("path").parse = jest.fn((filename) => ({
      name: filename ? filename.split(".")[0] : "",
    }));
    require("path").join = jest.fn((...args) => args.join("/"));
  });

  afterEach(() => {
    // Restore console methods
    consoleSpy.log.mockRestore();
    consoleSpy.error.mockRestore();
  });

  describe("getUploadedCVs", () => {
    it("should get uploaded CVs successfully", async () => {
      ApplicantProfile.findOne.mockResolvedValue(mockApplicantProfile);

      await getUploadedCVs(req, res, next);

      expect(ApplicantProfile.findOne).toHaveBeenCalledWith({
        userId: "user123",
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Uploaded CVs fetched successfully",
        data: mockApplicantProfile.resumeFiles,
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should return empty list when applicant profile not found", async () => {
      ApplicantProfile.findOne.mockResolvedValue(null);

      await getUploadedCVs(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Applicant profile not found, returning empty list",
        data: [],
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should handle database errors", async () => {
      const error = new Error("Database error");
      ApplicantProfile.findOne.mockRejectedValue(error);

      await getUploadedCVs(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("deleteUploadedCV", () => {
    beforeEach(() => {
      req.params.cvId = "file123";
    });

    it("should delete uploaded CV successfully", async () => {
      ApplicantProfile.findOne.mockResolvedValue(mockApplicantProfile);
      cloudinary.uploader.destroy.mockResolvedValue({ result: "ok" });

      await deleteUploadedCV(req, res, next);

      expect(ApplicantProfile.findOne).toHaveBeenCalledWith({
        userId: "user123",
      });
      // Note: cloudinary.uploader.destroy is called conditionally only if CV is found
      expect(cloudinary.uploader.destroy).toHaveBeenCalled();
      expect(mockApplicantProfile.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Uploaded CV deleted successfully",
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should return error when applicant profile not found", async () => {
      ApplicantProfile.findOne.mockResolvedValue(null);

      await deleteUploadedCV(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Applicant profile not found",
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should handle CV not found in resumeFiles", async () => {
      const profileWithoutCV = {
        ...mockApplicantProfile,
        resumeFiles: [],
        save: jest.fn().mockResolvedValue(),
      };
      ApplicantProfile.findOne.mockResolvedValue(profileWithoutCV);

      await deleteUploadedCV(req, res, next);

      expect(profileWithoutCV.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Uploaded CV deleted successfully",
      });
    });

    it("should handle database errors", async () => {
      const error = new Error("Database error");
      ApplicantProfile.findOne.mockRejectedValue(error);

      await deleteUploadedCV(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("getProfile", () => {
    it("should get profile successfully", async () => {
      const populatedProfile = {
        ...mockApplicantProfile,
        userId: mockUser,
      };
      mockApplicantProfile.populate.mockResolvedValue(populatedProfile);
      ApplicantProfile.findOne.mockResolvedValue(mockApplicantProfile);

      await getProfile(req, res, next);

      expect(ApplicantProfile.findOne).toHaveBeenCalledWith({
        userId: "user123",
      });
      expect(mockApplicantProfile.populate).toHaveBeenCalledWith({
        path: "userId",
        select: "name email phone city",
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: populatedProfile,
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should return error when profile not found", async () => {
      ApplicantProfile.findOne.mockResolvedValue(null);

      await getProfile(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Applicant profile not found",
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should handle database errors", async () => {
      const error = new Error("Database error");
      ApplicantProfile.findOne.mockRejectedValue(error);

      await getProfile(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("countApplicationsByApplicant", () => {
    it("should count applications successfully", async () => {
      Application.countDocuments.mockResolvedValue(5);

      await countApplicationsByApplicant(req, res, next);

      expect(Application.countDocuments).toHaveBeenCalledWith({
        applicantId: "user123",
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Count of applications fetched successfully",
        data: { totalApplications: 5 },
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should handle database errors", async () => {
      const error = new Error("Database error");
      Application.countDocuments.mockRejectedValue(error);

      await countApplicationsByApplicant(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("searchApplicants", () => {
    beforeEach(() => {
      req.user.accountType = "Nhà Tuyển Dụng";
      req.query = {
        jobTitle: "Developer",
        skillIds: ["skill1", "skill2"],
        experience: "2 years",
        location: "Hanoi",
      };
    });

    it("should search applicants successfully", async () => {
      const mockApplicants = [
        {
          name: "Test User",
          profile: {
            jobTitle: "Developer",
            experience: "2 years",
            skillIds: ["skill1", "skill2"],
          },
          city: "Hanoi",
        },
      ];
      check.nonEmptyArray.mockReturnValue(true);
      User.aggregate.mockResolvedValue(mockApplicants);

      await searchApplicants(req, res, next);

      expect(User.aggregate).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Danh sách ứng viên được tìm thấy.",
        data: mockApplicants,
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should return error for non-recruiter users", async () => {
      req.user.accountType = "Ứng Viên";

      await searchApplicants(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Chỉ nhà tuyển dụng mới có thể tìm kiếm ứng viên.",
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should search without optional parameters", async () => {
      req.query = { jobTitle: "Developer" };
      check.nonEmptyArray.mockReturnValue(false);
      User.aggregate.mockResolvedValue([]);

      await searchApplicants(req, res, next);

      expect(User.aggregate).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("should handle database errors", async () => {
      const error = new Error("Database error");
      check.nonEmptyArray.mockReturnValue(true);
      User.aggregate.mockRejectedValue(error);

      await searchApplicants(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("createProject", () => {
    beforeEach(() => {
      req.body = {
        name: "Test Project",
        description: "Test Description",
      };
    });

    it("should create project successfully", async () => {
      ApplicantProfile.findOne.mockResolvedValue(mockApplicantProfile);
      const newProject = new Project({
        name: "Test Project",
        description: "Test Description",
        applicantId: "profile123",
      });
      newProject.save = jest.fn().mockResolvedValue(newProject);

      const handler = createProject[0]; // Get the handler function
      await handler(req, res, next);

      expect(ApplicantProfile.findOne).toHaveBeenCalledWith({
        userId: "user123",
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Project created successfully",
        data: expect.any(Object),
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should return error when applicant profile not found", async () => {
      ApplicantProfile.findOne.mockResolvedValue(null);

      const handler = createProject[0];
      await handler(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Applicant profile not found",
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should handle database errors", async () => {
      const error = new Error("Database error");
      ApplicantProfile.findOne.mockRejectedValue(error);

      const handler = createProject[0];
      await handler(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("getMyProjects", () => {
    it("should get user projects successfully", async () => {
      ApplicantProfile.findOne.mockResolvedValue(mockApplicantProfile);
      Project.find.mockResolvedValue([mockProject]);

      await getMyProjects(req, res, next);

      expect(ApplicantProfile.findOne).toHaveBeenCalledWith({
        userId: "user123",
      });
      expect(Project.find).toHaveBeenCalledWith({
        applicantId: "profile123",
      });
      // Note: console.log is called in the actual controller
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Fetched user projects successfully",
        data: [mockProject],
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should return error when applicant profile not found", async () => {
      ApplicantProfile.findOne.mockResolvedValue(null);

      await getMyProjects(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Applicant profile not found",
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should handle database errors", async () => {
      const error = new Error("Database error");
      ApplicantProfile.findOne.mockRejectedValue(error);

      await getMyProjects(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("updateProject", () => {
    beforeEach(() => {
      req.params.projectId = "project123";
      req.body = {
        name: "Updated Project",
        description: "Updated Description",
      };
    });

    it("should update project successfully", async () => {
      Project.findById.mockResolvedValue(mockProject);
      ApplicantProfile.findOne.mockResolvedValue(mockApplicantProfile);
      mockProject.applicantId = { equals: jest.fn().mockReturnValue(true) };

      await updateProject(req, res, next);

      expect(Project.findById).toHaveBeenCalledWith("project123");
      expect(ApplicantProfile.findOne).toHaveBeenCalledWith({
        userId: "user123",
      });
      expect(mockProject.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Project updated",
        data: mockProject,
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should return error when project not found", async () => {
      Project.findById.mockResolvedValue(null);

      await updateProject(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Project not found",
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should return error when unauthorized", async () => {
      Project.findById.mockResolvedValue(mockProject);
      ApplicantProfile.findOne.mockResolvedValue(mockApplicantProfile);
      mockProject.applicantId = { equals: jest.fn().mockReturnValue(false) };

      await updateProject(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Unauthorized",
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should handle database errors", async () => {
      const error = new Error("Database error");
      Project.findById.mockRejectedValue(error);

      await updateProject(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("deleteProject", () => {
    beforeEach(() => {
      req.params.projectId = "project123";
    });

    it("should return error when project not found", async () => {
      Project.findById.mockResolvedValue(null);

      await deleteProject(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Project not found",
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should handle projects with no media files", async () => {
      const projectWithoutMedia = { ...mockProject, media: [] };
      projectWithoutMedia.applicantId = {
        equals: jest.fn().mockReturnValue(true),
      };
      Project.findById.mockResolvedValue(projectWithoutMedia);
      ApplicantProfile.findOne.mockResolvedValue(mockApplicantProfile);

      await deleteProject(req, res, next);

      expect(mockS3Client.send).not.toHaveBeenCalled();
      expect(projectWithoutMedia.deleteOne).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("should handle database errors", async () => {
      const error = new Error("Database error");
      Project.findById.mockRejectedValue(error);

      await deleteProject(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("uploadCV", () => {
    beforeEach(() => {
      req.file = {
        buffer: Buffer.from("test file content"),
        originalname: "test-cv.pdf",
        mimetype: "application/pdf",
      };
    });

    it("should return error when no file uploaded", async () => {
      req.file = null;

      const handler = uploadCV[1];
      await handler(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "No file uploaded",
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should handle cloudinary upload errors", async () => {
      // Ensure req.file has proper structure
      req.file = {
        buffer: Buffer.from("test file content"),
        originalname: "test-cv.pdf",
        mimetype: "application/pdf",
      };

      const uploadError = new Error("Cloudinary upload failed");

      cloudinary.uploader.upload_stream.mockImplementation(
        (options, callback) => {
          process.nextTick(() => callback(uploadError, null));
          return { end: jest.fn() };
        }
      );

      const handler = uploadCV[1];
      await handler(req, res, next);

      // Wait for the next tick to complete
      await new Promise((resolve) => process.nextTick(resolve));

      expect(next).toHaveBeenCalledWith(uploadError);
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    it("should handle conversion errors", async () => {
      req.file.originalname = "test-cv.docx";
      req.file.mimetype =
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

      const conversionError = new Error("Conversion failed");
      convertApi.convert.mockRejectedValue(conversionError);

      const handler = uploadCV[1];
      await handler(req, res, next);

      expect(next).toHaveBeenCalledWith(conversionError);
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });
});
