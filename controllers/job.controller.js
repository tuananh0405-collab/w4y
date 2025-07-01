import Job from "../models/job.model.js";
import User from "../models/user.model.js";  // Đảm bảo bạn import User model
import Application from "../models/application.model.js";
import ApplicantProfile from "../models/applicantProfile.model.js";

/**
 * POST /api/v1/job
 * Create a new job post
 * Allowed Roles: Recruiter (Nhà Tuyển Dụng)
 */
export const createJobPosting = async (req, res, next) => {
  try {
    // Check if user is a recruiter
    if (req.user.accountType !== 'Nhà Tuyển Dụng') {
      return res.status(403).json({
        success: false,
        message: "Only recruiters can create job posts"
      });
    }

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
      skills
    } = req.body;
    
    const employerId = req.user._id;

    // Check if job with same title already exists for this employer
    const existingJob = await Job.findOne({ title, employerId });

    if (existingJob) {
      return res.status(400).json({ 
        success: false,
        message: "Job with this title already exists" 
      });
    }

    // Create new job
    const newJob = new Job({
      employerId,
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
      status: "active" // Default status for new jobs
    });

    await newJob.save();

    // Get employer information
    const employer = await User.findById(employerId).select("name");

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
      level,
      status = "active", // Default to active jobs only
      page = 1,
      limit = 10
    } = req.query;

    // Build filter object
    const filter = {
      isHidden: false, // Only show non-hidden jobs
      status: status
    };

    // Add filters if provided
    if (location) filter.location = { $regex: location, $options: 'i' };
    if (position) filter.position = { $regex: position, $options: 'i' };
    if (industry) filter.industry = { $regex: industry, $options: 'i' };
    if (level) filter.level = { $regex: level, $options: 'i' };
    if (keywords) {
      filter.$text = { $search: keywords };
    }
    if (skills) {
      const skillsArray = skills.split(',').map(skill => skill.trim());
      filter.skills = { $in: skillsArray };
    }

    // Pagination
    const skip = (page - 1) * limit;

    // Get jobs with pagination
    const jobs = await Job.find(filter)
      .sort({ createdAt: -1, priorityLevel: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const totalJobs = await Job.countDocuments(filter);

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
          status: job.status
        };
      })
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
        hasPrevPage: page > 1
      }
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
      { new: true }
    );

    if (!job) {
      return res.status(404).json({ 
        success: false,
        message: "Job not found" 
      });
    }

    // Check if job is hidden
    if (job.isHidden) {
      return res.status(404).json({ 
        success: false,
        message: "Job not found" 
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
        status: job.status
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
      skills
    } = req.body;

    // Find job
    const job = await Job.findById(id);

    if (!job) {
      return res.status(404).json({ 
        success: false,
        message: "Job not found" 
      });
    }

    // Check if user is the owner of the job
    if (job.employerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only update your own job posts"
      });
    }

    // Update job fields
    const updateFields = {
      title: title || job.title,
      description: description || job.description,
      requirements: requirements || job.requirements,
      salary: salary || job.salary,
      deliveryTime: deliveryTime || job.deliveryTime,
      priorityLevel: priorityLevel || job.priorityLevel,
      quantity: quantity || job.quantity,
      level: level || job.level,
      industry: industry || job.industry,
      position: position || job.position,
      location: location || job.location,
      experience: experience || job.experience,
      deadline: deadline || job.deadline,
      keywords: keywords || job.keywords,
      skills: skills || job.skills
    };

    const updatedJob = await Job.findByIdAndUpdate(
      id,
      updateFields,
      { new: true }
    );

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
        message: "Job not found" 
      });
    }

    // Check if user is the owner of the job
    if (job.employerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own job posts"
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
        message: "Job not found" 
      });
    }

    // Check if user is the owner of the job
    if (job.employerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only hide your own job posts"
      });
    }

    // Toggle hide status
    job.isHidden = !job.isHidden;
    await job.save();

    res.status(200).json({
      success: true,
      message: `Job ${job.isHidden ? 'hidden' : 'unhidden'} successfully`,
      data: {
        id: job._id,
        isHidden: job.isHidden
      }
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
    if (req.user.accountType !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: "Only admins can update job status"
      });
    }

    // Validate status
    const validStatuses = ["active", "inactive", "pending", "approved", "rejected", "flagged"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status value"
      });
    }

    // Find and update job
    const job = await Job.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!job) {
      return res.status(404).json({ 
        success: false,
        message: "Job not found" 
      });
    }

    res.status(200).json({
      success: true,
      message: "Job status updated successfully",
      data: {
        id: job._id,
        status: job.status
      }
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
    const activeJobs = await Job.countDocuments({status: 'active' });
    const pendingJobs = await Job.countDocuments({status: 'pending' });
    const hiddenJobs = await Job.countDocuments({isHidden: true });

    res.status(200).json({
      success: true,
      message: "Job overview fetched successfully",
      data: {
        statistics: {
          totalJobs,
          activeJobs,
          pendingJobs,
          hiddenJobs
        },
      }
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
    if (req.user.accountType !== 'Admin' && req.user._id.toString() !== recruiterId) {
      return res.status(403).json({
        success: false,
        message: "You can only view your own jobs"
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
          email: recruiter.email
        },
        jobs: jobs.map(job => ({
          id: job._id,
          title: job.title,
          status: job.status,
          isHidden: job.isHidden,
          views: job.views,
          createdAt: job.createdAt,
          deadline: job.deadline
        })),
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalJobs / limit),
          totalJobs,
          hasNextPage: page * limit < totalJobs,
          hasPrevPage: page > 1
        }
      }
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
        message: "Job not found" 
      });
    }

    // Check if user is the owner of the job
    if (job.employerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only view applicants for your own job posts"
      });
    }

    // Pagination
    const skip = (page - 1) * limit;

    // Get applications for this job
    const applications = await Application.find({ id })
      .populate('applicantId', 'name email phone')
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
          title: job.title
        },
        applicants: applications.map(app => ({
          id: app._id,
          applicantId: app.applicantId._id,
          applicantName: app.applicantId.name,
          applicantEmail: app.applicantId.email,
          applicantPhone: app.applicantId.phone,
          status: app.status,
          appliedAt: app.appliedAt,
          resumeFile: app.resumeFile
        })),
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalApplications / limit),
          totalApplications,
          hasNextPage: page * limit < totalApplications,
          hasPrevPage: page > 1
        }
      }
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
        message: "Job not found" 
      });
    }

    // Check if user is the owner of the job
    if (job.employerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only update applications for your own job posts"
      });
    }

    // Validate status
    const validStatuses = ['Pending', 'Phỏng vấn', 'Từ chối', 'Mới nhận'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value'
      });
    }

    // Find and update application
    const application = await Application.findOneAndUpdate(
      { id, applicantId },
      { status },
      { new: true }
    ).populate('applicantId', 'name email');

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Application status updated successfully',
      data: {
        id: application._id,
        applicantName: application.applicantId.name,
        applicantEmail: application.applicantId.email,
        status: application.status,
        updatedAt: application.appliedAt
      }
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
      { new: true }
    );

    if (!job) {
      return res.status(404).json({ 
        success: false,
        message: "Job not found" 
      });
    }

    res.status(200).json({
      success: true,
      message: "Job view tracked successfully",
      data: {
        id: job._id,
        views: job.views
      }
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
    if (req.user.accountType !== 'Ứng Viên') {
      return res.status(403).json({
        success: false,
        message: "Only applicants can get job recommendations"
      });
    }

    // Get applicant profile
    const profile = await ApplicantProfile.findOne({ userId: req.user._id });
    
    if (!profile) {
      return res.status(200).json({
        success: true,
        message: "No profile found, returning recent jobs",
        data: []
      });
    }

    // Build recommendation query based on profile
    const recommendationQuery = {
      status: 'active',
      isHidden: false
    };

    // Add filters based on profile data
    if (profile.jobTitle) {
      recommendationQuery.$or = [
        { title: { $regex: profile.jobTitle, $options: 'i' } },
        { position: { $regex: profile.jobTitle, $options: 'i' } }
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
          deadline: job.deadline
        };
      })
    );

    res.status(200).json({
      success: true,
      message: "Recommended jobs fetched successfully",
      data: formattedJobs
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
    if (req.user.accountType !== 'Admin' && req.user.accountType !== 'Nhà Tuyển Dụng') {
      return res.status(403).json({
        success: false,
        message: "Only admins and recruiters can view expired jobs"
      });
    }

    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    // Find expired jobs (deadline passed)
    const expiredJobs = await Job.find({
      deadline: { $lt: new Date() },
      status: 'active'
    })
      .populate('employerId', 'name')
      .sort({ deadline: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const totalExpiredJobs = await Job.countDocuments({
      deadline: { $lt: new Date() },
      status: 'active'
    });

    res.status(200).json({
      success: true,
      message: "Expired jobs fetched successfully",
      data: {
        jobs: expiredJobs.map(job => ({
          id: job._id,
          title: job.title,
          employerName: job.employerId.name,
          deadline: job.deadline,
          createdAt: job.createdAt,
          views: job.views
        })),
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalExpiredJobs / limit),
          totalExpiredJobs,
          hasNextPage: page * limit < totalExpiredJobs,
          hasPrevPage: page > 1
        }
      }
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
        message: "Reference job not found" 
      });
    }

    // Build query for related jobs
    const relatedQuery = {
      _id: { $ne: id }, // Exclude the reference job
      status: 'active',
      isHidden: false,
      $or: [
        { industry: referenceJob.industry },
        { position: referenceJob.position },
        { location: referenceJob.location },
        { level: referenceJob.level }
      ]
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
          deadline: job.deadline
        };
      })
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
          location: referenceJob.location
        },
        relatedJobs: formattedJobs
      }
    });
  } catch (error) {
    next(error);
  }
};

// ================================================================

// Existing functions (keeping for backward compatibility)
export const getFilterOptions = async (req, res, next) => {
  try {
    // Lấy danh sách location duy nhất từ DB
    const rawLocations = await Job.distinct("location");

    // Lấy phần sau dấu ',' cuối cùng
    const locations = rawLocations
      .map((loc) => {
        if (typeof loc !== "string") return "";
        const parts = loc.split(",");
        return parts[parts.length - 1].trim(); // phần sau dấu ',' cuối cùng
      })
      .filter((loc) => loc) // bỏ rỗng
      .filter((value, index, self) => self.indexOf(value) === index); // lọc trùng

    // Các filter khác giữ nguyên
    const positions = await Job.distinct("position");
    const industries = await Job.distinct("industry");
    const levels = await Job.distinct("level");

    res.status(200).json({
      success: true,
      message: "Filter options fetched successfully",
      data: {
        locations,
        positions,
        industries,
        levels,
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
    const startDate = new Date(year, 0, 1);   // Jan 1
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
