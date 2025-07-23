import multer from "multer";
import path from "path";
import fs from "fs/promises";
import ApplicantProfile from "../models/applicantProfile.model.js";
import Application from "../models/application.model.js";
import User from "../models/user.model.js";
import cloudinary from "../config/cloudinary.js";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import { console } from "inspector";
import convertApi from "../config/convertdocx.js";
import os from "os";
import { v4 as uuidv4 } from "uuid";
import Project from '../models/project.model.js';
import connectS3 from "../config/aws-s3.js";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";

const s3Client = connectS3();

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    resource_type: "raw",
    access_mode: "public", // Đặt chế độ truy cập là công khai
    public_id: (req, file) => {
      const ext = path.extname(file.originalname);
      const baseName = path.parse(file.originalname).name;
      // Sanitize tên file để chỉ chứa ký tự an toàn
      const safeName = baseName
        .replace(/\s+/g, "_")
        .replace(/[^a-zA-Z0-9_-]/g, "");
      return `${req.user._id}-${safeName}-${Date.now()}${ext}`;
    },
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /pdf|docx|txt|document/;
  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase()
  );
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error("Only PDF, DOCX, and TXT files are allowed!"));
  }
};

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // Giới hạn kích thước file tối đa (5MB)
});

// Upload CV của ứng viên vào folder riêng trên Cloudinary
export const uploadCV = [
  upload.single("resumeFile"),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res
          .status(400)
          .json({ success: false, message: "No file uploaded" });
      }

      // Kiểm tra định dạng file
      const ext = path.extname(req.file.originalname).toLowerCase();
      const baseName = path
        .parse(req.file.originalname)
        .name.replace(/\s+/g, "_")
        .replace(/[^a-zA-Z0-9_-]/g, "");
      const timestamp = Date.now();
      const publicId = `${req.user._id}-${baseName}-${timestamp}`;

      let bufferToUpload = req.file.buffer;

      if (ext === ".docx" || ext === ".txt") {
        console.log(`Converting ${ext} file to PDF`);

        const tmpDir = os.tmpdir(); // dùng thư mục tạm an toàn trên mọi OS để lưu file tạm
        const tmpInputPath = path.join(tmpDir, `${uuidv4()}${ext}`); // Tạo tên file
        // Ghi file tạm vào hệ thống tạm để ConvertAPI có thể truy cập
        await fs.writeFile(tmpInputPath, req.file.buffer);

        // Sử dụng ConvertAPI để chuyển đổi file
        const result = await convertApi.convert(
          "pdf",
          {
            File: tmpInputPath,
          },
          ext.slice(1)
        ); // sẽ là "docx" hoặc "txt"

        // Tải file PDF đã chuyển đổi về bộ nhớ
        console.log("ConvertAPI result:", result);
        const response = await fetch(result.response.Files[0].Url);
        if (!response.ok) {
          throw new Error(
            `Failed to download converted file: ${response.statusText}`
          );
        }
        // Chuyển đổi response thành buffer
        bufferToUpload = Buffer.from(await response.arrayBuffer());

        // Xoá file tạm
        await fs.unlink(tmpInputPath);
      }
      // Upload file lên cloudinary với định dạng PDF lưu ở trong buffer
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          public_id: publicId,
          format: "pdf",
          resource_type: "raw",
          access_mode: "public",
        },
        async (error, result) => {
          if (error) return next(error);

          const applicantProfile = await ApplicantProfile.findOne({
            userId: req.user._id,
          });
          const fileInfo = {
            path: result.secure_url,
            contentType: "application/pdf",
            uploadedAt: new Date(),
          };
          if (applicantProfile) {
            applicantProfile.resumeFiles.push(fileInfo);
            await applicantProfile.save();
          } else {
            await new ApplicantProfile({
              userId: req.user._id,
              resumeFiles: [fileInfo],
            }).save();
          }

          res.status(200).json({
            success: true,
            message: "CV uploaded and converted successfully",
            data: applicantProfile ? applicantProfile.resumeFiles : [fileInfo],
          });
        }
      );

      uploadStream.end(bufferToUpload);
    } catch (error) {
      next(error);
    }
  },
];

// Lấy các CV đã tải lên của ứng viên
export const getUploadedCVs = async (req, res, next) => {
  try {
    const applicantProfile = await ApplicantProfile.findOne({
      userId: req.user._id,
    });

    if (!applicantProfile) {
      return res.status(200).json({
        success: true,
        message: "Applicant profile not found, returning empty list",
        data: [],
      });
    }

    res.status(200).json({
      success: true,
      message: "Uploaded CVs fetched successfully",
      data: applicantProfile.resumeFiles,
    });
  } catch (error) {
    next(error);
  }
};

// Xóa CV đã tải lên của ứng viên
export const deleteUploadedCV = async (req, res, next) => {
  try {
    const { cvId } = req.params; // Lấy ID của CV từ tham số URL

    const applicantProfile = await ApplicantProfile.findOne({
      userId: req.user._id,
    });

    if (!applicantProfile) {
      return res
        .status(404)
        .json({ success: false, message: "Applicant profile not found" });
    }
    // Tìm và xóa CV trên Cloudinary
    const cvToDelete = applicantProfile.resumeFiles.find(
      (cv) => cv._id.toString() === cvId
    );
    if (cvToDelete) {
      const publicId = cvToDelete.path.split("/").pop(); // Lấy public_id từ đường dẫn
      // Xóa file trên Cloudinary
      await cloudinary.uploader.destroy(publicId, { resource_type: "raw" });
    }
    // Tìm và xóa CV trong mảng resumeFiles
    applicantProfile.resumeFiles = applicantProfile.resumeFiles.filter(
      (cv) => cv._id.toString() !== cvId
    );

    await applicantProfile.save();

    res.status(200).json({
      success: true,
      message: "Uploaded CV deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

// Lấy thông tin hồ sơ của ứng viên
export const getProfile = async (req, res, next) => {
  try {
    const applicantId = req.user._id; // Lấy applicantId từ JWT
    const applicantProfile = await ApplicantProfile.findOne({ userId: applicantId }).populate("userId", "name email phone district city");

    if (!applicantProfile) {
      const newProfile = new ApplicantProfile({
        userId: applicantId,
      });
      await newProfile.save();

      res.status(200).json({
        success: true,
        message: "Profile fetched successfully",
        data: newProfile,
      });
    }

    res.status(200).json({
      success: true,
      message: "Profile fetched successfully",
      data: applicantProfile,
    });
  } catch (error) {
    next(error);
  }
};


// Cập nhật hồ sơ của ứng viên
export const updateProfile = async (req, res, next) => {
  try {
    const {
      jobTitle,
      skills,
      userDetail,
      level,
      education,
      experience,
      openToWork,
      timeWork
    } = req.body;

    const updateData = {
      jobTitle,
      skills,
      userDetail,
      level,
      education,
      experience,
      openToWork,
      timeWork
    };

    const updatedProfile = await ApplicantProfile.findOneAndUpdate(
      { userId: req.user._id },
      { $set: updateData },
      { new: true }
    );

    if (!updatedProfile) {
      return res.status(404).json({
        success: false,
        message: "Applicant profile not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: updatedProfile,
    });
  } catch (error) {
    next(error);
  }
};

// Đếm số dự án đã ứng tuyển của applicant hiện tại
export const countApplicationsByApplicant = async (req, res, next) => {
  try {
    const applicantId = req.user._id; // Lấy applicantId từ JWT

    const count = await Application.countDocuments({ applicantId });

    res.status(200).json({
      success: true,
      message: "Count of applications fetched successfully",
      data: { totalApplications: count },
    });
  } catch (error) {
    next(error);
  }
};

// Tìm kiếm ứng viên
export const searchApplicants = async (req, res, next) => {
  try {
    // Kiểm tra accountType của người dùng
    if (req.user.accountType !== "Nhà Tuyển Dụng") {
      return res.status(403).json({
        success: false,
        message: "Chỉ nhà tuyển dụng mới có thể tìm kiếm ứng viên.",
      });
    }

    const { jobTitle, skills, experience, location } = req.query;

    // Xây dựng điều kiện tìm kiếm
    const query = {};

    if (jobTitle) {
      query["profile.jobTitle"] = { $regex: jobTitle, $options: "i" }; // Tìm kiếm không phân biệt chữ hoa/thường
    }

    if (skills) {
      query["profile.skills"] = { $regex: skills, $options: "i" };
    }

    if (experience) {
      query["profile.experience"] = { $regex: experience, $options: "i" };
    }

    if (location) {
      query["profile.city"] = { $regex: location, $options: "i" };
    }

    // Tìm ứng viên với các điều kiện trên
    const applicants = await User.aggregate([
      {
        $match: { accountType: "Ứng Viên" }, // Lọc để chỉ trả về ứng viên
      },
      {
        $lookup: {
          from: "applicantprofiles", // Kết nối với collection applicantProfiles
          localField: "_id", // Sử dụng _id từ bảng users
          foreignField: "userId", // Liên kết với trường userId trong applicantProfiles
          as: "profile",
        },
      },
      {
        $unwind: { path: "$profile", preserveNullAndEmptyArrays: true }, // Tránh trường hợp không có profile
      },
      {
        $match: query, // Áp dụng các điều kiện tìm kiếm
      },
      {
        $project: {
          // Chỉ lấy các trường cần thiết
          _id: 0,
          name: 1,
          "profile.jobTitle": 1, // Lấy thông tin jobTitle từ profile
          "profile.experience": 1, // Lấy thông tin experience từ profile
          "profile.skills": 1, // Lấy thông tin experience từ profile
          city: 1,
        },
      },
    ]);

    res.status(200).json({
      success: true,
      message: "Danh sách ứng viên được tìm thấy.",
      data: applicants,
    });
  } catch (error) {
    next(error);
  }
};

// Tạo mới một project
export const createProject = [
  // upload.array('mediaFiles'), // Sử dụng multer để upload nhiều file
  async (req, res, next) => {
    try {
      const applicantProfile = await ApplicantProfile.findOne({ userId: req.user._id });

    if (!applicantProfile) {
      return res.status(404).json({ success: false, message: "Applicant profile not found" });
    }

    const newProject = new Project({
      ...req.body,
      applicantId: applicantProfile._id,
    });

    await newProject.save();

    res.status(201).json({
      success: true,
      message: "Project created successfully",
      data: newProject,
    });
  } catch (error) {
    next(error);
  }
}];

// Lấy tất cả project của applicant hiện tại
export const getMyProjects = async (req, res, next) => {
  try {
    const applicantProfile = await ApplicantProfile.findOne({ userId: req.user._id });
    if (!applicantProfile) {
      return res.status(404).json({ success: false, message: "Applicant profile not found" });
    }

    const projects = await Project.find({ applicantId: applicantProfile._id });
    console.log(applicantProfile._id);
    res.status(200).json({
      success: true,
      message: "Fetched user projects successfully",
      data: projects,
    });
  } catch (error) {
    next(error);
  }
};

// Cập nhật project
export const updateProject = async (req, res, next) => {
  try {
    const { projectId } = req.params;

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    // Kiểm tra quyền sở hữu
    const applicantProfile = await ApplicantProfile.findOne({ userId: req.user._id });
    if (!applicantProfile || !project.applicantId.equals(applicantProfile._id)) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    Object.assign(project, req.body);
    await project.save();

    res.status(200).json({ success: true, message: "Project updated", data: project });
  } catch (error) {
    next(error);
  }
};

// Xoá project
export const deleteProject = async (req, res, next) => {
  try {
    const { projectId } = req.params;

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    for (const media of project.media) {
      const key = media.url.split("amazonaws.com/")[1];
      if (key) {
        await s3Client.send(new DeleteObjectCommand({ Bucket: "career-shift", Key: key }));
      }
    }

    const applicantProfile = await ApplicantProfile.findOne({ userId: req.user._id });
    if (!applicantProfile || !project.applicantId.equals(applicantProfile._id)) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    await project.deleteOne();

    res.status(200).json({ success: true, message: "Project deleted" });
  } catch (error) {
    next(error);
  }
};
