import mongoose from "mongoose";

export const levelEnum = [
  "Nhân viên",
  "Trưởng nhóm",
  "Trưởng/Phó phòng",
  "Quản lý / Giám sát",
  "Trưởng chi nhánh",
  "Phó giám đốc",
  "Giám đốc",
  "Thực tập sinh",
];

export const experienceEnum = [
  "Không yêu cầu",
  "Dưới 1 năm",
  "1 năm",
  "2 năm",
  "3 năm",
  "4 năm",
  "5 năm",
  "Trên 5 năm",
];

// Salary range unit enum
export const salaryRangeUnitEnum = [
  "triệu VND/tháng",
  "triệu VND/năm",
  "USD/tháng",
  "USD/năm",
];

// Job Schema
const jobSchema = new mongoose.Schema({
  employerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  description: String,
  requirements: String,
  salary: String,
  // Salary Range
  salaryRange: {
    start: { type: Number }, // Start of salary range
    end: { type: Number }, // End of salary range
  },
  salaryRangeUnit: {
    type: String,
    enum: salaryRangeUnitEnum,
    default: "VND/tháng",
  },
  deliveryTime: String,
  priorityLevel: {
    type: String,
    enum: ["Nổi bật", "Thông thường"],
    default: "Thông thường",
  },
  // New fields for enhanced functionality
  status: {
    type: String,
    enum: ["active", "inactive", "pending", "approved", "rejected", "flagged"],
    default: "active",
  },
  isHidden: {
    type: Boolean,
    default: false,
  },
  views: {
    type: Number,
    default: 0,
  },
  keywords: [String], // For search functionality
  skillIds: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JobSkill",
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  // Thêm trường hạn nộp hồ sơ
  deadline: {
    type: Date,
    required: false, // Có thể không bắt buộc nếu bạn muốn
  },
  // Số lượng người tuyển dụng
  quantity: {
    type: Number,
    // required: true,
  },
  level: {
    type: String,
    enum: levelEnum,
    default: null,
  },
  // Lĩnh vực
  industry: {
    type: String,
    // required: true,
  },
  // Chức danh
  position: {
    type: String,
    // required: true,
  },
  // Địa điểm làm việc
  location: {
    type: String,
    // required: true,
  },
  // Kinh nghiệm
  experience: {
    type: String,
    enum: experienceEnum,
    default: null,
  },
  // Danh mục/Lĩnh vực nghề
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "JobCategory",
    required: true,
  },
});

// Index for better search performance
jobSchema.index({ title: "text", description: "text", requirements: "text" });
jobSchema.index({ status: 1, isHidden: 1 });
jobSchema.index({ employerId: 1 });
jobSchema.index({ deadline: 1 });
jobSchema.index({ categoryId: 1 });
jobSchema.index({ location: 1 });
jobSchema.index({ skillIds: 1 });

const Job = mongoose.model("Job", jobSchema);

export default Job;

//
