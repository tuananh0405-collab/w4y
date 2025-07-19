import mongoose from "mongoose";
const { Schema } = mongoose;

const jobSkillSchema = new Schema(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String },
  },
  { timestamps: true },
);

const JobSkill = mongoose.model("JobSkill", jobSkillSchema);

export default JobSkill;
