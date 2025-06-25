// POST /api/v1/media/presign
import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from "uuid";
import connectS3 from "../config/aws-s3.js";

const bucketName = "career-shift";
const region = "ap-south-1";

export const getPresignedUrl = async (req, res, next) => {
  try {
    const { fileName, fileType } = req.body;
    console.log(fileName + fileType )
    if (!fileName || !fileType ) {
      return res.status(400).json({ error: "Missing fileName or fileType" });
    }

    const extension = fileName.split(".").pop();
    const key = `${uuidv4()}.${extension}`;

    const s3Client = connectS3();

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: fileType,
      ACL: "public-read", // optional

    });

    const url = await getSignedUrl(s3Client, command, { expiresIn: 60 }); // 60s

    return res.status(200).json({
      url,
      key,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteMediaFromS3 = async (req, res, next) => {
  try {
    const { key } = req.body;
    if (!key) return res.status(400).json({ error: "Missing S3 key" });

    const s3 = connectS3();
    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    await s3.send(command);
    res.status(200).json({ message: "Deleted from S3" });
  } catch (error) {
    next(error);
  }
};



