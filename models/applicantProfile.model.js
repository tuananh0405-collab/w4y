import mongoose from "mongoose";

// Applicant Profile Schema
const applicantProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  jobTitle: { type: String, default: '' },   // Thêm trường chức danh
  skills: [String], // Deprecated, kept to prevent conflicts
  skillIds: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JobSkill",
    },
  ],
  resumeFiles: [  // Thay đổi ở đây: mảng chứa nhiều file
    {
      path: String,
      contentType: String,
      uploadedAt: { type: Date, default: Date.now }, // có thể thêm trường thời gian upload
    },
  ],
  userDetail: String,
  level: String,
  education: [
    {
      school: String,
      fieldOfStudy: String,
      startDate: Date,
      endDate: Date
    }
  ],
  experience: [
    {
      company: String,
      position: String,
      startDate: Date,
      endDate: Date
    }
  ],
  openToWork: Boolean,
  timeWork: {
    type: String,
    enum: ["full-time", "part-time", "freelance"],
    default: "full-time"
  }
});

const ApplicantProfile = mongoose.model(
  "ApplicantProfile",
  applicantProfileSchema,
);

export default ApplicantProfile;
