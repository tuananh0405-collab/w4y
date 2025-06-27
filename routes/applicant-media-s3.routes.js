import { Router } from "express";
import { getPresignedUrl, deleteMediaFromS3 } from "../controllers/applicant-media-s3.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import multer from "multer";

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const mediaRouter = Router()

mediaRouter.post('/presign', authenticate, upload.array("media", 10), getPresignedUrl)
mediaRouter.post('/remove', authenticate, deleteMediaFromS3)

export default mediaRouter;