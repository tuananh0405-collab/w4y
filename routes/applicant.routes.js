import { Router } from "express";
import { countApplicationsByApplicant, getProfile, searchApplicants, uploadCV, getUploadedCVs, deleteUploadedCV, createProject, getMyProjects, updateProject, deleteProject, updateProfile } from "../controllers/applicant.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const applicantRouter = Router()

applicantRouter.post('/upload-cv',authenticate, uploadCV)
applicantRouter.get('/get-uploaded-cvs', authenticate, getUploadedCVs); 
applicantRouter.delete('/uploaded-cv/:cvId', authenticate, deleteUploadedCV);
applicantRouter.get('/get-profile/:userId',authenticate, getProfile)
applicantRouter.put('/update-profile',authenticate, updateProfile)
applicantRouter.get('/count', authenticate, countApplicationsByApplicant);

applicantRouter.get('/search', authenticate, searchApplicants);

applicantRouter.post("/projects", authenticate, createProject);
applicantRouter.get("/projects", authenticate, getMyProjects);
applicantRouter.put("/projects/:projectId", authenticate, updateProject);
applicantRouter.delete("/projects/:projectId", authenticate, deleteProject);



export default applicantRouter;