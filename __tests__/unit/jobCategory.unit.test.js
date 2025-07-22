import { Types } from "mongoose";
import {
  getJobCategoriesByParent,
  getJobCategoriesRecursive,
  createJobCategory
} from "../../controllers/jobCategory.controller.js";
import JobCategory from "../../models/jobCategory.model.js";

jest.mock("../../models/jobCategory.model.js");

describe("JobCategory Controller", () => {
  let req, res, next;

  beforeEach(() => {
    req = { body: {}, params: {}, query: {} };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
    
    // Reset all mocks completely
    jest.clearAllMocks();
    
    // Ensure JobCategory methods are properly mocked
    JobCategory.find = jest.fn();
    JobCategory.findById = jest.fn();
    JobCategory.prototype.save = jest.fn();
  });

  describe("getJobCategoriesByParent", () => {
    it("should return categories with valid ObjectId parentId", async () => {
      const mockCategories = [
        { _id: "507f1f77bcf86cd799439011", name: "Category 1", parentId: "507f1f77bcf86cd799439012" },
        { _id: "507f1f77bcf86cd799439013", name: "Category 2", parentId: "507f1f77bcf86cd799439012" }
      ];

      // Setup proper mock chain
      JobCategory.find = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(mockCategories)
      });

      req.params.parentId = "507f1f77bcf86cd799439012";

      await getJobCategoriesByParent(req, res, next);

      expect(JobCategory.find).toHaveBeenCalledWith({
        parentId: Types.ObjectId.createFromHexString("507f1f77bcf86cd799439012")
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Fetched 2 job category/categories successfully",
        data: mockCategories
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should return root categories with null parentId when parentId is invalid", async () => {
      const mockCategories = [
        { _id: "507f1f77bcf86cd799439011", name: "Root Category 1", parentId: null },
        { _id: "507f1f77bcf86cd799439013", name: "Root Category 2", parentId: null }
      ];

      JobCategory.find = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(mockCategories)
      });

      req.params.parentId = "invalid-id";

      await getJobCategoriesByParent(req, res, next);

      expect(JobCategory.find).toHaveBeenCalledWith({ parentId: null });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Fetched 2 job category/categories successfully",
        data: mockCategories
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should return empty array when no categories found", async () => {
      JobCategory.find = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue([])
      });

      req.params.parentId = "507f1f77bcf86cd799439012";

      await getJobCategoriesByParent(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Fetched 0 job category/categories successfully",
        data: []
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should handle errors", async () => {
      const error = new Error("Database error");
      JobCategory.find = jest.fn().mockReturnValue({
        select: jest.fn().mockRejectedValue(error)
      });

      req.params.parentId = "507f1f77bcf86cd799439012";

      await getJobCategoriesByParent(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("getJobCategoriesRecursive", () => {
    it("should return recursive category tree successfully", async () => {
      // Mock the recursive function by mocking database calls
      const mockParentCategory = {
        _id: "507f1f77bcf86cd799439012",
        name: "Parent Category",
        parentId: null
      };

      const mockChildCategory = {
        _id: "507f1f77bcf86cd799439013",
        name: "Child Category",
        parentId: "507f1f77bcf86cd799439012"
      };

      // Setup sequential mocks for findById calls (parent then child)
      JobCategory.findById
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(mockParentCategory)
          })
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(mockChildCategory)
          })
        });

      // Setup sequential mocks for find calls (parent children then child children)
      JobCategory.find
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([mockChildCategory])
          })
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([]) // No children for child category
          })
        });

      req.params.categoryId = "507f1f77bcf86cd799439012";

      await getJobCategoriesRecursive(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Fetched job category/categories recursively successfully",
        data: expect.objectContaining({
          _id: "507f1f77bcf86cd799439012",
          name: "Parent Category",
          parentId: null,
          children: expect.any(Array)
        })
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should handle invalid categoryId", async () => {
      // Mock để tránh lỗi từ Types.ObjectId.createFromHexString với invalid ID
      const originalCreateFromHexString = Types.ObjectId.createFromHexString;
      Types.ObjectId.createFromHexString = jest.fn().mockImplementation(() => {
        throw new Error("Invalid ObjectId");
      });

      req.params.categoryId = "invalid-id";

      await getJobCategoriesRecursive(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();

      // Restore original function
      Types.ObjectId.createFromHexString = originalCreateFromHexString;
    });

    it("should handle errors from recursive routine", async () => {
      const error = new Error("Database error");
      
      // Mock JobCategory.findById to throw error when called by jobCategoriesRecursiveRoutine
      JobCategory.findById = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockRejectedValue(error)
        })
      });

      req.params.categoryId = "507f1f77bcf86cd799439012";

      await getJobCategoriesRecursive(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    it("should handle when category not found", async () => {
      // Mock findById to return null (category not found)
      JobCategory.findById = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(null)
        })
      });

      req.params.categoryId = "507f1f77bcf86cd799439012";

      await getJobCategoriesRecursive(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Fetched job category/categories recursively successfully",
        data: null
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe("createJobCategory", () => {
    it("should create new job category successfully with parentId", async () => {
      const mockSavedCategory = {
        _id: "507f1f77bcf86cd799439012",
        name: "New Category",
        parentId: "507f1f77bcf86cd799439011",
        createdAt: new Date(),
        updatedAt: new Date()
      };

      JobCategory.prototype.save = jest.fn().mockResolvedValue(mockSavedCategory);

      req.body = {
        name: "New Category",
        parentId: "507f1f77bcf86cd799439011"
      };

      await createJobCategory(req, res, next);

      expect(JobCategory.prototype.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Job category created successfully",
        data: mockSavedCategory
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should create new job category successfully without parentId", async () => {
      const mockSavedCategory = {
        _id: "507f1f77bcf86cd799439012",
        name: "Root Category",
        parentId: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      JobCategory.prototype.save = jest.fn().mockResolvedValue(mockSavedCategory);

      req.body = {
        name: "Root Category"
      };

      await createJobCategory(req, res, next);

      expect(JobCategory.prototype.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Job category created successfully",
        data: mockSavedCategory
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should create new job category with null parentId when parentId is undefined", async () => {
      const mockSavedCategory = {
        _id: "507f1f77bcf86cd799439012",
        name: "Another Root Category",
        parentId: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      JobCategory.prototype.save = jest.fn().mockResolvedValue(mockSavedCategory);

      req.body = {
        name: "Another Root Category",
        parentId: undefined
      };

      await createJobCategory(req, res, next);

      expect(JobCategory.prototype.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Job category created successfully",
        data: mockSavedCategory
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should handle errors during creation", async () => {
      const error = new Error("Validation error");
      JobCategory.prototype.save = jest.fn().mockRejectedValue(error);

      req.body = {
        name: "Test Category"
      };

      await createJobCategory(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });
});
