export const template = (
  code: string, 
  firstName: string, 
  subject: string, 
  verificationUrl?: string,
  isPasswordReset: boolean = false
) => `<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 0;
      background-color: #f4f4f4;
    }
    .email-container {
      max-width: 600px;
      margin: 20px auto;
      background-color: #ffffff;
      border: 1px solid #dddddd;
      border-radius: 8px;
      overflow: hidden;
    }
    .email-header {
      background-color: #007BFF;
      color: #ffffff;
      text-align: center;
      padding: 20px;
    }
    .email-header h1 {
      margin: 0;
      font-size: 24px;
    }
    .email-body {
      padding: 20px;
      color: #333333;
      line-height: 1.6;
    }
    .email-body h2 {
      margin-top: 0;
      color: #007BFF;
    }
    .activation-button {
      display: inline-block;
      background-color: #007BFF;
      color: #ffffff !important;
      text-decoration: none;
      padding: 10px 20px;
      border-radius: 5px;
      font-size: 16px;
      margin: 20px 0;
    }
    .activation-button:hover {
      background-color: #0056b3;
    }
    .email-footer {
      text-align: center;
      padding: 15px;
      background-color: #f4f4f4;
      font-size: 14px;
      color: #777777;
    }
    .email-footer a {
      color: #007BFF;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="email-header">
      <h1>${subject}</h1>
    </div>
    <div class="email-body">
      <h2>Hello ${firstName},</h2>
      ${isPasswordReset 
        ? `<p>You requested to reset your password. You can complete this action using one of the following methods:</p>`
        : `<p>Thank you for signing up with Route Academy. To complete your registration and start using your account, please verify your email using one of the following methods:</p>`
      }
      
      ${verificationUrl 
        ? `<div style="margin: 20px 0;">
             <h3 style="color: #007BFF; margin-bottom: 10px;">Option 1: Click the Button</h3>
             <a href="${verificationUrl}" class="activation-button">
               ${isPasswordReset ? 'Reset Password' : 'Verify Email'}
             </a>
             <p style="font-size: 12px; color: #666;">Or copy and paste this link: <br><a href="${verificationUrl}" style="color: #007BFF; word-break: break-all;">${verificationUrl}</a></p>
           </div>`
        : ''
      }
      
      ${code 
        ? `<div style="margin: 20px 0;">
             <h3 style="color: #007BFF; margin-bottom: 10px;">${verificationUrl ? 'Option 2: Use Code' : 'Use This Code'}</h3>
             <div style="background-color: #f8f9fa; border: 2px dashed #007BFF; padding: 15px; text-align: center; border-radius: 5px; margin: 10px 0;">
               <h2 style="margin: 0; color: #007BFF; font-size: 24px; letter-spacing: 3px;">${code}</h2>
             </div>
             <p style="font-size: 12px; color: #666;">Enter this code in the ${isPasswordReset ? 'password reset' : 'verification'} form.</p>
           </div>`
        : ''
      }
      
      ${verificationUrl 
        ? `<p style="font-size: 12px; color: #999; margin-top: 20px;">This link will expire in 24 hours for security reasons.</p>`
        : ''
      }
      
      <p>If you did not ${isPasswordReset ? 'request a password reset' : 'sign up for this account'}, please ignore this email.</p>
      <p>Best regards,<br>Sara7a Application Team</p>
    </div>
    <div class="email-footer">
      <p>&copy; 2024 Route Academy. All rights reserved.</p>
      <p><a href="[SupportLink]">Contact Support</a> | <a href="[UnsubscribeLink]">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>`;
