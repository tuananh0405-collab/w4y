import Job, {
  experienceEnum,
  levelEnum,
  salaryRangeUnitEnum,
} from "../models/job.model.js";
import User from "../models/user.model.js"; // Đảm bảo bạn import User model
import Application from "../models/application.model.js";
import ApplicantProfile from "../models/applicantProfile.model.js";
import { body, param, validationResult } from "express-validator";
import JobCategory from "../models/jobCategory.model.js";
import { Types } from "mongoose";
import check from "check-types";
import { jobCategoriesRecursiveRoutine } from "./jobCategory.controller.js";

/**
 * POST /api/v1/job
 * Create a new job post
 * Allowed Roles: Recruiter (Nhà Tuyển Dụng)
 */
export const createJobPosting = async (req, res, next) => {
  try {
    // Check if user is a recruiter
    if (req.user.accountType !== "Nhà Tuyển Dụng") {
      return res.status(403).json({
        success: false,
        message: "Only recruiters can create job posts",
      });
    }

    // Use only validated and sanitized input
    const {
      title,
      description,
      requirements,
      salary,
      deliveryTime,
      priorityLevel,
      quantity,
      level,
      industry,
      position,
      location,
      experience,
      deadline,
      keywords,
      skills,
      categoryId,
    } = req.body;

    // Ensure all required text fields are trimmed and string
    const jobData = {
      employerId: req.user._id,
      title: typeof title === "string" ? title.trim() : "",
      description: typeof description === "string" ? description.trim() : "",
      requirements: typeof requirements === "string" ? requirements.trim() : "",
      salary: typeof salary === "string" ? salary.trim() : "",
      deliveryTime:
        typeof deliveryTime === "string" ? deliveryTime.trim() : deliveryTime,
      priorityLevel,
      quantity,
      level: typeof level === "string" ? level.trim() : level,
      industry: typeof industry === "string" ? industry.trim() : industry,
      position: typeof position === "string" ? position.trim() : position,
      location: typeof location === "string" ? location.trim() : location,
      experience:
        typeof experience === "string" ? experience.trim() : experience,
      deadline,
      keywords,
      skills,
      status: "active",
      categoryId: Types.ObjectId.createFromHexString(categoryId),
    };

    // Create new job
    const newJob = new Job(jobData);
    await newJob.save();

    // Get employer information
    const employer = await User.findById(req.user._id).select("name");

    res.status(201).json({
      success: true,
      message: "Job posted successfully",
      data: {
        id: newJob._id,
        employerName: employer.name,
        title: newJob.title,
        description: newJob.description,
        requirements: newJob.requirements,
        salary: newJob.salary,
        deliveryTime: newJob.deliveryTime,
        priorityLevel: newJob.priorityLevel,
        quantity: newJob.quantity,
        level: newJob.level,
        industry: newJob.industry,
        position: newJob.position,
        location: newJob.location,
        experience: newJob.experience,
        deadline: newJob.deadline,
        status: newJob.status,
        createdAt: newJob.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/job
 * Get a list of job posts with filtering
 * Allowed Roles: All
 */
export const viewJobList = async (req, res, next) => {
  try {
    const {
      location,
      position,
      keywords,
      skills,
      industry,
      categoryIds,
      level,
      experience,
      salaryRangeStart,
      salaryRangeEnd,
      salaryRangeUnit,
      status = "active", // Default to active jobs only
      page = 1,
      limit = 10,
    } = req.query;

    // Build filter object
    const filter = {
      isHidden: false, // Only show non-hidden jobs
      status: status,
    };

    // Add filters if provided
    if (location) filter.location = { $regex: location, $options: "i" };
    if (position) filter.position = { $regex: position, $options: "i" };
    if (industry) filter.industry = { $regex: industry, $options: "i" };
    if (categoryIds) {
      let categoryIdArray = [];
      if (Array.isArray(categoryIds)) {
        categoryIdArray = categoryIds;
      } else if (typeof categoryIds === "string") {
        // comma-separated or single value
        categoryIdArray = categoryIds.split(",").map((id) => id.trim());
      }

      const ids = categoryIdArray.filter((id) => Types.ObjectId.isValid(id));
      if (ids.length > 0) {
        filter.categoryId = { $in: ids };
      } else if (Types.ObjectId.isValid(industry)) {
        const categoryIdArray = await jobCategoriesRecursiveRoutine(industry);

        const ids = categoryIdArray.filter((id) => Types.ObjectId.isValid(id));
        if (ids.length > 0) {
          filter.categoryId = { $in: ids };
        }
      }
    }

    if (level) filter.level = level;
    if (experience) filter.experience = experience;
    /*
     * make experience field acts as a roof instead of exact value
      const idx = experienceEnum.indexOf(experience);
      if (idx !== -1) {
        filter.experience = { $in: experienceEnum.slice(0, idx + 1) };
      }
     */

    if (keywords) {
      filter.$text = { $search: keywords };
    }
    if (skills) {
      const skillsArray = skills.split(",").map((skill) => skill.trim());
      filter.skills = { $in: skillsArray };
    }

    const salaryRangeFilter = {};
    if (salaryRangeUnit) {
      if (salaryRangeStart || salaryRangeEnd) {
        salaryRangeFilter["$or"] = [
          {
            salaryRangeUnit: salaryRangeUnit,
            ...(salaryRangeStart
              ? { salaryRangeStart: { $gte: parseInt(salaryRangeStart) } }
              : {}),
            ...(salaryRangeEnd
              ? { salaryRangeEnd: { $gte: parseInt(salaryRangeEnd) } }
              : {}),
          },
          {
            $and: [
              { salaryRangeStart: { $exists: false } },
              { salaryRangeEnd: { $exists: false } },
            ],
          },
        ];
      }
    }

    // Pagination
    const skip = (page - 1) * limit;

    // Get jobs with pagination
    const jobs = await Job.find({ $and: [filter, salaryRangeFilter] })
      .sort({ createdAt: -1, priorityLevel: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const totalJobs = await Job.countDocuments({
      $and: [filter, salaryRangeFilter],
    });

    // Format jobs with employer information
    const formattedJobs = await Promise.all(
      jobs.map(async (job) => {
        const employer = await User.findById(job.employerId).select("name");
        return {
          id: job._id,
          employerName: employer?.name,
          title: job.title,
          description: job.description,
          requirements: job.requirements,
          salary: job.salary,
          deliveryTime: job.deliveryTime,
          priorityLevel: job.priorityLevel,
          createdAt: job.createdAt,
          location: job.location,
          experience: job.experience,
          industry: job.industry,
          position: job.position,
          level: job.level,
          views: job.views,
          status: job.status,
        };
      }),
    );

    res.status(200).json({
      success: true,
      message: "Job list fetched successfully",
      data: formattedJobs,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalJobs / limit),
        totalJobs,
        hasNextPage: page * limit < totalJobs,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/job/:id
 * Get detailed information about a specific job
 * Allowed Roles: All
 */
export const viewJobDetail = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Find job and increment view count
    const job = await Job.findByIdAndUpdate(
      id,
      { $inc: { views: 1 } },
      { new: true },
    );

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    // Check if job is hidden
    if (job.isHidden) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    const employer = await User.findById(job.employerId).select("name");

    res.status(200).json({
      success: true,
      message: "Job detail fetched successfully",
      data: {
        id: job._id,
        employerName: employer.name,
        employerId: job.employerId,
        title: job.title,
        description: job.description,
        requirements: job.requirements,
        experience: job.experience,
        salary: job.salary,
        deliveryTime: job.deliveryTime,
        priorityLevel: job.priorityLevel,
        createdAt: job.createdAt,
        deadline: job.deadline,
        quantity: job.quantity,
        level: job.level,
        industry: job.industry,
        position: job.position,
        location: job.location,
        keywords: job.keywords,
        skills: job.skills,
        views: job.views,
        status: job.status,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/v1/job/:id
 * Update an existing job post
 * Allowed Roles: Recruiter (owner of the job)
 */
export const updateJob = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      requirements,
      salary,
      deliveryTime,
      priorityLevel,
      quantity,
      level,
      industry,
      position,
      location,
      experience,
      deadline,
      keywords,
      skills,
    } = req.body;

    // Find job
    const job = await Job.findById(id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    // Check if user is the owner of the job
    if (job.employerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only update your own job posts",
      });
    }

    // Update job fields with trimmed and sanitized text
    if (typeof title === "string") job.title = title.trim();
    if (typeof description === "string") job.description = description.trim();
    if (typeof requirements === "string")
      job.requirements = requirements.trim();
    if (typeof salary === "string") job.salary = salary.trim();
    if (typeof deliveryTime === "string")
      job.deliveryTime = deliveryTime.trim();
    if (priorityLevel !== undefined) job.priorityLevel = priorityLevel;
    if (quantity !== undefined) job.quantity = quantity;
    if (typeof level === "string") job.level = level.trim();
    if (typeof industry === "string") job.industry = industry.trim();
    if (typeof position === "string") job.position = position.trim();
    if (typeof location === "string") job.location = location.trim();
    if (typeof experience === "string") job.experience = experience.trim();
    if (deadline !== undefined) job.deadline = deadline;
    if (keywords !== undefined) job.keywords = keywords;
    if (skills !== undefined) job.skills = skills;

    const updatedJob = await job.save();

    res.status(200).json({
      success: true,
      message: "Job updated successfully",
      data: updatedJob,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/job/:id
 * Delete a job post (permanent delete)
 * Allowed Roles: Recruiter (owner of the job)
 */
export const deleteJob = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Find job
    const job = await Job.findById(id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    // Check if user is the owner of the job
    if (job.employerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own job posts",
      });
    }

    // Delete the job
    await Job.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Job deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/v1/job/:id/hide
 * Temporarily hide a job from public view
 * Allowed Roles: Recruiter (owner of the job)
 */
export const hideJob = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Find job
    const job = await Job.findById(id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    // Check if user is the owner of the job
    if (job.employerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only hide your own job posts",
      });
    }

    // Toggle hide status
    job.isHidden = !job.isHidden;
    await job.save();

    res.status(200).json({
      success: true,
      message: `Job ${job.isHidden ? "hidden" : "unhidden"} successfully`,
      data: {
        id: job._id,
        isHidden: job.isHidden,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/job/:id/status
 * Change the status of a job
 * Allowed Roles: Admin
 */
export const updateJobStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Check if user is admin (you might need to add admin role to user model)
    if (req.user.accountType !== "Admin") {
      return res.status(403).json({
        success: false,
        message: "Only admins can update job status",
      });
    }

    // Validate status
    const validStatuses = [
      "active",
      "inactive",
      "pending",
      "approved",
      "rejected",
      "flagged",
    ];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status value",
      });
    }

    // Find and update job
    const job = await Job.findByIdAndUpdate(id, { status }, { new: true });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Job status updated successfully",
      data: {
        id: job._id,
        status: job.status,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/job/overview
 * Get an overview of job posts
 * Allowed Roles: Admin
 */
export const getJobOverview = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    // Get job statistics
    const totalJobs = await Job.countDocuments();
    const activeJobs = await Job.countDocuments({ status: "active" });
    const pendingJobs = await Job.countDocuments({ status: "pending" });
    const hiddenJobs = await Job.countDocuments({ isHidden: true });

    res.status(200).json({
      success: true,
      message: "Job overview fetched successfully",
      data: {
        statistics: {
          totalJobs,
          activeJobs,
          pendingJobs,
          hiddenJobs,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/job/recruiter/:recruiterId
 * Get all jobs posted by a specific recruiter
 * Allowed Roles: Admin, Recruiter (if viewing own jobs)
 */
export const getJobsByRecruiter = async (req, res, next) => {
  try {
    const { recruiterId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    // Check authorization
    if (
      req.user.accountType !== "Admin" &&
      req.user._id.toString() !== recruiterId
    ) {
      return res.status(403).json({
        success: false,
        message: "You can only view your own jobs",
      });
    }

    // Pagination
    const skip = (page - 1) * limit;

    // Get jobs by recruiter
    const jobs = await Job.find({ employerId: recruiterId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const totalJobs = await Job.countDocuments({ employerId: recruiterId });

    // Get recruiter info
    const recruiter = await User.findById(recruiterId).select("name email");

    res.status(200).json({
      success: true,
      message: "Jobs fetched successfully",
      data: {
        recruiter: {
          id: recruiter._id,
          name: recruiter.name,
          email: recruiter.email,
        },
        jobs: jobs.map((job) => ({
          id: job._id,
          title: job.title,
          status: job.status,
          isHidden: job.isHidden,
          views: job.views,
          createdAt: job.createdAt,
          deadline: job.deadline,
        })),
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalJobs / limit),
          totalJobs,
          hasNextPage: page * limit < totalJobs,
          hasPrevPage: page > 1,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/job/:id/applicants
 * View the list of applicants who applied for a specific job
 * Allowed Roles: Recruiter (owner of the job)
 */
export const getJobApplicants = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10 } = req.query;

    // Find job
    const job = await Job.findById(id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    // Check if user is the owner of the job
    if (job.employerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only view applicants for your own job posts",
      });
    }

    // Pagination
    const skip = (page - 1) * limit;

    // Get applications for this job
    const applications = await Application.find({ id })
      .populate("applicantId", "name email phone")
      .sort({ appliedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const totalApplications = await Application.countDocuments({ id });

    res.status(200).json({
      success: true,
      message: "Job applicants fetched successfully",
      data: {
        job: {
          id: job._id,
          title: job.title,
        },
        applicants: applications.map((app) => ({
          id: app._id,
          applicantId: app.applicantId._id,
          applicantName: app.applicantId.name,
          applicantEmail: app.applicantId.email,
          applicantPhone: app.applicantId.phone,
          status: app.status,
          appliedAt: app.appliedAt,
          resumeFile: app.resumeFile,
        })),
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalApplications / limit),
          totalApplications,
          hasNextPage: page * limit < totalApplications,
          hasPrevPage: page > 1,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/job/:id/applications/:applicantId
 * Update the application status of an applicant
 * Allowed Roles: Recruiter (owner of the job)
 */
export const updateApplicationStatus = async (req, res, next) => {
  try {
    const { id, applicantId } = req.params;
    const { status } = req.body;

    // Find job
    const job = await Job.findById(id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    // Check if user is the owner of the job
    if (job.employerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only update applications for your own job posts",
      });
    }

    // Validate status
    const validStatuses = ["Pending", "Phỏng vấn", "Từ chối", "Mới nhận"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status value",
      });
    }

    // Find and update application
    const application = await Application.findOneAndUpdate(
      { id, applicantId },
      { status },
      { new: true },
    ).populate("applicantId", "name email");

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Application status updated successfully",
      data: {
        id: application._id,
        applicantName: application.applicantId.name,
        applicantEmail: application.applicantId.email,
        status: application.status,
        updatedAt: application.appliedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/job/:id/view
 * Track the number of views for a job post
 * Allowed Roles: All (but typically called by frontend)
 */
export const trackJobView = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Increment view count
    const job = await Job.findByIdAndUpdate(
      id,
      { $inc: { views: 1 } },
      { new: true },
    );

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Job view tracked successfully",
      data: {
        id: job._id,
        views: job.views,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/job/recommended
 * Get AI-recommended jobs for the logged-in applicant
 * Allowed Roles: Applicant
 */
export const getRecommendedJobs = async (req, res, next) => {
  try {
    // Check if user is an applicant
    if (req.user.accountType !== "Ứng Viên") {
      return res.status(403).json({
        success: false,
        message: "Only applicants can get job recommendations",
      });
    }

    // Get applicant profile
    const profile = await ApplicantProfile.findOne({ userId: req.user._id });

    if (!profile) {
      return res.status(200).json({
        success: true,
        message: "No profile found, returning recent jobs",
        data: [],
      });
    }

    // Build recommendation query based on profile
    const recommendationQuery = {
      status: "active",
      isHidden: false,
    };

    // Add filters based on profile data
    if (profile.jobTitle) {
      recommendationQuery.$or = [
        { title: { $regex: profile.jobTitle, $options: "i" } },
        { position: { $regex: profile.jobTitle, $options: "i" } },
      ];
    }

    if (profile.skills && profile.skills.length > 0) {
      recommendationQuery.skills = { $in: profile.skills };
    }

    // Get recommended jobs
    const recommendedJobs = await Job.find(recommendationQuery)
      .sort({ priorityLevel: -1, createdAt: -1 })
      .limit(10);

    // Format response
    const formattedJobs = await Promise.all(
      recommendedJobs.map(async (job) => {
        const employer = await User.findById(job.employerId).select("name");
        return {
          id: job._id,
          employerName: employer?.name,
          title: job.title,
          description: job.description,
          salary: job.salary,
          location: job.location,
          experience: job.experience,
          industry: job.industry,
          position: job.position,
          level: job.level,
          priorityLevel: job.priorityLevel,
          createdAt: job.createdAt,
          deadline: job.deadline,
        };
      }),
    );

    res.status(200).json({
      success: true,
      message: "Recommended jobs fetched successfully",
      data: formattedJobs,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/job/expired
 * View expired job posts
 * Allowed Roles: Recruiter, Admin
 */
export const getExpiredJobs = async (req, res, next) => {
  try {
    // Check authorization
    if (
      req.user.accountType !== "Admin" &&
      req.user.accountType !== "Nhà Tuyển Dụng"
    ) {
      return res.status(403).json({
        success: false,
        message: "Only admins and recruiters can view expired jobs",
      });
    }

    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    // Find expired jobs (deadline passed)
    const expiredJobs = await Job.find({
      deadline: { $lt: new Date() },
      status: "active",
    })
      .populate("employerId", "name")
      .sort({ deadline: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const totalExpiredJobs = await Job.countDocuments({
      deadline: { $lt: new Date() },
      status: "active",
    });

    res.status(200).json({
      success: true,
      message: "Expired jobs fetched successfully",
      data: {
        jobs: expiredJobs.map((job) => ({
          id: job._id,
          title: job.title,
          employerName: job.employerId.name,
          deadline: job.deadline,
          createdAt: job.createdAt,
          views: job.views,
        })),
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalExpiredJobs / limit),
          totalExpiredJobs,
          hasNextPage: page * limit < totalExpiredJobs,
          hasPrevPage: page > 1,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/job/related/:id
 * Fetch similar or related jobs based on a specific job
 * Allowed Roles: All
 */
export const getRelatedJobs = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { limit = 5 } = req.query;

    // Find the reference job
    const referenceJob = await Job.findById(id);

    if (!referenceJob) {
      return res.status(404).json({
        success: false,
        message: "Reference job not found",
      });
    }

    // Build query for related jobs
    const relatedQuery = {
      _id: { $ne: id }, // Exclude the reference job
      status: "active",
      isHidden: false,
      $or: [
        { industry: referenceJob.industry },
        { position: referenceJob.position },
        { location: referenceJob.location },
        { level: referenceJob.level },
      ],
    };

    // Add skills matching if available
    if (referenceJob.skills && referenceJob.skills.length > 0) {
      relatedQuery.skills = { $in: referenceJob.skills };
    }

    // Get related jobs
    const relatedJobs = await Job.find(relatedQuery)
      .sort({ priorityLevel: -1, createdAt: -1 })
      .limit(parseInt(limit));

    // Format response
    const formattedJobs = await Promise.all(
      relatedJobs.map(async (job) => {
        const employer = await User.findById(job.employerId).select("name");
        return {
          id: job._id,
          employerName: employer?.name,
          title: job.title,
          description: job.description,
          salary: job.salary,
          location: job.location,
          experience: job.experience,
          industry: job.industry,
          position: job.position,
          level: job.level,
          priorityLevel: job.priorityLevel,
          createdAt: job.createdAt,
          deadline: job.deadline,
        };
      }),
    );

    res.status(200).json({
      success: true,
      message: "Related jobs fetched successfully",
      data: {
        referenceJob: {
          id: referenceJob._id,
          title: referenceJob.title,
          industry: referenceJob.industry,
          position: referenceJob.position,
          location: referenceJob.location,
        },
        relatedJobs: formattedJobs,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ================================================================

// Existing functions (keeping for backward compatibility)
export const getFilterOptions = async (req, res, next) => {
  try {
    // Get unique locations
    const locations = await Job.distinct("location");

    // Get unique positions
    const positions = await Job.distinct("position");

    // Get unique industries
    const industries = await JobCategory.find({ parentId: null }).select(
      "_id name",
    );

    // Get fields with enum associated with them
    const levels = levelEnum;
    const experiences = experienceEnum;
    const salaryRangeUnits = salaryRangeUnitEnum;

    res.status(200).json({
      success: true,
      message: "Filter options fetched successfully",
      data: {
        locations,
        positions,
        industries,
        levels,
        experiences,
        salaryRangeUnits,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Keep existing getJobsByEmployer for backward compatibility
export const getJobsByEmployer = async (req, res, next) => {
  try {
    const { employerId } = req.params;

    if (!employerId) {
      return res.status(400).json({
        success: false,
        message: "Employer ID is required",
      });
    }

    const jobs = await Job.find({ employerId });

    res.status(200).json({
      success: true,
      message: `Jobs fetched for employer ${employerId}`,
      data: jobs,
    });
  } catch (error) {
    next(error);
  }
};

export const getMonthlyJobStats = async (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();

    if (!year || isNaN(year)) {
      return res.status(400).json({ message: "Invalid year provided" });
    }

    const startDate = new Date(`${year}-01-01`);
    const endDate = new Date(`${year + 1}-01-01`);

    const stats = await Job.aggregate([
      {
        $match: {
          createdAt: {
            $gte: startDate,
            $lt: endDate,
          },
        },
      },
      {
        $group: {
          _id: { $month: "$createdAt" },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          month: "$_id",
          count: 1,
          _id: 0,
        },
      },
    ]);

    // Fill missing months with 0
    const monthlyData = Array(12).fill(0);
    stats.forEach(({ month, count }) => {
      monthlyData[month - 1] = count;
    });

    res.json({
      year,
      data: monthlyData,
    });
  } catch (err) {
    console.error("Error fetching monthly stats:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getQuarterlyJobStats = async (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const startDate = new Date(year, 0, 1); // Jan 1
    const endDate = new Date(year + 1, 0, 1); // Jan 1 next year

    const stats = await Job.aggregate([
      {
        $match: {
          createdAt: {
            $gte: startDate,
            $lt: endDate,
          },
        },
      },
      {
        $addFields: {
          month: { $month: "$createdAt" },
        },
      },
      {
        $addFields: {
          quarter: {
            $switch: {
              branches: [
                { case: { $lte: ["$month", 3] }, then: 1 },
                { case: { $lte: ["$month", 6] }, then: 2 },
                { case: { $lte: ["$month", 9] }, then: 3 },
              ],
              default: 4,
            },
          },
        },
      },
      {
        $group: {
          _id: "$quarter",
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          quarter: "$_id",
          count: 1,
          _id: 0,
        },
      },
    ]);

    const result = [0, 0, 0, 0]; // Initialize Q1–Q4 = 0

    stats.forEach(({ quarter, count }) => {
      result[quarter - 1] = count;
    });

    res.json({ year, data: result });
  } catch (err) {
    console.error("Error fetching quarterly stats:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getYearlyJobStats = async (req, res) => {
  try {
    const endYear = parseInt(req.query.endYear) || new Date().getFullYear();
    const startYear = endYear - 3;

    // Calculate start and end dates for filtering
    const startDate = new Date(`${startYear}-01-01T00:00:00Z`);
    const endDate = new Date(`${endYear + 1}-01-01T00:00:00Z`);

    const stats = await Job.aggregate([
      {
        $match: {
          createdAt: {
            $gte: startDate,
            $lt: endDate,
          },
        },
      },
      {
        $group: {
          _id: { $year: "$createdAt" },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          year: "$_id",
          count: 1,
          _id: 0,
        },
      },
    ]);

    // Prepare the result with fallback 0
    const counts = [];
    for (let y = startYear; y <= endYear; y++) {
      const stat = stats.find((s) => s.year === y);
      counts.push(stat ? stat.count : 0);
    }

    res.json({
      startYear,
      endYear,
      data: counts,
    });
  } catch (error) {
    console.error("Error getting yearly job stats:", error);
    res.status(500).json({ message: "Failed to fetch yearly job stats" });
  }
};

// Validation middleware for creating a job
export const validateCreateJob = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Title is required")
    .isLength({ min: 5, max: 100 })
    .withMessage("Title must be 5-100 characters")
    .matches(/^[a-zA-Z0-9À-ý\s'.-]+$/u)
    .withMessage("Title must be valid and not random characters"),
  body("description")
    .trim()
    .notEmpty()
    .withMessage("Description is required")
    .isLength({ min: 20, max: 2000 })
    .withMessage("Description must be 20-2000 characters")
    .matches(/^[a-zA-Z0-9À-ý\s'.,-]+$/u)
    .withMessage("Description must be valid and not random characters"),
  body("requirements")
    .trim()
    .notEmpty()
    .withMessage("Requirements are required"),

  body([
    "salary",
    "salaryRangeStart",
    "salaryRangeEnd",
    "salaryRangeUnit",
  ]).custom((value, { req }) => {
    if (
      req.body.salary ||
      (req.body.salaryRangeStart &&
        req.body.salaryRangeEnd &&
        req.body.salaryRangeUnit)
    ) {
      return true;
    }
    throw new Error(
      "Either salary or salaryRange (salaryRangeStart, salaryRangeEnd, and salaryRangeUnit) must be provided",
    );
  }),
  body("salary")
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Salary must be 2-50 characters"),
  body("salaryRangeStart")
    .optional()
    .trim()
    .matches(/^[0-9]+$/u)
    .withMessage("salaryRangeStart must be a valid number"),
  body("salaryRangeEnd")
    .optional()
    .trim()
    .matches(/^[0-9]+$/u)
    .withMessage("salaryRangeEnd must be a valid number"),
  body("salaryRangeUnit")
    .optional()
    .custom((value) => {
      if (check.contains(salaryRangeUnitEnum, value)) return true;
      throw new Error(
        `salaryRangeUnit must be a value of salaryRangeUnit enum (${JSON.stringify(salaryRangeUnitEnum)})`,
      );
    }),
  body("deliveryTime").optional(),
  body("priorityLevel")
    .optional()
    .isIn(["Nổi bật", "Thông thường"])
    .withMessage("Invalid priority level"),
  body("quantity")
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage("Quantity must be a positive integer (1-1000)"),
  body("level").optional(),
  body("industry")
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage("Industry must be 2-100 characters")
    .matches(/^[a-zA-Z0-9À-ý\s'.-]+$/u)
    .withMessage("Industry must be valid and not random characters"),
  body("position")
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage("Position must be 2-100 characters")
    .matches(/^[a-zA-Z0-9À-ý\s'.-]+$/u)
    .withMessage("Position must be valid and not random characters"),
  body("location")
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage("Location must be 2-100 characters")
    .matches(/^[a-zA-Z0-9À-ý\s'.-]+$/u)
    .withMessage("Location must be valid and not random characters"),
  body("experience").optional(),
  body("deadline")
    .optional()
    .isISO8601()
    .withMessage("Deadline must be a valid date"),
  body("keywords")
    .optional()
    .isArray()
    .withMessage("Keywords must be an array"),
  body("skills").optional().isArray().withMessage("Skills must be an array"),
  body("categoryId").isMongoId().withMessage("Invalid ObjectId format"),
  (req, res, next) => {
    const errors = validationResult(req);
    console.log(req.body);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    next();
  },
];

// Validation middleware for updating a job (fields optional but must be valid if present)
export const validateUpdateJob = [
  param("id").isMongoId().withMessage("Invalid job ID"),
  body("title")
    .optional()
    .isLength({ min: 5, max: 100 })
    .withMessage("Title must be 5-100 characters")
    .matches(/^[a-zA-Z0-9À-ý\s'.-]+$/u)
    .withMessage("Title must be valid and not random characters"),
  body("description")
    .optional()
    .isLength({ min: 20, max: 2000 })
    .withMessage("Description must be 20-2000 characters")
    .matches(/^[a-zA-Z0-9À-ý\s'.-]+$/u)
    .withMessage("Description must be valid and not random characters"),
  body("requirements")
    .optional()
    .isLength({ min: 10, max: 1000 })
    .withMessage("Requirements must be 10-1000 characters")
    .matches(/^[a-zA-Z0-9À-ý\s'.-]+$/u)
    .withMessage("Requirements must be valid and not random characters"),
  body("salary")
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage("Salary must be 2-50 characters")
    .matches(/^[0-9]+$/u)
    .withMessage("Salary must be a valid number"),
  body("deliveryTime")
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage("Delivery time must be 2-50 characters")
    .matches(/^[a-zA-Z0-9À-ý\s'.-]+$/u)
    .withMessage("Delivery time must be valid and not random characters"),
  body("priorityLevel")
    .optional()
    .isIn(["Nổi bật", "Thông thường"])
    .withMessage("Invalid priority level"),
  body("quantity")
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage("Quantity must be a positive integer (1-1000)"),
  body("level")
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage("Level must be 2-50 characters")
    .matches(/^[a-zA-Z0-9À-ý\s'.-]+$/u)
    .withMessage("Level must be valid and not random characters"),
  body("industry")
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage("Industry must be 2-100 characters")
    .matches(/^[a-zA-Z0-9À-ý\s'.-]+$/u)
    .withMessage("Industry must be valid and not random characters"),
  body("position")
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage("Position must be 2-100 characters")
    .matches(/^[a-zA-Z0-9À-ý\s'.-]+$/u)
    .withMessage("Position must be valid and not random characters"),
  body("location")
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage("Location must be 2-100 characters")
    .matches(/^[a-zA-Z0-9À-ý\s'.-]+$/u)
    .withMessage("Location must be valid and not random characters"),
  body("experience")
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage("Experience must be 2-100 characters")
    .matches(/^[a-zA-Z0-9À-ý\s'.-]+$/u)
    .withMessage("Experience must be valid and not random characters"),
  body("deadline")
    .optional()
    .isISO8601()
    .withMessage("Deadline must be a valid date"),
  body("keywords")
    .optional()
    .isArray()
    .withMessage("Keywords must be an array"),
  body("skills").optional().isArray().withMessage("Skills must be an array"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    next();
  },
];

// Validation for updating job status
export const validateUpdateJobStatus = [
  param("id").isMongoId().withMessage("Invalid job ID"),
  body("status")
    .notEmpty()
    .withMessage("Status is required")
    .isIn(["active", "inactive", "pending", "approved", "rejected", "flagged"])
    .withMessage("Invalid status value"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    next();
  },
];

// Validation for updating application status
export const validateUpdateApplicationStatus = [
  param("id").isMongoId().withMessage("Invalid job ID"),
  param("applicantId").isMongoId().withMessage("Invalid applicant ID"),
  body("status")
    .notEmpty()
    .withMessage("Status is required")
    .isIn(["Pending", "Phỏng vấn", "Từ chối", "Mới nhận"])
    .withMessage("Invalid status value"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    next();
  },
];
