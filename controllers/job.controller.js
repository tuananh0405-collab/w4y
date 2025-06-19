import Job from "../models/job.model.js";
import User from "../models/user.model.js";  // Đảm bảo bạn import User model

// export const createJobPosting = async (req, res, next) => {
//   try {
//     const { title, description, requirements, salary, deliveryTime, priorityLevel } = req.body;
//     const employerId = req.user._id;  // Lấy employerId từ token của người dùng đã đăng nhập

//     // Kiểm tra xem công việc có tồn tại không
//     const existingJob = await Job.findOne({ title, employerId });

//     if (existingJob) {
//       return res.status(400).json({ message: "Job already posted" });
//     }

//     // Tạo một công việc mới
//     const newJob = new Job({
//       employerId,
//       title,
//       description,
//       requirements,
//       salary,
//       deliveryTime,
//       priorityLevel,
//     });

//     await newJob.save();

//     // Lấy thông tin nhà tuyển dụng (employerName) từ User model
//     const employer = await User.findById(employerId).select("name");  // Lấy tên nhà tuyển dụng

//     res.status(201).json({
//       success: true,
//       message: "Job posted successfully",
//       data: {
//         employerName: employer.name,
//         title: newJob.title,
//         description: newJob.description,
//         requirements: newJob.requirements,
//         salary: newJob.salary,
//         deliveryTime: newJob.deliveryTime,
//         priorityLevel: newJob.priorityLevel,
//         createdAt: newJob.createdAt,
//       },
//     });
//   } catch (error) {
//     next(error);
//   }
// };


export const createJobPosting = async (req, res, next) => {
  try {
    const { 
      title, 
      description, 
      requirements, 
      salary, 
      deliveryTime, 
      priorityLevel,
      quantity,  // Số lượng người tuyển dụng
      level,     // Cấp bậc
      industry,  // Ngành nghề
      position,  // Chức danh
      location,  // Địa điểm làm việc
      experience, // Kinh nghiệm
      deadline
    } = req.body;
    
    const employerId = req.user._id;  // Lấy employerId từ token của người dùng đã đăng nhập

    // Kiểm tra xem công việc có tồn tại không
    const existingJob = await Job.findOne({ title, employerId });

    if (existingJob) {
      return res.status(400).json({ message: "Job already posted" });
    }

    // Tạo một công việc mới
    const newJob = new Job({
      employerId,
      title,
      description,
      requirements,
      salary,
      deliveryTime,
      priorityLevel,
      quantity,     // Số lượng người tuyển dụng
      level,        // Cấp bậc
      industry,     // Ngành nghề
      position,     // Chức danh
      location,     // Địa điểm làm việc
      experience,   // Kinh nghiệm
      deadline
    });

    await newJob.save();

    // Lấy thông tin nhà tuyển dụng (employerName) từ User model
    const employer = await User.findById(employerId).select("name");  // Lấy tên nhà tuyển dụng

    res.status(201).json({
      success: true,
      message: "Job posted successfully",
      data: {
        employerName: employer.name,
        title: newJob.title,
        description: newJob.description,
        requirements: newJob.requirements,
        salary: newJob.salary,
        deliveryTime: newJob.deliveryTime,
        priorityLevel: newJob.priorityLevel,
        quantity: newJob.quantity,    // Số lượng người tuyển dụng
        level: newJob.level,          // Cấp bậc
        industry: newJob.industry,    // Ngành nghề
        position: newJob.position,    // Chức danh
        location: newJob.location,    // Địa điểm làm việc
        experience: newJob.experience, // Kinh nghiệm
        deadline: newJob.deadline,
        createdAt: newJob.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const viewJobList = async (req, res, next) => {
  try {
     const { location, position } = req.query; // Lấy location và position từ query string

    // Xây filter động nếu có location hoặc position
    const filter = {};
    if (location) filter.location = location;
    if (position) filter.position = position;

    // Lấy danh sách công việc theo filter
    const jobs = await Job.find(filter);
    // Định dạng lại danh sách công việc, thêm thông tin employerName từ User
    const formattedJobs = await Promise.all(
      jobs.map(async (job) => {
        const employer = await User.findById(job.employerId).select("name");  // Lấy tên nhà tuyển dụng
        return {
        id:job._id,
          employerName: employer?.name,
          title: job.title,
          description: job.description,
          requirements: job.requirements,
          salary: job.salary,
          deliveryTime: job.deliveryTime,
          priorityLevel: job.priorityLevel,
          createdAt: job.createdAt,
          location: job.location,
          experience: job.experience
        };
      })
    );

    // Trả về danh sách công việc đã được định dạng
    res.status(200).json({
      success: true,
      message: "Job list fetched successfully",
      data: formattedJobs,
    });
  } catch (error) {
    next(error);
  }
};

// Xem chi tiết công việc
export const viewJobDetail = async (req, res, next) => {
  try {
    const { jobId } = req.params;

    // Tìm công việc theo jobId
    const job = await Job.findById(jobId);
    const employer = await User.findById(job.employerId).select("name");  // Lấy tên nhà tuyển dụng

    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    res.status(200).json({
      success: true,
      message: "Job detail fetched successfully",
      data: {
          employerName: employer.name,
          title: job.title,
          description: job.description,
          requirements: job.requirements,
          experience: job.experience,
          salary: job.salary,
          deliveryTime: job.deliveryTime,
          priorityLevel: job.priorityLevel,
          createdAt: job.createdAt,
          deadline: job.deadline
      },
    });
  } catch (error) {
    next(error);
  }
};

// Cập nhật thông tin công việc
export const updateJob = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const { title, description, requirements, salary, deliveryTime, priorityLevel } = req.body;

    // Tìm công việc theo jobId
    const job = await Job.findById(jobId);

    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    // Cập nhật các trường của công việc
    job.title = title || job.title;
    job.description = description || job.description;
    job.requirements = requirements || job.requirements;
    job.salary = salary || job.salary;
    job.deliveryTime = deliveryTime || job.deliveryTime;
    job.priorityLevel = priorityLevel || job.priorityLevel;

    const updatedJob = await job.save();

    res.status(200).json({
      success: true,
      message: "Job updated successfully",
      data: updatedJob,
    });
  } catch (error) {
    next(error);
  }
};

// Xóa công việc
export const deleteJob = async (req, res, next) => {
  try {
    const { jobId } = req.params;

    // Tìm công việc theo jobId và xóa
    const job = await Job.findByIdAndDelete(jobId);

    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    res.status(200).json({
      success: true,
      message: "Job deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const getFilterOptions = async (req, res, next) => {
  try {
    // Lấy danh sách location duy nhất
    const locations = await Job.distinct("location");

    // Lấy danh sách position duy nhất (giả sử trường này là 'position')
    const positions = await Job.distinct("position");

    res.status(200).json({
      success: true,
      message: "Filter options fetched successfully",
      data: {
        locations,
        positions,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Endpoint lấy job theo employerId
export const getJobsByEmployer = async (req, res, next) => {
  try {
    const { employerId } = req.params; // Lấy employerId từ params URL

    // Kiểm tra employerId có hợp lệ không
    if (!employerId) {
      return res.status(400).json({
        success: false,
        message: "Employer ID is required",
      });
    }

    // Tìm job theo employerId
    const jobs = await Job.find({ employerId });

    res.status(200).json({
      success: true,
      message: `Jobs fetched for employer ${employerId}`,
      data: jobs,
    });
  } catch (error) {
    next(error);
  }
};

export const createJobs = async (req, res, next) => {
  try {
    const jobs = req.body.jobs;  // Dữ liệu là một mảng các công việc

    // Lặp qua mảng công việc và tạo từng công việc mới
    const jobPromises = jobs.map(async (job) => {
      const { 
        title, 
        description, 
        requirements, 
        salary, 
        deliveryTime, 
        priorityLevel,
        quantity, 
        level,
        industry, 
        position, 
        location, 
        experience, 
        deadline
      } = job;

      const employerId = req.user._id;

      // Kiểm tra xem công việc có tồn tại không
      const existingJob = await Job.findOne({ title, employerId });

      if (existingJob) {
        throw new Error(`Job titled "${title}" already posted.`);
      }

      // Tạo công việc mới
      const newJob = new Job({
        employerId,
        title,
        description,
        requirements,
        salary,
        deliveryTime,
        priorityLevel,
        quantity,     
        level,        
        industry,     
        position,     
        location,     
        experience,   
        deadline
      });

      await newJob.save();
    });

    // Chờ tất cả các job được tạo xong
    await Promise.all(jobPromises);

    res.status(201).json({
      success: true,
      message: "Jobs posted successfully",
    });

  } catch (error) {
    next(error);
  }
};
