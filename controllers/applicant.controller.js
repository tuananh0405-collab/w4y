import multer from 'multer';
import path from 'path';
import ApplicantProfile from '../models/applicantProfile.model.js';

// Cấu hình lưu file CV với multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/cvs/'); // Đảm bảo bạn có thư mục 'uploads/cvs' trong dự án
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

// Upload CV
export const uploadCV = [
  upload.single('resumeFile'),  // Đảm bảo rằng tên trường trong form-data là 'resumeFile'
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: "No file uploaded" });
      }

      // Lưu thông tin file vào cơ sở dữ liệu (với người dùng)
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

      res.status(200).json({
        success: true,
        message: "CV uploaded successfully",
        data: req.file,  // Trả về thông tin file đã tải lên
      });
    } catch (error) {
      next(error);
    }
  },
];


export const getProfile = (req, res, next) =>{}