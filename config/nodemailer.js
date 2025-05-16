import nodemailer from "nodemailer";

import { EMAIL_PASSWORD, EMAIL_ACCOUNT } from "./env.js";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: EMAIL_ACCOUNT,
    pass: EMAIL_PASSWORD,
  },
});

export default transporter;
