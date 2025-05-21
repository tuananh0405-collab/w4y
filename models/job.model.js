import mongoose from "mongoose";

// Job Schema
const jobSchema = new mongoose.Schema({
  recruiterId: {
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
    enum: ["Featured", "Regular"],
    default: "Regular",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  quantity: {
    // Số lượng người tuyển dụng
    type: Number,
    // required: true,
  },
  level: {
    // Cấp bậc
    type: String,
    // required: true,
  },
  industry: {
    // Ngành nghề
    type: String,
    // required: true,
  },
  position: {
    // Chức danh
    type: String,
    // required: true,
  },
  location: {
    // Địa điểm làm việc
    type: String,
    // required: true,
  },
  experience: {
    // Kinh nghiệm
    type: String,
    // required: true,
  },
});
const Job = mongoose.model("Job", jobSchema);

export default Job;

//
