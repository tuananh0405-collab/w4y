import mongoose from "mongoose";

// Applicant Profile Schema
const applicantProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
    jobTitle: { type: String, default: '' },   // Thêm trường chức danh
  education: String,
  skills: [String],
  experience: String,
  resumeFile: {
    path: String,  // Lưu trữ đường dẫn tới tệp thay vì lưu trữ tệp trực tiếp
    contentType: String,
  },
});

 const ApplicantProfile = mongoose.model(
  "ApplicantProfile",
  applicantProfileSchema
);

export default ApplicantProfile;
