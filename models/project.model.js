import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema({
  applicantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ApplicantProfile",
    required: true,
  },
  title: { type: String, required: true },
  description: String,
  technologies: [String],
  summary: String,
  features: [String],
  duration: String,
  role: String,
  teamSize: Number,
  rating: { type: Number, min: 0, max: 5 },
  media: [
    {
      url: String,
      type: { type: String, enum: ["image", "video"], default: "image" },
    },
  ],
  status: {
    type: String,
    enum: ["featured", "draft", "archived"],
    default: "draft",
  },
  views: { type: Number, default: 0 },
  employersViewed: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

const Project = mongoose.model("Project", projectSchema);
export default Project;
