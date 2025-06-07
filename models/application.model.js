import mongoose from 'mongoose';

const applicationSchema = new mongoose.Schema({
  applicantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Job",
    required: true,
  },
  status: {
    type: String,
    enum: ["Pending", "Phỏng vấn", 'Từ chối', 'Mới nhận'],
    default: "Pending",
  },
  appliedAt: {
    type: Date,
    default: Date.now,
  },
  resumeFile: {  // Thêm trường để lưu thông tin CV
    path: String,   // Lưu đường dẫn tới CV
    contentType: String,   // Lưu loại nội dung (application/pdf, application/msword...)
  },
});

const Application = mongoose.model("Application", applicationSchema);

export default Application;
