import { Router } from "express";
import { checkoutPayment, syncPointsFromGoogleSheet, viewPaymentHistory } from "../controllers/payment.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { ACCOUNT_NAME, ACCOUNT_NO, BANK_ID, TEMPLATE } from "../config/env.js";

const paymentRouter = Router()

paymentRouter.post('/checkout', checkoutPayment)
paymentRouter.get("/history/:userId", viewPaymentHistory)
paymentRouter.get("/sync-vietqr",authenticate, syncPointsFromGoogleSheet); // GET: /api/payment/sync-vietqr

// Endpoint tạo VietQR
paymentRouter.post("/create-vietqr", async (req, res) => {
  const { amount, description } = req.body;

  // Kiểm tra dữ liệu đầu vào
  if (!amount || !description) {
    return res.status(400).json({ error: "Số tiền hoặc mô tả không hợp lệ" });
  }


  // Cấu trúc URL để tạo VietQR
  const vietqrUrl = `https://img.vietqr.io/image/${BANK_ID}-${ACCOUNT_NO}-${TEMPLATE}.png?amount=${amount}&addInfo=${description}&accountName=${ACCOUNT_NAME}`;

  try {
    // Trả về mã QR
    return res.json({ qr_code: vietqrUrl });
  } catch (error) {
    console.error("Error creating VietQR:", error);
    return res.status(500).json({ error: "Không thể tạo mã QR" });
  }
});


export default paymentRouter;