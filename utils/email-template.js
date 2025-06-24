export const generateEmailTemplate = ({
    userEmail,
    resetToken
  }) => `
  <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 0; background-color: #f4f7fa;">
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <tr>
              <td style="background-color: #76B900; text-align: center;">
                  <p style="font-size: 54px; line-height: 54px; font-weight: 800;">Sneaker Shop</p>
              </td>
          </tr>
          <tr>
              <td style="padding: 40px 30px;">                
                  <p style="font-size: 16px; margin-bottom: 25px;">Hello <strong style="color: #76B900;">${userEmail}</strong>,</p>
                  
                  <p style="font-size: 16px; margin-bottom: 25px;">Your <strong>request</strong> to reset on <strong style="color: #76B900;">Sneaker Shop</strong> (24 hours from now).</p>
                  
                  <table cellpadding="15" cellspacing="0" border="0" width="100%" style="background-color: #f0f7ff; border-radius: 10px; margin-bottom: 25px;">
                      <tr>
                          <td style="font-size: 16px; border-bottom: 1px solid #d0e3ff;">
                              <strong>Account:</strong> ${userEmail}
                          </td>
                      </tr>
                      <tr>
                          <td style="font-size: 16px;">
                              <strong>Click this:</strong> ${resetToken}
                          </td>
                      </tr>
                  </table>
                  
                  <p style="font-size: 16px; margin-bottom: 25px;">If you'd like to make changes or cancel your request, please visit your <a href="#" style="color: #4a90e2; text-decoration: none;">policy</a>.</p>
                  
                  <p style="font-size: 16px; margin-top: 30px;">Need help? <a href="#" style="color: #000; text-decoration: none;">Contact our support team</a> anytime.</p>
                  
                  <p style="font-size: 16px; margin-top: 30px;">
                      Best regards,<br>
                      <strong>The SDN Team 6</strong>
                  </p>
              </td>
          </tr>
          <tr>
              <td style="background-color: #f0f7ff; padding: 20px; text-align: center; font-size: 14px;">
                  <p style="margin: 0 0 10px;">
                      SDN Inc. | FPT University, SE1828-NJ
                  </p>
                  <p style="margin: 0;">
                      <a href="#" style="color: #4a90e2; text-decoration: none; margin: 0 10px;">Unsubscribe</a> | 
                      <a href="#" style="color: #4a90e2; text-decoration: none; margin: 0 10px;">Privacy Policy</a> | 
                      <a href="#" style="color: #4a90e2; text-decoration: none; margin: 0 10px;">Terms of Service</a>
                  </p>
              </td>
          </tr>
      </table>
  </div>
  `;