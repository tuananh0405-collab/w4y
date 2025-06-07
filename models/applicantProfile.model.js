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
  resumeFiles: [  // Thay đổi ở đây: mảng chứa nhiều file
    {
      path: String,
      contentType: String,
      uploadedAt: { type: Date, default: Date.now }  // có thể thêm trường thời gian upload
    }
  ],
});

 const ApplicantProfile = mongoose.model(
  "ApplicantProfile",
  applicantProfileSchema
);

export default ApplicantProfile;
