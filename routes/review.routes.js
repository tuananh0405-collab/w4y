import { Router } from "express";
import { reviewCandidate, viewUserReviews } from "../controllers/review.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const reviewRouter = Router()

reviewRouter.post('/create/:reviewUserId', reviewCandidate)
reviewRouter.get('/list/:userId', viewUserReviews)

export default reviewRouter