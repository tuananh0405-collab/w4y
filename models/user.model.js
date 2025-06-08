// Import dependencies
import mongoose from 'mongoose';

// User Schema
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  accountType: {
    type: String,
    enum: ['Nhà tuyển dụng', 'Ứng viên'],
    required: true,
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  isVerified: { type: Boolean, default: false }, 
  verificationCode: String, 
  gender: {  // Thêm trường giới tính
    type: String,
    enum: ['male', 'female'],
  },
  phone: {  // Thêm trường số điện thoại
    type: String,
  },
  company: {  // Thêm trường công ty
    type: String,
  },
  city: {  // Thêm trường tỉnh/thành phố
    type: String,
  },
  district: {  // Thêm trường quận/huyện
    type: String,
  }
});
 const User = mongoose.model('User', userSchema);
 export default User;