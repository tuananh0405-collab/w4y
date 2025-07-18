import multer from 'multer';
import path from 'path';
import Application from "../models/application.model.js";
import Job from "../models/job.model.js";
import ApplicantProfile from "../models/applicantProfile.model.js";
import transporter from '../config/nodemailer.js';
import { EMAIL_ACCOUNT } from '../config/env.js';

// Cấu hình multer để lưu file CV với multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/cvs/');  // Đảm bảo bạn có thư mục 'uploads/cvs' trong dự án
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${req.user._id}-${Date.now()}${ext}`); // Tên file sẽ là userId + thời gian
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /pdf|docx|txt/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error("Only PDF, DOCX, and TXT files are allowed!"));
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }  // Giới hạn kích thước file tối đa (10MB)
});

// Ứng viên nộp đơn ứng tuyển kèm theo CV
export const applyJob = [
  upload.single('resumeFile'),  // Đảm bảo rằng tên trường trong form-data là 'resumeFile'
  async (req, res, next) => {
    try {
      const { jobId } = req.params;
      const applicantId = req.user._id;  // Lấy applicantId từ JWT token

      // Kiểm tra xem công việc có tồn tại không
      const job = await Job.findById(jobId);
      if (!job) {
        return res.status(404).json({ success: false, message: "Job not found" });
      }

      // Kiểm tra nếu ứng viên đã nộp đơn cho công việc này
      const existingApplication = await Application.findOne({ jobId, applicantId });

      if (existingApplication) {
        return res.status(400).json({ success: false, message: "You have already applied for this job" });
      }

      if (!req.file) {
        return res.status(400).json({ success: false, message: "No CV file uploaded" });
      }

      // Lưu CV vào ApplicantProfile (nếu chưa có, tạo mới)
      const applicantProfile = await ApplicantProfile.findOne({ userId: req.user._id });

      if (applicantProfile) {
        // Nếu profile đã tồn tại, cập nhật lại thông tin CV
        applicantProfile.resumeFile = {
          path: req.file.path,  // Lưu đường dẫn tệp trong cơ sở dữ liệu
          contentType: req.file.mimetype,
        };
        await applicantProfile.save();
      } else {
        // Nếu profile chưa tồn tại, tạo mới một bản hồ sơ cho ứng viên
        const newProfile = new ApplicantProfile({
          userId: req.user._id,
          resumeFile: {
            path: req.file.path,  // Lưu đường dẫn tệp
            contentType: req.file.mimetype,
          }
        });
        await newProfile.save();
      }

      // Lưu đơn ứng tuyển và kèm CV
      const newApplication = new Application({
        applicantId,
        jobId,
        status: "Pending",
        resumeFile: {
          path: req.file.path,   // Lưu đường dẫn tệp trong Application
          contentType: req.file.mimetype,
        },
      });

      await newApplication.save();

      res.status(201).json({
        success: true,
        message: "Application submitted successfully with CV",
        data: newApplication,
      });
    } catch (error) {
      next(error);
    }
  }
];

// Xem trạng thái đơn ứng tuyển
export const viewApplicationStatus = async (req, res, next) => {
    try {
      const { applicationId } = req.params;
      const applicantId = req.user._id;  // Lấy applicantId từ JWT token
  
      // Tìm đơn ứng tuyển theo applicationId
      const application = await Application.findById(applicationId);
  
      if (!application) {
        return res.status(404).json({ success: false, message: "Application not found" });
      }
  
      // Kiểm tra xem người dùng có quyền xem trạng thái này không
      if (application.applicantId.toString() !== applicantId.toString()) {
        return res.status(403).json({ success: false, message: "Unauthorized access" });
      }
  
      res.status(200).json({
        success: true,
        message: "Application status fetched successfully",
        data: {
          status: application.status,
          appliedAt: application.appliedAt,
        },
      });
    } catch (error) {
      next(error);
    }
  };


// Ứng dụng có thể nhận query param: jobIds=job1,job2,job3
export const getApplications = async (req, res, next) => {
   try {
    // Có thể lọc theo employerId (từ jobs) hoặc jobIds theo query param
    const { employerId } = req.query;

    let filter = {};
    if (employerId) {
      // Lấy danh sách jobId của employer này
      const jobs = await Job.find({ employerId }, '_id');
      const jobIds = jobs.map(j => j._id);
      filter.jobId = { $in: jobIds };
    }

    const applications = await Application.find(filter)
      .populate('applicantId', 'name experience') // lấy tên và kinh nghiệm user
      .populate('jobId', 'position createdAt')   // lấy vị trí và ngày tạo job
      .exec();

    res.status(200).json({
      success: true,
      message: 'Applications with user and job info fetched successfully',
      data: applications,
    });
  } catch (error) {
    next(error);
  }
};

// export const updateApplicationStatus = async (req, res, next) => {
//   try {
//     const { applicationId } = req.params;
//     const { status } = req.body;

//     // Validate status nếu cần (ví dụ chỉ chấp nhận 1 số trạng thái cụ thể)
//     const validStatuses = ['Pending', 'Phỏng vấn', 'Từ chối', 'Mới nhận'];
//     if (!validStatuses.includes(status)) {
//       return res.status(400).json({ success: false, message: 'Trạng thái không hợp lệ' });
//     }

//     // Cập nhật trạng thái trong database
//     const updatedApplication = await Application.findByIdAndUpdate(
//       applicationId,
//       { status },
//       { new: true }
//     );

//     if (!updatedApplication) {
//       return res.status(404).json({ success: false, message: 'Ứng dụng không tồn tại' });
//     }

//     res.status(200).json({
//       success: true,
//       message: 'Cập nhật trạng thái thành công',
//       data: updatedApplication,
//     });
//   } catch (error) {
//     next(error);
//   }
// };


export const updateApplicationStatus = async (req, res, next) => {
  try {
    const { applicationId } = req.params;
    const { status } = req.body;

    const validStatuses = ['Pending', 'Phỏng vấn', 'Từ chối', 'Mới nhận'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Trạng thái không hợp lệ' });
    }

    // Cập nhật trạng thái
    const application = await Application.findById(applicationId)
      .populate('applicantId'); // Lấy thông tin applicant để lấy email

    if (!application) {
      return res.status(404).json({ success: false, message: 'Ứng dụng không tồn tại' });
    }

    application.status = status;
    await application.save();

    // Gửi mail thông báo
    const mailOptions = {
      from: EMAIL_ACCOUNT,
      to: application.applicantId.email, // email ứng viên
      subject: 'Thông báo kết quả ứng tuyển',
      text: `Xin chào ${application.applicantId.name},

Đơn ứng tuyển vị trí "${application.jobId.position}" của bạn đã được cập nhật trạng thái: ${status}.

Cảm ơn bạn đã quan tâm và ứng tuyển.

Trân trọng,
Đội ngũ tuyển dụng`,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({
      success: true,
      message: 'Cập nhật trạng thái thành công và gửi mail thông báo.',
      data: application,
    });
  } catch (error) {
    next(error);
  }
};

// List jobs a user has applied for, with pagination and advanced search
export const listAppliedJobs = async (req, res, next) => {
  try {
    const applicantId = req.user._id;
    const { page = 1, limit = 10, search = "" } = req.query;
    const skip = (page - 1) * limit;

    // Build search filter for job fields
    let jobSearchFilter = {};
    if (search && search.trim() !== "") {
      const regex = new RegExp(search, "i");
      jobSearchFilter = {
        $or: [
          { title: regex },
          { description: regex },
          { salary: regex },
          { position: regex },
          { location: regex },
        ],
      };
    }

    // Find applications for this user
    const applications = await Application.find({ applicantId })
      .populate({
        path: "jobId",
        match: jobSearchFilter,
        select: "title description salary position location employerId experience",
        populate: { path: "employerId", select: "name" },
      })
      .sort({ appliedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Filter out applications where jobId is null (not matching search)
    const filteredApplications = applications.filter(app => app.jobId);

    // Get total count for pagination
    const totalApplications = await Application.countDocuments({
      applicantId,
    });
    // If searching, count only those matching jobs
    let totalFiltered = totalApplications;
    if (search && search.trim() !== "") {
      // Count applications with jobs matching the search
      const allApps = await Application.find({ applicantId }).populate({
        path: "jobId",
        match: jobSearchFilter,
        select: "_id",
      });
      totalFiltered = allApps.filter(app => app.jobId).length;
    }

    res.status(200).json({
      success: true,
      message: "Applied jobs fetched successfully",
      data: filteredApplications.map(app => ({
        job: {
          id: app.jobId._id,
          title: app.jobId.title,
          description: app.jobId.description,
          salary: app.jobId.salary,
          position: app.jobId.position,
          location: app.jobId.location,
          experience: app.jobId.experience,
          employerName: app.jobId.employerId?.name || "",
        },
        appliedAt: app.appliedAt,
        resumeFile: app.resumeFile,
      })),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalFiltered / limit),
        totalApplications: totalFiltered,
        hasNextPage: page * limit < totalFiltered,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Application Status Distribution
export const getApplicationStatusDistribution = async (req, res) => {
  try {
    const stats = await Application.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);
    const result = {};
    stats.forEach(({ _id, count }) => {
      result[_id] = count;
    });
    res.json({ data: result });
  } catch (err) {
    console.error("Error fetching application status distribution:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Applications by Job
export const getApplicationsByJob = async (req, res) => {
  try {
    const stats = await Application.aggregate([
      {
        $group: {
          _id: "$jobId",
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 20 // Limit to top 20 jobs for performance
      },
      {
        $lookup: {
          from: "jobs",
          localField: "_id",
          foreignField: "_id",
          as: "job"
        }
      },
      {
        $unwind: { path: "$job", preserveNullAndEmptyArrays: true }
      },
      {
        $project: {
          jobTitle: "$job.title",
          count: 1
        }
      }
    ]);
    res.json({
      data: stats.map(({ jobTitle, count, _id }) => ({
        job: jobTitle || _id?.toString() || "Unknown",
        count
      }))
    });
  } catch (err) {
    console.error("Error fetching applications by job:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Applications Submitted Over Time (by month, all years)
export const getApplicationsSubmittedOverTime = async (req, res) => {
  try {
    const stats = await Application.aggregate([
      {
        $group: {
          _id: {
            year: { $year: "$appliedAt" },
            month: { $month: "$appliedAt" }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1 }
      }
    ]);
    const result = {};
    stats.forEach(({ _id, count }) => {
      const key = `${_id.year}-${String(_id.month).padStart(2, "0")}`;
      result[key] = count;
    });
    res.json({ data: result });
  } catch (err) {
    console.error("Error fetching applications submitted over time:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get all applications (admin)
export const getAllApplications = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, sortField = "appliedAt", sortOrder = "desc" } = req.query;
    const skip = (page - 1) * limit;
    const sort = { [sortField]: sortOrder === "asc" ? 1 : -1 };

    // Find all applications with applicant and job info
    const applications = await Application.find()
      .populate({ path: "applicantId", select: "name email" })
      .populate({ path: "jobId", select: "title" })
      .sort(sort)
      .skip(Number(skip))
      .limit(Number(limit));

    const total = await Application.countDocuments();

    res.status(200).json({
      success: true,
      message: "All applications fetched successfully",
      data: applications.map(app => ({
        id: app._id,
        applicantName: app.applicantId?.name || "",
        applicantEmail: app.applicantId?.email || "",
        jobTitle: app.jobId?.title || "",
        status: app.status,
        appliedAt: app.appliedAt,
      })),
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / limit),
        totalApplications: total,
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    next(error);
  }
};