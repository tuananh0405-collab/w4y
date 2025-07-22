// Mock all dependencies BEFORE importing anything
jest.mock("../../models/application.model.js");
jest.mock("../../models/job.model.js");
jest.mock("../../models/applicantProfile.model.js");
jest.mock("../../config/nodemailer.js", () => ({
  sendMail: jest.fn(),
}));
jest.mock("multer", () => {
  const multer = () => ({
    single: jest.fn(() => (req, res, next) => {
      req.file = {
        path: "/uploads/cvs/user123-12345.pdf",
        originalname: "test-cv.pdf",
        mimetype: "application/pdf",
      };
      next();
    }),
  });
  multer.diskStorage = jest.fn(() => ({}));
  return multer;
});
jest.mock("path", () => ({
  ...jest.requireActual("path"),
  extname: jest.fn((filename) => {
    const lastDot = filename.lastIndexOf(".");
    return lastDot === -1 ? "" : filename.slice(lastDot);
  }),
}));

import {
  applyJob,
  viewApplicationStatus,
  getApplications,
  updateApplicationStatus,
  listAppliedJobs,
  getApplicationStatusDistribution,
  getApplicationsByJob,
  getApplicationsSubmittedOverTime,
  getAllApplications,
} from "../../controllers/application.controller.js";
import Application from "../../models/application.model.js";
import Job from "../../models/job.model.js";
import ApplicantProfile from "../../models/applicantProfile.model.js";
import transporter from "../../config/nodemailer.js";

describe("Application Controller", () => {
  let req, res, next;
  let consoleSpy;
  let mockApplication;
  let mockJob;
  let mockApplicantProfile;

  beforeEach(() => {
    req = {
      body: {},
      params: {},
      query: {},
      user: { _id: "user123", email: "test@example.com" },
      file: null,
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();

    // Reset all mocks completely
    jest.clearAllMocks();

    // Mock console.error to prevent log pollution in tests
    consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    mockApplication = {
      _id: "app123",
      applicantId: "user123",
      jobId: "job123",
      status: "Pending",
      appliedAt: new Date(),
      resumeFile: {
        path: "/uploads/cvs/user123-12345.pdf",
        contentType: "application/pdf",
      },
      save: jest.fn().mockResolvedValue(),
    };

    mockJob = {
      _id: "job123",
      title: "Software Developer",
      position: "Developer",
      description: "Great job opportunity",
      employerId: "employer123",
      salary: "$50,000",
      location: "Remote",
      experience: "2 years",
    };

    mockApplicantProfile = {
      _id: "profile123",
      userId: "user123",
      resumeFile: {
        path: "/uploads/cvs/user123-12345.pdf",
        contentType: "application/pdf",
      },
      save: jest.fn().mockResolvedValue(),
    };

    // Ensure model methods are properly mocked
    Application.findOne = jest.fn();
    Application.findById = jest.fn();
    Application.find = jest.fn();
    Application.countDocuments = jest.fn();
    Application.findByIdAndUpdate = jest.fn();
    Application.aggregate = jest.fn();
    Application.prototype.save = jest.fn();

    Job.findById = jest.fn();
    Job.find = jest.fn();

    ApplicantProfile.findOne = jest.fn();
    ApplicantProfile.prototype.save = jest.fn();

    transporter.sendMail = jest.fn();
  });

  afterEach(() => {
    // Restore console.error
    consoleSpy.mockRestore();
  });

  describe("applyJob", () => {
    beforeEach(() => {
      req.params.jobId = "job123";
      req.file = {
        path: "/uploads/cvs/user123-12345.pdf",
        originalname: "test-cv.pdf",
        mimetype: "application/pdf",
      };
    });

    it("should apply for job successfully with new applicant profile", async () => {
      Job.findById.mockResolvedValue(mockJob);
      Application.findOne.mockResolvedValue(null);
      ApplicantProfile.findOne.mockResolvedValue(null); // No existing profile
      ApplicantProfile.prototype.save.mockResolvedValue(mockApplicantProfile);
      Application.prototype.save.mockResolvedValue(mockApplication);

      const handler = applyJob[1];
      await handler(req, res, next);

      expect(ApplicantProfile.prototype.save).toHaveBeenCalled();
      expect(Application.prototype.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(next).not.toHaveBeenCalled();
    });

    it("should return error when job not found", async () => {
      Job.findById.mockResolvedValue(null);

      const handler = applyJob[1];
      await handler(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Job not found",
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should return error when already applied", async () => {
      Job.findById.mockResolvedValue(mockJob);
      Application.findOne.mockResolvedValue(mockApplication); // Existing application

      const handler = applyJob[1];
      await handler(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "You have already applied for this job",
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should return error when no CV file uploaded", async () => {
      req.file = null;
      Job.findById.mockResolvedValue(mockJob);
      Application.findOne.mockResolvedValue(null);

      const handler = applyJob[1];
      await handler(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "No CV file uploaded",
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should handle errors", async () => {
      const error = new Error("Database error");
      Job.findById.mockRejectedValue(error);

      const handler = applyJob[1];
      await handler(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("viewApplicationStatus", () => {
    beforeEach(() => {
      req.params.applicationId = "app123";
    });

    it("should return application status successfully", async () => {
      Application.findById.mockResolvedValue(mockApplication);

      await viewApplicationStatus(req, res, next);

      expect(Application.findById).toHaveBeenCalledWith("app123");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Application status fetched successfully",
        data: {
          status: mockApplication.status,
          appliedAt: mockApplication.appliedAt,
        },
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should return error when application not found", async () => {
      Application.findById.mockResolvedValue(null);

      await viewApplicationStatus(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Application not found",
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should return error when unauthorized access", async () => {
      const unauthorizedApplication = {
        ...mockApplication,
        applicantId: "otheruser123",
      };
      Application.findById.mockResolvedValue(unauthorizedApplication);

      await viewApplicationStatus(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Unauthorized access",
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should handle errors", async () => {
      const error = new Error("Database error");
      Application.findById.mockRejectedValue(error);

      await viewApplicationStatus(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("getApplications", () => {
    it("should get applications with employerId filter", async () => {
      req.query.employerId = "employer123";
      const mockJobs = [{ _id: "job123" }, { _id: "job456" }];
      const mockApplications = [
        {
          ...mockApplication,
          applicantId: { name: "John Doe", experience: "2 years" },
          jobId: { position: "Developer", createdAt: new Date() },
        },
      ];

      Job.find.mockResolvedValue(mockJobs);
      Application.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockApplications),
          }),
        }),
      });

      await getApplications(req, res, next);

      expect(Job.find).toHaveBeenCalledWith(
        { employerId: "employer123" },
        "_id"
      );
      expect(Application.find).toHaveBeenCalledWith({
        jobId: { $in: ["job123", "job456"] },
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Applications with user and job info fetched successfully",
        data: mockApplications,
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should get all applications without filter", async () => {
      const mockApplications = [mockApplication];

      Application.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockApplications),
          }),
        }),
      });

      await getApplications(req, res, next);

      expect(Application.find).toHaveBeenCalledWith({});
      expect(res.status).toHaveBeenCalledWith(200);
      expect(next).not.toHaveBeenCalled();
    });

    it("should handle errors", async () => {
      const error = new Error("Database error");
      Application.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockRejectedValue(error),
          }),
        }),
      });

      await getApplications(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("updateApplicationStatus", () => {
    beforeEach(() => {
      req.params.applicationId = "app123";
      req.body.status = "Phỏng vấn";
    });

    it("should update application status successfully and send email", async () => {
      const populatedApplication = {
        ...mockApplication,
        applicantId: { name: "John Doe", email: "john@example.com" },
        jobId: { position: "Developer" },
        save: jest.fn().mockResolvedValue(),
      };
      Application.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(populatedApplication),
      });
      transporter.sendMail.mockResolvedValue();

      await updateApplicationStatus(req, res, next);

      expect(Application.findById).toHaveBeenCalledWith("app123");
      expect(populatedApplication.save).toHaveBeenCalled();
      expect(transporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "john@example.com",
          subject: "Thông báo kết quả ứng tuyển",
        })
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Cập nhật trạng thái thành công và gửi mail thông báo.",
        data: populatedApplication,
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should return error for invalid status", async () => {
      req.body.status = "Invalid Status";

      await updateApplicationStatus(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Trạng thái không hợp lệ",
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should return error when application not found", async () => {
      Application.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(null),
      });

      await updateApplicationStatus(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Ứng dụng không tồn tại",
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should handle errors", async () => {
      const error = new Error("Database error");
      Application.findById.mockReturnValue({
        populate: jest.fn().mockRejectedValue(error),
      });

      await updateApplicationStatus(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("listAppliedJobs", () => {
    beforeEach(() => {
      req.query = { page: "1", limit: "10", search: "" };
    });

    it("should list applied jobs successfully", async () => {
      const mockApplications = [
        {
          jobId: {
            _id: "job123",
            title: "Software Developer",
            description: "Great job",
            salary: "$50,000",
            position: "Developer",
            location: "Remote",
            experience: "2 years",
            employerId: { name: "TechCorp" },
          },
          appliedAt: new Date(),
          resumeFile: { path: "/uploads/cvs/test.pdf" },
        },
      ];

      Application.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            skip: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue(mockApplications),
            }),
          }),
        }),
      });
      Application.countDocuments.mockResolvedValue(1);

      await listAppliedJobs(req, res, next);

      expect(Application.find).toHaveBeenCalledWith({ applicantId: "user123" });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Applied jobs fetched successfully",
        data: expect.any(Array),
        pagination: expect.objectContaining({
          currentPage: 1,
          totalPages: 1,
          totalApplications: 1,
        }),
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should handle errors", async () => {
      const error = new Error("Database error");
      Application.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            skip: jest.fn().mockReturnValue({
              limit: jest.fn().mockRejectedValue(error),
            }),
          }),
        }),
      });

      await listAppliedJobs(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("getApplicationStatusDistribution", () => {
    it("should return status distribution successfully", async () => {
      const mockStats = [
        { _id: "Pending", count: 5 },
        { _id: "Phỏng vấn", count: 3 },
        { _id: "Từ chối", count: 2 },
      ];
      Application.aggregate.mockResolvedValue(mockStats);

      await getApplicationStatusDistribution(req, res);

      expect(Application.aggregate).toHaveBeenCalledWith([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]);
      expect(res.json).toHaveBeenCalledWith({
        data: {
          Pending: 5,
          "Phỏng vấn": 3,
          "Từ chối": 2,
        },
      });
    });

    it("should handle errors", async () => {
      const error = new Error("Database error");
      Application.aggregate.mockRejectedValue(error);

      await getApplicationStatusDistribution(req, res);

      expect(consoleSpy).toHaveBeenCalledWith(
        "Error fetching application status distribution:",
        error
      );
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: "Server error" });
    });
  });

  describe("getApplicationsByJob", () => {
    it("should return applications by job successfully", async () => {
      const mockStats = [
        { _id: "job123", count: 10, jobTitle: "Software Developer" },
        { _id: "job456", count: 8, jobTitle: "Data Analyst" },
      ];
      Application.aggregate.mockResolvedValue(mockStats);

      await getApplicationsByJob(req, res);

      expect(Application.aggregate).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        data: [
          { job: "Software Developer", count: 10 },
          { job: "Data Analyst", count: 8 },
        ],
      });
    });

    it("should handle errors", async () => {
      const error = new Error("Database error");
      Application.aggregate.mockRejectedValue(error);

      await getApplicationsByJob(req, res);

      expect(consoleSpy).toHaveBeenCalledWith(
        "Error fetching applications by job:",
        error
      );
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: "Server error" });
    });
  });

  describe("getApplicationsSubmittedOverTime", () => {
    it("should return applications over time successfully", async () => {
      const mockStats = [
        { _id: { year: 2024, month: 1 }, count: 15 },
        { _id: { year: 2024, month: 2 }, count: 20 },
      ];
      Application.aggregate.mockResolvedValue(mockStats);

      await getApplicationsSubmittedOverTime(req, res);

      expect(Application.aggregate).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        data: {
          "2024-01": 15,
          "2024-02": 20,
        },
      });
    });

    it("should handle errors", async () => {
      const error = new Error("Database error");
      Application.aggregate.mockRejectedValue(error);

      await getApplicationsSubmittedOverTime(req, res);

      expect(consoleSpy).toHaveBeenCalledWith(
        "Error fetching applications submitted over time:",
        error
      );
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: "Server error" });
    });
  });

  describe("getAllApplications", () => {
    beforeEach(() => {
      req.query = {
        page: "1",
        limit: "10",
        sortField: "appliedAt",
        sortOrder: "desc",
      };
    });

    it("should get all applications successfully", async () => {
      const mockApplications = [
        {
          _id: "app123",
          applicantId: { name: "John Doe", email: "john@example.com" },
          jobId: { title: "Software Developer" },
          status: "Pending",
          appliedAt: new Date(),
        },
      ];

      Application.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            sort: jest.fn().mockReturnValue({
              skip: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue(mockApplications),
              }),
            }),
          }),
        }),
      });
      Application.countDocuments.mockResolvedValue(1);

      await getAllApplications(req, res, next);

      expect(Application.find).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "All applications fetched successfully",
        data: expect.any(Array),
        pagination: expect.objectContaining({
          currentPage: 1,
          totalPages: 1,
          totalApplications: 1,
        }),
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should handle custom sorting", async () => {
      req.query.sortField = "status";
      req.query.sortOrder = "asc";

      Application.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            sort: jest.fn().mockReturnValue({
              skip: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue([]),
              }),
            }),
          }),
        }),
      });
      Application.countDocuments.mockResolvedValue(0);

      await getAllApplications(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(next).not.toHaveBeenCalled();
    });

    it("should handle errors", async () => {
      const error = new Error("Database error");
      Application.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            sort: jest.fn().mockReturnValue({
              skip: jest.fn().mockReturnValue({
                limit: jest.fn().mockRejectedValue(error),
              }),
            }),
          }),
        }),
      });

      await getAllApplications(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });
});
