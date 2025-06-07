import { Router } from "express";
import { countApplicationsByApplicant, getProfile, searchApplicants, uploadCV} from "../controllers/applicant.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const applicantRouter = Router()

applicantRouter.post('/upload-cv',authenticate, uploadCV)
applicantRouter.get('/get-profile/:userId',authenticate, getProfile)
applicantRouter.get('/count', authenticate, countApplicationsByApplicant);

applicantRouter.get('/search', authenticate, searchApplicants);



export default applicantRouter;