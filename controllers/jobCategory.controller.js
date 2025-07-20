import { Types } from "mongoose";
import JobCategory from "../models/jobCategory.model.js";

export const getJobCategoriesByParent = async (req, res, next) => {
  try {
    const { parentId } = req.params;
    let filter;
    if (Types.ObjectId.isValid(parentId)) {
      filter = { parentId: Types.ObjectId.createFromHexString(parentId) };
    } else {
      filter = { parentId: null };
    }

    const jobCategories =
      await JobCategory.find(filter).select("_id name parentId");

    res.status(200).json({
      success: true,
      message: `Fetched ${jobCategories.length} job category/categories successfully`,
      data: jobCategories,
    });
  } catch (error) {
    next(error);
  }
};

export const getJobCategoriesRecursive = async (req, res, next) => {
  try {
    const { categoryId } = req.params;

    const result = await jobCategoriesRecursiveRoutine(
      Types.ObjectId.createFromHexString(categoryId),
    );

    res.status(200).json({
      success: true,
      message: `Fetched job category/categories recursively successfully`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const jobCategoriesRecursiveRoutine = async (categoryId) => {
  try {
    const category = await JobCategory.findById(categoryId)
      .select("_id name parentId")
      .lean();
    if (!category) return null;

    const children = await JobCategory.find({ parentId: categoryId })
      .select("_id name parentId")
      .lean();

    const childrenTree = await Promise.all(
      children
        .map((child) => jobCategoriesRecursiveRoutine(child._id))
        .filter((child) => !!child),
    );

    return {
      ...category,
      children: childrenTree,
    };
  } catch (error) {
    console.error(error);
  }
};

export const createJobCategory = async (req, res, next) => {
  try {
    const { name, parentId } = req.body;
    const newJobCategory = new JobCategory({
      name,
      parentId: parentId || null,
    });
    const savedJobCategory = await newJobCategory.save();
    res.status(201).json({
      success: true,
      message: "Job category created successfully",
      data: savedJobCategory,
    });
  } catch (error) {
    next(error);
  }
};
