import axios from "axios";
import User from "../models/user.model.js";
import TransactionLog from "../models/transactionLog.model.js";
import { EMAIL_ACCOUNT, GOOGLE_SCRIPT_VIETQR_URL } from "../config/env.js";
import transporter from "../config/nodemailer.js";

export const syncPointsFromGoogleSheet = async (req, res) => {
  try {
    const userId = req.user._id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized, userId missing" });
    }

    // Gọi API Google Script để lấy dữ liệu
    const response = await axios.get(GOOGLE_SCRIPT_VIETQR_URL);
    const transactions = response.data.data;

    if (!Array.isArray(transactions)) {
      return res.status(400).json({ message: "Không có giao dịch" });
    }

    // Lặp qua các giao dịch
    for (const tx of transactions) {
      const { "Mã GD": id, "Mô tả": description, "Giá trị": amount } = tx;

      // Kiểm tra xem giao dịch đã xử lý chưa (dựa trên "Mã GD")
      const existed = await TransactionLog.findOne({ transactionId: id });
      if (existed) continue; // Nếu đã xử lý thì bỏ qua

      // Kiểm tra mô tả có phải là giao dịch "Nap X diem W4U"
      const match = description.match(/Nap\s+(\d+)\s+diem\s+W4U/i);
      if (!match) continue; // Nếu không phải giao dịch "Nap X diem W4U", bỏ qua

      // Lấy số điểm
      const points = parseInt(match[1]);

      // Tìm người dùng trong database bằng userId (không dùng email từ mô tả nữa)
      const user = await User.findById(userId);
      if (!user) continue; // Nếu không tìm thấy user, bỏ qua

      console.log('====================================');
      console.log(user);
      console.log('====================================');
      // Cộng điểm cho người dùng
      user.points += points;
      await user.save();


      // Ghi log giao dịch vào TransactionLog
      await TransactionLog.create({
        transactionId: id,
        description,
        amount,
      });

      console.log(`Giao dịch ${id} đã được xử lý và cộng ${points} điểm cho user ${userId}`);
    }

    console.log("✅ Đồng bộ giao dịch VietQR thành công");
    return res.json({ message: "Đồng bộ giao dịch VietQR thành công" });
  } catch (err) {
    console.error("❌ Lỗi đồng bộ VietQR:", err.message);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};


export const checkoutPayment = (req, res, next) => {}

export const viewPaymentHistory = (req, res, next) => {}