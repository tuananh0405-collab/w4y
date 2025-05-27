import mongoose from "mongoose";

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
  deliveryTime: String,
  priorityLevel: {
    type: String,
    enum: ["Nổi bật", "Thông thường"],
    default: "Thông thường",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  deadline: {  // Thêm trường hạn nộp hồ sơ
    type: Date,
    required: false,  // Có thể không bắt buộc nếu bạn muốn
  },
  quantity: {  // Số lượng người tuyển dụng
    type: Number,
    // required: true,
  },
  level: {  // Cấp bậc
    type: String,
    // required: true,
  },
  industry: {  // Ngành nghề
    type: String,
    // required: true,
  },
  position: {  // Chức danh
    type: String,
    // required: true,
  },
  location: {  // Địa điểm làm việc
    type: String,
    // required: true,
  },
  experience: {  // Kinh nghiệm
    type: String,
    // required: true,
  },
});
const Job = mongoose.model("Job", jobSchema);

export default Job;

//
