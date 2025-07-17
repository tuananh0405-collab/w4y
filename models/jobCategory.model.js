import mongoose from "mongoose";
const { Schema } = mongoose;

const jobCategorySchema = new Schema(
  {
    name: { type: String, required: true, unique: true },
    parentId: { type: Schema.Types.ObjectId, ref: "JobCategory", default: null },
  },
  { timestamps: true },
);

const JobCategory = mongoose.model("JobCategory", jobCategorySchema);

export default JobCategory;
