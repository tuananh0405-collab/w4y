import JobSkill from "../models/jobSkill.model.js";

export const getJobSkills = async (req, res, next) => {
  try {
    const { name, page = 1, limit = 10 } = req.query;

    const filter = {};

    if (name) filter.name = { $regex: name, $options: "i" };

    const skip = (page - 1) * limit;

    const skills = await JobSkill.find(filter)
      .sort({ createdAt: -1, priorityLevel: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalItems = await JobSkill.countDocuments(filter);
    const totalPages = Math.ceil(totalItems / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    const jobSkillList = await JobSkill.find(filter)
      .sort({ sentAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.status(200).json({
      success: true,
      message: `Fetched ${jobSkillList.length} skills successfully`,
      data: jobSkillList,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        hasNextPage,
        hasPrevPage,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createJobSkill = async (req, res, next) => {
  try {
    const { name, description } = req.body;

    const newSkill = new JobSkill({
      name,
      description,
    });

    await newSkill.save();

    res.status(201).json({
      success: true,
      message: "Job skill created successfully",
      data: newSkill,
    });
  } catch (error) {
    next(error);
  }
};

export const getJobSkillsByIds = async (req, res, next) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids)) {
      return res
        .status(400)
        .json({ success: false, message: "Skill IDs must be an array" });
    }

    const skills = await JobSkill.find({ _id: { $in: ids } });

    res.status(200).json({
      success: true,
      message: `Fetched ${skills.length} skills successfully`,
      data: skills,
    });
  } catch (error) {
    next(error);
  }
};
