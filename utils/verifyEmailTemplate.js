export const verifyEmailTemplate = ({ verificationCode }) => `
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Email Verification</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          background-color: #f4f4f4;
          margin: 0;
          padding: 0;
        }
        .container {
          width: 100%;
          max-width: 600px;
          margin: 50px auto;
          background-color: #fff;
          border-radius: 8px;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
          padding: 20px;
        }
        .header {
          text-align: center;
          background-color: #4CAF50;
          color: #fff;
          padding: 15px 0;
          border-radius: 8px 8px 0 0;
        }
        .content {
          padding: 20px;
          text-align: center;
        }
        .verification-code {
          font-size: 24px;
          font-weight: bold;
          color: #333;
          padding: 10px 20px;
          background-color: #f0f0f0;
          border-radius: 5px;
          margin-top: 20px;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          font-size: 14px;
          color: #777;
        }
        .footer a {
          color: #4CAF50;
          text-decoration: none;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>Email Verification</h2>
        </div>
        <div class="content">
          <p>Hello,</p>
          <p>Thank you for registering. Please use the following verification code to confirm your email address:</p>
          <div class="verification-code">
            ${verificationCode}
          </div>
          <p>If you did not request this, please ignore this email.</p>
        </div>
        <div class="footer">
          <p>Thank you for choosing our service!</p>
          <p>For any inquiries, feel free to <a href="mailto:support@example.com">contact us</a>.</p>
        </div>
      </div>
    </body>
  </html>
`;

