import multer from 'multer';
import path from 'path';
import Application from "../models/application.model.js";
import Job from "../models/job.model.js";
import ApplicantProfile from "../models/applicantProfile.model.js";

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
