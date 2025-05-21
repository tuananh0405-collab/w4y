import Job from "../models/job.model.js";
import User from "../models/user.model.js"; // Đảm bảo bạn import User model

// export const createJobPosting = async (req, res, next) => {
//   try {
//     const { title, description, requirements, salary, deliveryTime, priorityLevel } = req.body;
//     const recruiterId = req.user._id;  // Lấy recruiterId từ token của người dùng đã đăng nhập

//     // Kiểm tra xem công việc có tồn tại không
//     const existingJob = await Job.findOne({ title, recruiterId });

//     if (existingJob) {
//       return res.status(400).json({ message: "Job already posted" });
//     }

//     // Tạo một công việc mới
//     const newJob = new Job({
//       recruiterId,
//       title,
//       description,
//       requirements,
//       salary,
//       deliveryTime,
//       priorityLevel,
//     });

//     await newJob.save();

//     // Lấy thông tin nhà tuyển dụng (recruiterName) từ User model
//     const recruiter = await User.findById(recruiterId).select("name");  // Lấy tên nhà tuyển dụng

//     res.status(201).json({
//       success: true,
//       message: "Job posted successfully",
//       data: {
//         recruiterName: recruiter.name,
//         title: newJob.title,
//         description: newJob.description,
//         requirements: newJob.requirements,
//         salary: newJob.salary,
//         deliveryTime: newJob.deliveryTime,
//         priorityLevel: newJob.priorityLevel,
//         createdAt: newJob.createdAt,
//       },
//     });
//   } catch (error) {
//     next(error);
//   }
// };

export const createJobPosting = async (req, res, next) => {
  try {
    const {
      title,
      description,
      requirements,
      salary,
      deliveryTime,
      priorityLevel,
      quantity, // Số lượng người tuyển dụng
      level, // Cấp bậc
      industry, // Ngành nghề
      position, // Chức danh
      location, // Địa điểm làm việc
      experience, // Kinh nghiệm
    } = req.body;

    const recruiterId = req.user._id; // Lấy recruiterId từ token của người dùng đã đăng nhập

    // Kiểm tra xem công việc có tồn tại không
    const existingJob = await Job.findOne({ title, recruiterId });

    if (existingJob) {
      return res.status(400).json({ message: "Job already posted" });
    }

    // Tạo một công việc mới
    const newJob = new Job({
      recruiterId,
      title,
      description,
      requirements,
      salary,
      deliveryTime,
      priorityLevel,
      quantity, // Số lượng người tuyển dụng
      level, // Cấp bậc
      industry, // Ngành nghề
      position, // Chức danh
      location, // Địa điểm làm việc
      experience, // Kinh nghiệm
    });

    await newJob.save();

    // Lấy thông tin nhà tuyển dụng (recruiterName) từ User model
    const recruiter = await User.findById(recruiterId).select("name"); // Lấy tên nhà tuyển dụng

    res.status(201).json({
      success: true,
      message: "Job posted successfully",
      data: {
        recruiterName: recruiter.name,
        title: newJob.title,
        description: newJob.description,
        requirements: newJob.requirements,
        salary: newJob.salary,
        deliveryTime: newJob.deliveryTime,
        priorityLevel: newJob.priorityLevel,
        quantity: newJob.quantity, // Số lượng người tuyển dụng
        level: newJob.level, // Cấp bậc
        industry: newJob.industry, // Ngành nghề
        position: newJob.position, // Chức danh
        location: newJob.location, // Địa điểm làm việc
        experience: newJob.experience, // Kinh nghiệm
        createdAt: newJob.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const viewJobList = async (req, res, next) => {
  try {
    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Sorting
    const sortField = req.query.sortBy || "createdAt";
    const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;
    const sort = { [sortField]: sortOrder };

    // Search and Filter
    const query = {};
    
    // Text search
    if (req.query.search) {
      query.$or = [
        { title: { $regex: req.query.search, $options: "i" } },
        { description: { $regex: req.query.search, $options: "i" } },
        { requirements: { $regex: req.query.search, $options: "i" } },
        { industry: { $regex: req.query.search, $options: "i" } },
        { position: { $regex: req.query.search, $options: "i" } },
      ];
    }

    // Filter by priority level
    if (req.query.priorityLevel) {
      query.priorityLevel = req.query.priorityLevel;
    }

    // Filter by salary range
    if (req.query.minSalary || req.query.maxSalary) {
      query.salary = {};
      if (req.query.minSalary) {
        query.salary.$gte = req.query.minSalary;
      }
      if (req.query.maxSalary) {
        query.salary.$lte = req.query.maxSalary;
      }
    }

    // Filter by experience level
    if (req.query.experience) {
      query.experience = req.query.experience;
    }

    // Filter by job level
    if (req.query.level) {
      query.level = req.query.level;
    }

    // Filter by industry
    if (req.query.industry) {
      query.industry = { $regex: req.query.industry, $options: "i" };
    }

    // Filter by position
    if (req.query.position) {
      query.position = { $regex: req.query.position, $options: "i" };
    }

    // Filter by location
    if (req.query.location) {
      query.location = { $regex: req.query.location, $options: "i" };
    }

    // Filter by quantity (number of positions)
    if (req.query.minQuantity || req.query.maxQuantity) {
      query.quantity = {};
      if (req.query.minQuantity) {
        query.quantity.$gte = parseInt(req.query.minQuantity);
      }
      if (req.query.maxQuantity) {
        query.quantity.$lte = parseInt(req.query.maxQuantity);
      }
    }

    // Date range filter
    if (req.query.startDate || req.query.endDate) {
      query.createdAt = {};
      if (req.query.startDate) {
        query.createdAt.$gte = new Date(req.query.startDate);
      }
      if (req.query.endDate) {
        query.createdAt.$lte = new Date(req.query.endDate);
      }
    }

    // Filter by recruiter
    if (req.query.recruiterId) {
      query.recruiterId = req.query.recruiterId;
    }

    // Execute query with pagination and sorting
    const [jobs, total] = await Promise.all([
      Job.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Job.countDocuments(query),
    ]);

    // Get recruiter information for each job
    const formattedJobs = await Promise.all(
      jobs.map(async (job) => {
        const recruiter = await User.findById(job.recruiterId)
          .select("name email company")
          .lean();
        return {
          id: job._id,
          recruiterName: recruiter?.name || "Unknown",
          recruiterEmail: recruiter?.email || "N/A",
          recruiterCompany: recruiter?.company || "N/A",
          title: job.title,
          description: job.description,
          requirements: job.requirements,
          salary: job.salary,
          deliveryTime: job.deliveryTime,
          priorityLevel: job.priorityLevel,
          quantity: job.quantity,
          level: job.level,
          industry: job.industry,
          position: job.position,
          location: job.location,
          experience: job.experience,
          createdAt: job.createdAt,
        };
      })
    );

    // Calculate pagination info
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    res.status(200).json({
      success: true,
      message: "Job list fetched successfully",
      data: {
        jobs: formattedJobs,
        pagination: {
          total,
          totalPages,
          currentPage: page,
          limit,
          hasNextPage,
          hasPrevPage,
        },
        filters: {
          search: req.query.search || null,
          priorityLevel: req.query.priorityLevel || null,
          minSalary: req.query.minSalary || null,
          maxSalary: req.query.maxSalary || null,
          experience: req.query.experience || null,
          level: req.query.level || null,
          industry: req.query.industry || null,
          position: req.query.position || null,
          location: req.query.location || null,
          minQuantity: req.query.minQuantity || null,
          maxQuantity: req.query.maxQuantity || null,
          startDate: req.query.startDate || null,
          endDate: req.query.endDate || null,
          recruiterId: req.query.recruiterId || null,
        },
        sorting: {
          field: sortField,
          order: sortOrder === 1 ? "asc" : "desc",
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// Xem chi tiết công việc
export const viewJobDetail = async (req, res, next) => {
  try {
    const { jobId } = req.params;

    // Tìm công việc theo jobId
    const job = await Job.findById(jobId);
    const recruiter = await User.findById(job.recruiterId).select("name"); // Lấy tên nhà tuyển dụng

    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    res.status(200).json({
      success: true,
      message: "Job detail fetched successfully",
      data: {
        recruiterName: recruiter.name,
        title: job.title,
        description: job.description,
        requirements: job.requirements,
        salary: job.salary,
        deliveryTime: job.deliveryTime,
        priorityLevel: job.priorityLevel,
        createdAt: job.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Cập nhật thông tin công việc
export const updateJob = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const {
      title,
      description,
      requirements,
      salary,
      deliveryTime,
      priorityLevel,
    } = req.body;

    // Tìm công việc theo jobId
    const job = await Job.findById(jobId);

    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    // Cập nhật các trường của công việc
    job.title = title || job.title;
    job.description = description || job.description;
    job.requirements = requirements || job.requirements;
    job.salary = salary || job.salary;
    job.deliveryTime = deliveryTime || job.deliveryTime;
    job.priorityLevel = priorityLevel || job.priorityLevel;

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

// Xóa công việc
export const deleteJob = async (req, res, next) => {
  try {
    const { jobId } = req.params;

    // Tìm công việc theo jobId và xóa
    const job = await Job.findByIdAndDelete(jobId);

    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    res.status(200).json({
      success: true,
      message: "Job deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

// Get job statistics
export const getJobStatistics = async (req, res, next) => {
  try {
    const recruiterId = req.user._id;
    const { period } = req.query; // 'weekly', 'monthly', 'quarterly', 'yearly'

    const now = new Date();
    let startDate;

    switch (period) {
      case "weekly":
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case "monthly":
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case "quarterly":
        startDate = new Date(now.setMonth(now.getMonth() - 3));
        break;
      case "yearly":
        startDate = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
      default:
        startDate = new Date(now.setMonth(now.getMonth() - 1)); // Default to monthly
    }

    const jobs = await Job.find({
      recruiterId,
      createdAt: { $gte: startDate },
    });

    // Calculate statistics
    const totalJobs = jobs.length;
    const featuredJobs = jobs.filter(
      (job) => job.priorityLevel === "Featured"
    ).length;
    const regularJobs = jobs.filter(
      (job) => job.priorityLevel === "Regular"
    ).length;

    res.status(200).json({
      success: true,
      data: {
        totalJobs,
        featuredJobs,
        regularJobs,
        period,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get recruitment list
export const getRecruitmentList = async (req, res, next) => {
  try {
    const recruiters = await User.find({ accountType: "Recruiter" })
      .select("name email phone company")
      .lean();

    const recruitmentList = await Promise.all(
      recruiters.map(async (recruiter) => {
        const jobCount = await Job.countDocuments({
          recruiterId: recruiter._id,
        });
        return {
          orderNumber: recruiters.indexOf(recruiter) + 1,
          recruiterName: recruiter.name,
          email: recruiter.email,
          phoneNumber: recruiter.phone || "N/A",
          company: recruiter.company || "N/A",
          numberOfJobsPosted: jobCount,
        };
      })
    );

    res.status(200).json({
      success: true,
      data: recruitmentList,
    });
  } catch (error) {
    next(error);
  }
};

// Get recruiter details
export const getRecruiterDetails = async (req, res, next) => {
  try {
    const { recruiterId } = req.params;

    const recruiter = await User.findById(recruiterId)
      .select("name email phone company city district gender")
      .lean();

    if (!recruiter) {
      return res.status(404).json({ message: "Recruiter not found" });
    }

    const jobs = await Job.find({ recruiterId })
      .select("title createdAt priorityLevel")
      .lean();

    // Calculate response rates (placeholder - you'll need to implement actual response tracking)
    const responseRates = {
      unseenProfiles: 0,
      viewedProfiles: 0,
      invitedForInterview: 0,
      rejected: 0,
    };

    res.status(200).json({
      success: true,
      data: {
        personalInfo: {
          name: recruiter.name,
          email: recruiter.email,
          phone: recruiter.phone || "N/A",
          company: recruiter.company || "N/A",
          city: recruiter.city || "N/A",
          district: recruiter.district || "N/A",
          gender: recruiter.gender || "N/A",
        },
        jobs: jobs,
        responseRates: responseRates,
      },
    });
  } catch (error) {
    next(error);
  }
};
