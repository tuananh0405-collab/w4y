import { Router } from "express";
import { getProfile, uploadCV } from "../controllers/applicant.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const applicantRouter = Router()

applicantRouter.post('/upload-cv',authenticate, uploadCV)
applicantRouter.get('/get-profile/:userId',authenticate, getProfile)

// router.get('/cv/:fileName', (req, res, next) => {
//     const fileName = req.params.fileName;
//     const filePath = path.join(__dirname, '..', 'uploads', 'cvs', fileName);
  
//     res.sendFile(filePath, (err) => {
//       if (err) {
//         res.status(500).send({ success: false, message: "File not found" });
//       }
//     });
//   });

//   // Lấy tệp CV bằng AJAX hoặc fetch API
// fetch(`http://localhost:3000/api/v1/applicant/cv/${fileName}`)
// .then(response => response.blob())
// .then(blob => {
//   const link = document.createElement('a');
//   link.href = URL.createObjectURL(blob);
//   link.download = fileName;  // Tên file mà frontend sẽ lưu
//   link.click();
// })
// .catch(error => console.error("Error downloading file:", error));


export default applicantRouter;