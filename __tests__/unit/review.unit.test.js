import {
  reviewCandidate,
  viewUserReviews
} from "../../controllers/review.controller.js";
import Review from "../../models/review.model.js";
import Application from "../../models/application.model.js";

jest.mock("../../models/review.model.js");
jest.mock("../../models/application.model.js");

describe("Review Controller", () => {
  let req, res, next;

  beforeEach(() => {
    req = { 
      body: {}, 
      params: {}, 
      query: {},
      user: { _id: "reviewer123" }
    };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
    
    // Reset all mocks completely
    jest.clearAllMocks();
    
    // Ensure Review methods are properly mocked
    Review.create = jest.fn();
    Review.find = jest.fn();
    Application.findOneAndUpdate = jest.fn();
  });

  describe("reviewCandidate", () => {
    it("should create review successfully with jobId", async () => {
      const mockReview = {
        _id: "review1",
        reviewerId: "reviewer123",
        reviewedUserId: "candidate456",
        rating: 5,
        comment: "Excellent candidate",
        createdAt: new Date()
      };

      Review.create = jest.fn().mockResolvedValue(mockReview);
      Application.findOneAndUpdate = jest.fn().mockResolvedValue({});

      req.params = { reviewUserId: "candidate456" };
      req.body = { 
        rating: 5, 
        comment: "Excellent candidate", 
        jobId: "job789" 
      };

      await reviewCandidate(req, res);

      expect(Review.create).toHaveBeenCalledWith({
        reviewerId: "reviewer123",
        reviewedUserId: "candidate456",
        rating: 5,
        comment: "Excellent candidate"
      });
      
      expect(Application.findOneAndUpdate).toHaveBeenCalledWith(
        { applicantId: "candidate456", jobId: "job789" },
        { reviewedByEmployer: true }
      );

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: "Review thành công.",
        review: mockReview
      });
    });

    it("should create review successfully without jobId", async () => {
      const mockReview = {
        _id: "review2",
        reviewerId: "reviewer123",
        reviewedUserId: "candidate456",
        rating: 4,
        comment: "Good candidate",
        createdAt: new Date()
      };

      Review.create = jest.fn().mockResolvedValue(mockReview);

      req.params = { reviewUserId: "candidate456" };
      req.body = { 
        rating: 4, 
        comment: "Good candidate"
        // No jobId provided
      };

      await reviewCandidate(req, res);

      expect(Review.create).toHaveBeenCalledWith({
        reviewerId: "reviewer123",
        reviewedUserId: "candidate456",
        rating: 4,
        comment: "Good candidate"
      });
      
      expect(Application.findOneAndUpdate).not.toHaveBeenCalled();

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: "Review thành công.",
        review: mockReview
      });
    });

    it("should return 400 when trying to review oneself", async () => {
      req.params = { reviewUserId: "reviewer123" }; // Same as req.user._id
      req.body = { 
        rating: 5, 
        comment: "Self review attempt" 
      };

      await reviewCandidate(req, res);

      expect(Review.create).not.toHaveBeenCalled();
      expect(Application.findOneAndUpdate).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "Không thể tự review chính mình."
      });
    });

    it("should handle Review.create database errors", async () => {
      const error = new Error("Database connection error");
      Review.create = jest.fn().mockRejectedValue(error);

      req.params = { reviewUserId: "candidate456" };
      req.body = { 
        rating: 5, 
        comment: "Test review" 
      };

      await reviewCandidate(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "Lỗi server khi tạo review.",
        error: error.message
      });
    });

    it("should handle Application.findOneAndUpdate errors but still create review", async () => {
      const mockReview = {
        _id: "review3",
        reviewerId: "reviewer123",
        reviewedUserId: "candidate456",
        rating: 3,
        comment: "Average candidate",
        createdAt: new Date()
      };

      Review.create = jest.fn().mockResolvedValue(mockReview);
      Application.findOneAndUpdate = jest.fn().mockRejectedValue(new Error("Application update failed"));

      req.params = { reviewUserId: "candidate456" };
      req.body = { 
        rating: 3, 
        comment: "Average candidate",
        jobId: "job789"
      };

      await reviewCandidate(req, res);

      expect(Review.create).toHaveBeenCalled();
      expect(Application.findOneAndUpdate).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "Lỗi server khi tạo review.",
        error: "Application update failed"
      });
    });

    it("should create review with minimum rating", async () => {
      const mockReview = {
        _id: "review4",
        reviewerId: "reviewer123",
        reviewedUserId: "candidate456",
        rating: 1,
        comment: "Poor performance",
        createdAt: new Date()
      };

      Review.create = jest.fn().mockResolvedValue(mockReview);

      req.params = { reviewUserId: "candidate456" };
      req.body = { 
        rating: 1, 
        comment: "Poor performance" 
      };

      await reviewCandidate(req, res);

      expect(Review.create).toHaveBeenCalledWith({
        reviewerId: "reviewer123",
        reviewedUserId: "candidate456",
        rating: 1,
        comment: "Poor performance"
      });

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: "Review thành công.",
        review: mockReview
      });
    });

    it("should create review without comment", async () => {
      const mockReview = {
        _id: "review5",
        reviewerId: "reviewer123",
        reviewedUserId: "candidate456",
        rating: 4,
        comment: undefined,
        createdAt: new Date()
      };

      Review.create = jest.fn().mockResolvedValue(mockReview);

      req.params = { reviewUserId: "candidate456" };
      req.body = { 
        rating: 4
        // No comment provided
      };

      await reviewCandidate(req, res);

      expect(Review.create).toHaveBeenCalledWith({
        reviewerId: "reviewer123",
        reviewedUserId: "candidate456",
        rating: 4,
        comment: undefined
      });

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: "Review thành công.",
        review: mockReview
      });
    });
  });

  describe("viewUserReviews", () => {
    it("should return user reviews successfully", async () => {
      const mockReviews = [
        {
          _id: "review1",
          reviewerId: { _id: "reviewer1", name: "John Doe" },
          reviewedUserId: "user123",
          rating: 5,
          comment: "Excellent work",
          createdAt: new Date("2023-12-01")
        },
        {
          _id: "review2",
          reviewerId: { _id: "reviewer2", name: "Jane Smith" },
          reviewedUserId: "user123",
          rating: 4,
          comment: "Good performance",
          createdAt: new Date("2023-11-01")
        }
      ];

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(mockReviews)
      };

      Review.find = jest.fn().mockReturnValue(mockQuery);

      req.params = { userId: "user123" };

      await viewUserReviews(req, res);

      expect(Review.find).toHaveBeenCalledWith({ reviewedUserId: "user123" });
      expect(mockQuery.populate).toHaveBeenCalledWith("reviewerId", "name");
      expect(mockQuery.sort).toHaveBeenCalledWith({ createdAt: -1 });

      const expectedResult = [
        {
          reviewer: { _id: "reviewer1", name: "John Doe" },
          rating: 5,
          comment: "Excellent work",
          createdAt: new Date("2023-12-01")
        },
        {
          reviewer: { _id: "reviewer2", name: "Jane Smith" },
          rating: 4,
          comment: "Good performance",
          createdAt: new Date("2023-11-01")
        }
      ];

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expectedResult);
    });

    it("should return empty array when no reviews found", async () => {
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue([])
      };

      Review.find = jest.fn().mockReturnValue(mockQuery);

      req.params = { userId: "user456" };

      await viewUserReviews(req, res);

      expect(Review.find).toHaveBeenCalledWith({ reviewedUserId: "user456" });
      expect(mockQuery.populate).toHaveBeenCalledWith("reviewerId", "name");
      expect(mockQuery.sort).toHaveBeenCalledWith({ createdAt: -1 });

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([]);
    });

    it("should handle database errors", async () => {
      const error = new Error("Database connection failed");
      
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockRejectedValue(error)
      };

      Review.find = jest.fn().mockReturnValue(mockQuery);

      req.params = { userId: "user123" };

      await viewUserReviews(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "Không thể lấy danh sách review.",
        error: error.message
      });
    });

    it("should handle populate errors", async () => {
      const error = new Error("Population failed");
      
      const mockQuery = {
        populate: jest.fn().mockImplementation(() => {
          throw error;
        }),
        sort: jest.fn()
      };

      Review.find = jest.fn().mockReturnValue(mockQuery);

      req.params = { userId: "user123" };

      await viewUserReviews(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "Không thể lấy danh sách review.",
        error: error.message
      });
    });

    it("should return single review correctly", async () => {
      const mockReviews = [
        {
          _id: "review1",
          reviewerId: { _id: "reviewer1", name: "Single Reviewer" },
          reviewedUserId: "user789",
          rating: 3,
          comment: "Average performance",
          createdAt: new Date("2023-10-15")
        }
      ];

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(mockReviews)
      };

      Review.find = jest.fn().mockReturnValue(mockQuery);

      req.params = { userId: "user789" };

      await viewUserReviews(req, res);

      const expectedResult = [
        {
          reviewer: { _id: "reviewer1", name: "Single Reviewer" },
          rating: 3,
          comment: "Average performance",
          createdAt: new Date("2023-10-15")
        }
      ];

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expectedResult);
    });

    it("should handle reviews with null comments", async () => {
      const mockReviews = [
        {
          _id: "review1",
          reviewerId: { _id: "reviewer1", name: "No Comment Reviewer" },
          reviewedUserId: "user999",
          rating: 4,
          comment: null,
          createdAt: new Date("2023-09-01")
        }
      ];

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(mockReviews)
      };

      Review.find = jest.fn().mockReturnValue(mockQuery);

      req.params = { userId: "user999" };

      await viewUserReviews(req, res);

      const expectedResult = [
        {
          reviewer: { _id: "reviewer1", name: "No Comment Reviewer" },
          rating: 4,
          comment: null,
          createdAt: new Date("2023-09-01")
        }
      ];

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expectedResult);
    });
  });
});
