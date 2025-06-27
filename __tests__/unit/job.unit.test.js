import {
  createJobPosting,
  viewJobList,
  viewJobDetail,
  updateJob,
  deleteJob,
  getFilterOptions,
  getJobsByEmployer
} from "../../controllers/job.controller.js";
import Job from "../../models/job.model.js";
import User from "../../models/user.model.js";

jest.mock("../../models/job.model.js");
jest.mock("../../models/user.model.js");

describe("Job Controller", () => {
  let req, res, next;

  beforeEach(() => {
    req = { body: {}, params: {}, query: {}, user: { _id: "employerId" } };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe("createJobPosting", () => {
    it("should return 400 if job already exists", async () => {
      Job.findOne.mockResolvedValue({});
      await createJobPosting(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: "Job already posted" });
    });
    it("should create and return new job if not exists", async () => {
      Job.findOne.mockResolvedValue(null);
      Job.prototype.save = jest.fn().mockResolvedValue();
      User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({ name: "Employer" }),
      });
      req.body.title = "New Job";
      await createJobPosting(req, res, next);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });
  });

  describe("viewJobList", () => {
    it("should return job list", async () => {
      Job.find.mockResolvedValue([
        {
          _id: "1",
          employerId: "employerId",
          title: "Job",
          description: "",
          requirements: "",
          salary: "",
          deliveryTime: "",
          priorityLevel: "",
          createdAt: new Date(),
          location: "",
          experience: "",
        },
      ]);
      User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({ name: "Employer" }),
      });
      await viewJobList(req, res, next);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });
    it("should handle errors", async () => {
      Job.find.mockRejectedValue(new Error("fail"));
      await viewJobList(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe("viewJobDetail", () => {
    it("should return 404 if job not found", async () => {
      Job.findById.mockResolvedValue(null);
      req.params.jobId = "1";
      await viewJobDetail(req, res, next);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: "Job not found" });
    });
    it("should return job detail if found", async () => {
      Job.findById.mockResolvedValue({
        employerId: "employerId",
        title: "Job",
        description: "",
        requirements: "",
        experience: "",
        salary: "",
        deliveryTime: "",
        priorityLevel: "",
        createdAt: new Date(),
        deadline: new Date(),
      });
      User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({ name: "Employer" }),
      });
      req.params.jobId = "1";
      await viewJobDetail(req, res, next);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });
  });

  describe("updateJob", () => {
    it("should return 404 if job not found", async () => {
      Job.findById.mockResolvedValue(null);
      req.params.jobId = "1";
      await updateJob(req, res, next);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: "Job not found" });
    });
    it("should update and return job if found", async () => {
      const save = jest.fn().mockResolvedValue({});
      Job.findById.mockResolvedValue({
        save,
        title: "",
        description: "",
        requirements: "",
        salary: "",
        deliveryTime: "",
        priorityLevel: "",
      });
      req.params.jobId = "1";
      req.body = { title: "Updated" };
      await updateJob(req, res, next);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });
  });

  describe("deleteJob", () => {
    it("should return 404 if job not found", async () => {
      Job.findByIdAndDelete.mockResolvedValue(null);
      req.params.jobId = "1";
      await deleteJob(req, res, next);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: "Job not found" });
    });
    it("should delete and return success if found", async () => {
      Job.findByIdAndDelete.mockResolvedValue({});
      req.params.jobId = "1";
      await deleteJob(req, res, next);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Job deleted successfully",
      });
    });
  });

  describe("getFilterOptions", () => {
    it("should return filter options", async () => {
      Job.distinct.mockImplementation((field) =>
        Promise.resolve(field === "location" ? ["Hanoi"] : ["Dev"])
      );
      await getFilterOptions(req, res, next);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });
    it("should handle errors", async () => {
      Job.distinct.mockRejectedValue(new Error("fail"));
      await getFilterOptions(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe("getJobsByEmployer", () => {
    it("should return 400 if employerId is missing", async () => {
      req.params.employerId = undefined;
      await getJobsByEmployer(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Employer ID is required",
      });
    });
    it("should return jobs for employer", async () => {
      req.params.employerId = "employerId";
      Job.find.mockResolvedValue([{ _id: "1" }]);
      await getJobsByEmployer(req, res, next);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });
  });
});
