import {
  getJobSkills,
  createJobSkill,
  getJobSkillsByIds
} from "../../controllers/jobSkill.controller.js";
import JobSkill from "../../models/jobSkill.model.js";

jest.mock("../../models/jobSkill.model.js");

describe("JobSkill Controller", () => {
  let req, res, next;

  beforeEach(() => {
    req = { body: {}, params: {}, query: {} };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
    
    // Reset all mocks completely
    jest.clearAllMocks();
    
    // Ensure JobSkill methods are properly mocked
    JobSkill.find = jest.fn();
    JobSkill.countDocuments = jest.fn();
    JobSkill.prototype.save = jest.fn();
  });

  describe("getJobSkills", () => {
    it("should return skills with pagination successfully", async () => {
      const mockSkills = [
        { _id: "skill1", name: "JavaScript", description: "Programming language" },
        { _id: "skill2", name: "React", description: "Frontend framework" }
      ];

      // Mock the find chain
      JobSkill.find = jest.fn()
        .mockReturnValueOnce({
          sort: jest.fn().mockReturnValue({
            skip: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue(mockSkills)
            })
          })
        })
        .mockReturnValueOnce({
          sort: jest.fn().mockReturnValue({
            skip: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue(mockSkills)
            })
          })
        });

      JobSkill.countDocuments = jest.fn().mockResolvedValue(2);

      req.query = { page: 1, limit: 10 };

      await getJobSkills(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Fetched 2 skills successfully",
        data: mockSkills,
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

    it("should return skills with name filtering", async () => {
      const mockSkills = [
        { _id: "skill1", name: "JavaScript", description: "Programming language" }
      ];

      JobSkill.find = jest.fn()
        .mockReturnValueOnce({
          sort: jest.fn().mockReturnValue({
            skip: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue(mockSkills)
            })
          })
        })
        .mockReturnValueOnce({
          sort: jest.fn().mockReturnValue({
            skip: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue(mockSkills)
            })
          })
        });

      JobSkill.countDocuments = jest.fn().mockResolvedValue(1);

      req.query = { name: "Java", page: 1, limit: 10 };

      await getJobSkills(req, res, next);

      expect(JobSkill.find).toHaveBeenCalledWith({
        name: { $regex: "Java", $options: "i" }
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Fetched 1 skills successfully",
        data: mockSkills,
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalItems: 1,
          hasNextPage: false,
          hasPrevPage: false
        }
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should return empty array when no skills found", async () => {
      JobSkill.find = jest.fn()
        .mockReturnValueOnce({
          sort: jest.fn().mockReturnValue({
            skip: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([])
            })
          })
        })
        .mockReturnValueOnce({
          sort: jest.fn().mockReturnValue({
            skip: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([])
            })
          })
        });

      JobSkill.countDocuments = jest.fn().mockResolvedValue(0);

      req.query = { page: 1, limit: 10 };

      await getJobSkills(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Fetched 0 skills successfully",
        data: [],
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalItems: 0,
          hasNextPage: false,
          hasPrevPage: false
        }
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should handle pagination with multiple pages", async () => {
      const mockSkills = [
        { _id: "skill1", name: "JavaScript", description: "Programming language" }
      ];

      JobSkill.find = jest.fn()
        .mockReturnValueOnce({
          sort: jest.fn().mockReturnValue({
            skip: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue(mockSkills)
            })
          })
        })
        .mockReturnValueOnce({
          sort: jest.fn().mockReturnValue({
            skip: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue(mockSkills)
            })
          })
        });

      JobSkill.countDocuments = jest.fn().mockResolvedValue(25);

      req.query = { page: 2, limit: 10 };

      await getJobSkills(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Fetched 1 skills successfully",
        data: mockSkills,
        pagination: {
          currentPage: 2,
          totalPages: 3,
          totalItems: 25,
          hasNextPage: true,
          hasPrevPage: true
        }
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should handle errors", async () => {
      const error = new Error("Database error");
      JobSkill.find = jest.fn().mockImplementation(() => {
        throw error;
      });

      req.query = { page: 1, limit: 10 };

      await getJobSkills(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("createJobSkill", () => {
    it("should create new job skill successfully", async () => {
      const mockSavedSkill = {
        _id: "skill1",
        name: "JavaScript",
        description: "Programming language",
        createdAt: new Date(),
        updatedAt: new Date()
      };

      JobSkill.prototype.save = jest.fn().mockResolvedValue(mockSavedSkill);

      req.body = {
        name: "JavaScript",
        description: "Programming language"
      };

      await createJobSkill(req, res, next);

      expect(JobSkill.prototype.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Job skill created successfully",
        data: mockSavedSkill
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should create new job skill without description", async () => {
      const mockSavedSkill = {
        _id: "skill1",
        name: "React",
        description: undefined,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      JobSkill.prototype.save = jest.fn().mockResolvedValue(mockSavedSkill);

      req.body = {
        name: "React"
      };

      await createJobSkill(req, res, next);

      expect(JobSkill.prototype.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Job skill created successfully",
        data: mockSavedSkill
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should handle validation errors", async () => {
      const error = new Error("Validation failed: name is required");
      JobSkill.prototype.save = jest.fn().mockRejectedValue(error);

      req.body = {
        description: "Programming language"
        // Missing required name field
      };

      await createJobSkill(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    it("should handle duplicate name errors", async () => {
      const error = new Error("Duplicate key error");
      JobSkill.prototype.save = jest.fn().mockRejectedValue(error);

      req.body = {
        name: "JavaScript",
        description: "Programming language"
      };

      await createJobSkill(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("getJobSkillsByIds", () => {
    it("should return skills by valid IDs array", async () => {
      const mockSkills = [
        { _id: "skill1", name: "JavaScript", description: "Programming language" },
        { _id: "skill2", name: "React", description: "Frontend framework" }
      ];

      JobSkill.find = jest.fn().mockResolvedValue(mockSkills);

      req.body = {
        ids: ["skill1", "skill2"]
      };

      await getJobSkillsByIds(req, res, next);

      expect(JobSkill.find).toHaveBeenCalledWith({
        _id: { $in: ["skill1", "skill2"] }
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Fetched 2 skills successfully",
        data: mockSkills
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should return empty array when no skills found by IDs", async () => {
      JobSkill.find = jest.fn().mockResolvedValue([]);

      req.body = {
        ids: ["nonexistent1", "nonexistent2"]
      };

      await getJobSkillsByIds(req, res, next);

      expect(JobSkill.find).toHaveBeenCalledWith({
        _id: { $in: ["nonexistent1", "nonexistent2"] }
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Fetched 0 skills successfully",
        data: []
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should return 400 when ids is not provided", async () => {
      req.body = {};

      await getJobSkillsByIds(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Skill IDs must be an array"
      });
      expect(JobSkill.find).not.toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it("should return 400 when ids is not an array", async () => {
      req.body = {
        ids: "skill1"
      };

      await getJobSkillsByIds(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Skill IDs must be an array"
      });
      expect(JobSkill.find).not.toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it("should return 400 when ids is null", async () => {
      req.body = {
        ids: null
      };

      await getJobSkillsByIds(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Skill IDs must be an array"
      });
      expect(JobSkill.find).not.toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it("should handle database errors", async () => {
      const error = new Error("Database connection error");
      JobSkill.find = jest.fn().mockRejectedValue(error);

      req.body = {
        ids: ["skill1", "skill2"]
      };

      await getJobSkillsByIds(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });
});
