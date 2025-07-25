import { jest } from '@jest/globals';
import { Types } from 'mongoose';
import {
  createJobPosting,
  viewJobList,
  viewJobDetail,
  updateJob,
  deleteJob,
  hideJob,
  updateJobStatus,
  getJobOverview,
  getJobsByRecruiter,
  getJobApplicants,
  updateApplicationStatus,
  trackJobView,
  getRecommendedJobs,
  getAIRecommendedJobs,
  getExpiredJobs,
  getRelatedJobs,
} from '../../controllers/job.controller.js';

// Mock all required models and services
jest.mock('../../models/job.model.js');
jest.mock('../../models/user.model.js');
jest.mock('../../models/application.model.js');
jest.mock('../../models/applicantProfile.model.js');
jest.mock('../../models/jobCategory.model.js');
jest.mock('../../services/chroma.service.js');
jest.mock('../../database/chromadb.js', () => ({
  isChromaConnected: false,
  chromaClient: null,
  embeddingFunction: null,
  connectToChromaDB: jest.fn()
}));
jest.mock('../../controllers/jobCategory.controller.js');

// Import mocked modules
import Job from '../../models/job.model.js';
import User from '../../models/user.model.js';
import Application from '../../models/application.model.js';
import ApplicantProfile from '../../models/applicantProfile.model.js';
import JobCategory from '../../models/jobCategory.model.js';
import { addOrUpdateJobInChroma, deleteJobFromChroma, queryJobsFromChroma } from '../../services/chroma.service.js';
import { jobCategoriesRecursiveRoutine } from '../../controllers/jobCategory.controller.js';

describe('Job Controller', () => {
  let req, res, next;

  beforeEach(() => {
    req = { 
      body: {}, 
      params: {}, 
      query: {},
      user: {
        _id: '507f1f77bcf86cd799439011',
        accountType: 'Nhà Tuyển Dụng'
      }
    };
    res = { 
      status: jest.fn().mockReturnThis(), 
      json: jest.fn(),
      on: jest.fn() // Mock for ChromaDB event listener
    };
    next = jest.fn();
    
    // Reset all mocks completely
    jest.clearAllMocks();
    
    // Ensure Job methods are properly mocked
    Job.find = jest.fn();
    Job.findById = jest.fn();
    Job.findByIdAndUpdate = jest.fn();
    Job.findByIdAndDelete = jest.fn();
    Job.countDocuments = jest.fn();
    // Remove Job.prototype.save since we'll mock Job constructor instead
    
    // Mock User methods
    User.findById = jest.fn();
    
    // Mock Application methods
    Application.find = jest.fn();
    Application.countDocuments = jest.fn();
  });

  describe('createJobPosting', () => {
    beforeEach(() => {
      req.body = {
        title: 'Software Engineer',
        description: 'A great software engineering position',
        requirements: 'Bachelor degree in Computer Science',
        salary: '20-30 triệu',
        deliveryTime: '3 months',
        priorityLevel: 'Nổi bật',
        quantity: 2,
        level: 'Nhân viên',
        industry: 'Technology',
        position: 'Developer',
        location: 'Ho Chi Minh City',
        experience: '2 năm',
        deadline: new Date('2025-12-31'),
        keywords: ['javascript', 'nodejs'],
        skillIds: ['507f1f77bcf86cd799439012', '507f1f77bcf86cd799439013'],
        categoryId: '507f1f77bcf86cd799439014'
      };
    });

    it('should create job posting successfully for recruiter', async () => {
      const mockEmployer = {
        _id: '507f1f77bcf86cd799439011',
        name: 'Tech Company'
      };

      // Mock the Job constructor and save method
      const mockJobInstance = {
        _id: '507f1f77bcf86cd799439015',
        employerId: '507f1f77bcf86cd799439011',
        title: 'Software Engineer',
        description: 'A great software engineering position',
        requirements: 'Bachelor degree in Computer Science',
        salary: '20-30 triệu',
        deliveryTime: '3 months',
        priorityLevel: 'Nổi bật',
        quantity: 2,
        level: 'Nhân viên',
        industry: 'Technology',
        position: 'Developer',
        location: 'Ho Chi Minh City',
        experience: '2 năm',
        deadline: new Date('2025-12-31'),
        keywords: ['javascript', 'nodejs'],
        skillIds: ['507f1f77bcf86cd799439012', '507f1f77bcf86cd799439013'],
        categoryId: '507f1f77bcf86cd799439014',
        status: 'active',
        createdAt: new Date(),
        save: jest.fn().mockResolvedValue()
      };

      // Mock Job constructor to return our mock instance
      Job.mockImplementation(() => mockJobInstance);

      User.findById = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(mockEmployer)
      });

      await createJobPosting(req, res, next);

      expect(mockJobInstance.save).toHaveBeenCalled();
      expect(User.findById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Job posted successfully',
        data: {
          id: mockJobInstance._id,
          employerName: mockEmployer.name,
          title: mockJobInstance.title,
          description: mockJobInstance.description,
          requirements: mockJobInstance.requirements,
          salary: mockJobInstance.salary,
          deliveryTime: mockJobInstance.deliveryTime,
          priorityLevel: mockJobInstance.priorityLevel,
          quantity: mockJobInstance.quantity,
          level: mockJobInstance.level,
          industry: mockJobInstance.industry,
          position: mockJobInstance.position,
          location: mockJobInstance.location,
          experience: mockJobInstance.experience,
          deadline: mockJobInstance.deadline,
          status: mockJobInstance.status,
          createdAt: mockJobInstance.createdAt
        }
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject non-recruiter users', async () => {
      req.user.accountType = 'Ứng Viên';

      await createJobPosting(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Only recruiters can create job posts'
      });
      expect(Job).not.toHaveBeenCalled(); // Job constructor should not be called
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle errors during job creation', async () => {
      const error = new Error('Database error');
      
      const mockJobInstance = {
        save: jest.fn().mockRejectedValue(error)
      };

      Job.mockImplementation(() => mockJobInstance);

      await createJobPosting(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe('viewJobList', () => {
    it('should return job list with pagination', async () => {
      const mockJobs = [
        {
          _id: '507f1f77bcf86cd799439015',
          employerId: '507f1f77bcf86cd799439011',
          title: 'Software Engineer',
          description: 'A great position',
          requirements: 'Bachelor degree',
          salary: '20-30 triệu',
          deliveryTime: '3 months',
          priorityLevel: 'Nổi bật',
          createdAt: new Date(),
          location: 'Ho Chi Minh City',
          experience: '2 năm',
          industry: 'Technology',
          position: 'Developer',
          level: 'Nhân viên',
          views: 10,
          status: 'active'
        }
      ];

      const mockEmployer = {
        _id: '507f1f77bcf86cd799439011',
        name: 'Tech Company'
      };

      Job.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue(mockJobs)
          })
        })
      });

      Job.countDocuments = jest.fn().mockResolvedValue(1);

      // Mock User.findById to return the employer
      User.findById = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(mockEmployer)
      });

      req.query = { page: 1, limit: 10 };

      await viewJobList(req, res, next);

      expect(Job.find).toHaveBeenCalledWith({
        $and: [
          expect.objectContaining({
            isHidden: false,
            status: 'active'
          }),
          {}
        ]
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Job list fetched successfully',
        data: expect.arrayContaining([
          expect.objectContaining({
            id: mockJobs[0]._id,
            employerName: mockEmployer.name,
            title: mockJobs[0].title
          })
        ]),
        pagination: expect.objectContaining({
          currentPage: 1,
          totalPages: 1,
          totalJobs: 1,
          hasNextPage: false,
          hasPrevPage: false
        })
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle location filter', async () => {
      Job.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([])
          })
        })
      });

      Job.countDocuments = jest.fn().mockResolvedValue(0);

      req.query = { location: 'Hanoi', page: 1, limit: 10 };

      await viewJobList(req, res, next);

      expect(Job.find).toHaveBeenCalledWith({
        $and: [
          expect.objectContaining({
            isHidden: false,
            status: 'active',
            location: { $regex: 'Hanoi', $options: 'i' }
          }),
          {}
        ]
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle errors during job list fetch', async () => {
      const error = new Error('Database error');
      Job.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockRejectedValue(error)
          })
        })
      });

      await viewJobList(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe('viewJobDetail', () => {
    it('should return job detail successfully', async () => {
      const mockJob = {
        _id: '507f1f77bcf86cd799439015',
        employerId: '507f1f77bcf86cd799439011',
        title: 'Software Engineer',
        description: 'A great position',
        requirements: 'Bachelor degree',
        experience: '2 năm',
        salary: '20-30 triệu',
        deliveryTime: '3 months',
        priorityLevel: 'Nổi bật',
        createdAt: new Date(),
        deadline: new Date('2025-12-31'),
        quantity: 2,
        level: 'Nhân viên',
        industry: 'Technology',
        position: 'Developer',
        location: 'Ho Chi Minh City',
        keywords: ['javascript', 'nodejs'],
        categoryId: { _id: '507f1f77bcf86cd799439014', name: 'IT' },
        skillIds: [{ _id: '507f1f77bcf86cd799439012', name: 'JavaScript' }],
        views: 10,
        status: 'active',
        isHidden: false
      };

      const mockEmployer = {
        _id: '507f1f77bcf86cd799439011',
        name: 'Tech Company'
      };

      Job.findByIdAndUpdate = jest.fn().mockResolvedValue(mockJob);
      Job.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(mockJob)
        })
      });
      User.findById = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(mockEmployer)
      });

      req.params.id = '507f1f77bcf86cd799439015';

      await viewJobDetail(req, res, next);

      expect(Job.findByIdAndUpdate).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439015',
        { $inc: { views: 1 } }
      );
      expect(Job.findById).toHaveBeenCalledWith('507f1f77bcf86cd799439015');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Job detail fetched successfully',
        data: expect.objectContaining({
          id: mockJob._id,
          employerName: mockEmployer.name,
          employerId: mockJob.employerId,
          title: mockJob.title,
          description: mockJob.description
        })
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 404 when job not found', async () => {
      Job.findByIdAndUpdate = jest.fn().mockResolvedValue(null);
      Job.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(null)
        })
      });

      req.params.id = '507f1f77bcf86cd799439015';

      await viewJobDetail(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Job not found'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 404 when job is hidden', async () => {
      const mockJob = {
        _id: '507f1f77bcf86cd799439015',
        isHidden: true
      };

      Job.findByIdAndUpdate = jest.fn().mockResolvedValue(mockJob);
      Job.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(mockJob)
        })
      });

      req.params.id = '507f1f77bcf86cd799439015';

      await viewJobDetail(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Job not found'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle errors during job detail fetch', async () => {
      const error = new Error('Database error');
      Job.findByIdAndUpdate = jest.fn().mockRejectedValue(error);

      req.params.id = '507f1f77bcf86cd799439015';

      await viewJobDetail(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe('updateJob', () => {
    beforeEach(() => {
      req.params.id = '507f1f77bcf86cd799439015';
      req.body = {
        title: 'Updated Software Engineer',
        description: 'Updated description',
        requirements: 'Updated requirements'
      };
    });

    it('should update job successfully when user is owner', async () => {
      const mockJob = {
        _id: '507f1f77bcf86cd799439015',
        employerId: '507f1f77bcf86cd799439011',
        title: 'Software Engineer',
        description: 'Original description',
        requirements: 'Original requirements',
        save: jest.fn().mockResolvedValue({
          _id: '507f1f77bcf86cd799439015',
          title: 'Updated Software Engineer',
          description: 'Updated description',
          requirements: 'Updated requirements'
        })
      };

      Job.findById = jest.fn().mockResolvedValue(mockJob);

      await updateJob(req, res, next);

      expect(Job.findById).toHaveBeenCalledWith('507f1f77bcf86cd799439015');
      expect(mockJob.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Job updated successfully',
        data: expect.objectContaining({
          _id: '507f1f77bcf86cd799439015',
          title: 'Updated Software Engineer'
        })
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 404 when job not found', async () => {
      Job.findById = jest.fn().mockResolvedValue(null);

      await updateJob(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Job not found'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 403 when user is not owner', async () => {
      const mockJob = {
        _id: '507f1f77bcf86cd799439015',
        employerId: '507f1f77bcf86cd799439999' // Different user ID
      };

      Job.findById = jest.fn().mockResolvedValue(mockJob);

      await updateJob(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'You can only update your own job posts'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle errors during job update', async () => {
      const error = new Error('Database error');
      Job.findById = jest.fn().mockRejectedValue(error);

      await updateJob(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe('deleteJob', () => {
    beforeEach(() => {
      req.params.id = '507f1f77bcf86cd799439015';
    });

    it('should delete job successfully when user is owner', async () => {
      const mockJob = {
        _id: '507f1f77bcf86cd799439015',
        employerId: '507f1f77bcf86cd799439011'
      };

      Job.findById = jest.fn().mockResolvedValue(mockJob);
      Job.findByIdAndDelete = jest.fn().mockResolvedValue(mockJob);

      await deleteJob(req, res, next);

      expect(Job.findById).toHaveBeenCalledWith('507f1f77bcf86cd799439015');
      expect(Job.findByIdAndDelete).toHaveBeenCalledWith('507f1f77bcf86cd799439015');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Job deleted successfully'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 404 when job not found', async () => {
      Job.findById = jest.fn().mockResolvedValue(null);

      await deleteJob(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Job not found'
      });
      expect(Job.findByIdAndDelete).not.toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 403 when user is not owner', async () => {
      const mockJob = {
        _id: '507f1f77bcf86cd799439015',
        employerId: '507f1f77bcf86cd799439999' // Different user ID
      };

      Job.findById = jest.fn().mockResolvedValue(mockJob);

      await deleteJob(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'You can only delete your own job posts'
      });
      expect(Job.findByIdAndDelete).not.toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle errors during job deletion', async () => {
      const error = new Error('Database error');
      Job.findById = jest.fn().mockRejectedValue(error);

      await deleteJob(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe('hideJob', () => {
    beforeEach(() => {
      req.params.id = '507f1f77bcf86cd799439015';
    });

    it('should toggle job visibility successfully when user is owner', async () => {
      const mockJob = {
        _id: '507f1f77bcf86cd799439015',
        employerId: '507f1f77bcf86cd799439011',
        isHidden: false,
        save: jest.fn().mockResolvedValue({
          _id: '507f1f77bcf86cd799439015',
          isHidden: true
        })
      };

      Job.findById = jest.fn().mockResolvedValue(mockJob);

      await hideJob(req, res, next);

      expect(Job.findById).toHaveBeenCalledWith('507f1f77bcf86cd799439015');
      expect(mockJob.isHidden).toBe(true);
      expect(mockJob.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Job hidden successfully',
        data: {
          id: mockJob._id,
          isHidden: true
        }
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 404 when job not found', async () => {
      Job.findById = jest.fn().mockResolvedValue(null);

      await hideJob(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Job not found'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 403 when user is not owner', async () => {
      const mockJob = {
        _id: '507f1f77bcf86cd799439015',
        employerId: '507f1f77bcf86cd799439999' // Different user ID
      };

      Job.findById = jest.fn().mockResolvedValue(mockJob);

      await hideJob(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'You can only hide your own job posts'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle errors during job hide operation', async () => {
      const error = new Error('Database error');
      Job.findById = jest.fn().mockRejectedValue(error);

      await hideJob(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe('trackJobView', () => {
    it('should increment job view count successfully', async () => {
      req.params.id = '507f1f77bcf86cd799439015';
      
      const mockUpdatedJob = {
        _id: '507f1f77bcf86cd799439015',
        views: 11
      };

      Job.findByIdAndUpdate = jest.fn().mockResolvedValue(mockUpdatedJob);

      await trackJobView(req, res, next);

      expect(Job.findByIdAndUpdate).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439015',
        { $inc: { views: 1 } },
        { new: true }
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Job view tracked successfully',
        data: { 
          id: mockUpdatedJob._id,
          views: mockUpdatedJob.views 
        }
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 404 when job not found', async () => {
      req.params.id = '507f1f77bcf86cd799439015';
      Job.findByIdAndUpdate = jest.fn().mockResolvedValue(null);

      await trackJobView(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Job not found'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle errors during view tracking', async () => {
      const error = new Error('Database error');
      req.params.id = '507f1f77bcf86cd799439015';
      Job.findByIdAndUpdate = jest.fn().mockRejectedValue(error);

      await trackJobView(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });
});
