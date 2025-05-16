import { Router } from "express";
import { checkoutPayment, viewPaymentHistory } from "../controllers/payment.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const paymentRouter = Router()

paymentRouter.post('/checkout', checkoutPayment)
paymentRouter.get("/history/:userId", viewPaymentHistory)

export default paymentRouter;