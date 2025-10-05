import { EventEmitter } from "node:events";
import path from "node:path";
import { sendEmail } from "./sendEmail.utils";
import { template } from "./sendEmailTemplate";
import { EmailEventEnums } from "./enums";

export const emailEvent = new EventEmitter();

interface EmailEventData {
  type: EmailEventEnums;
  to: string;
  code?: string; // Optional for token-based emails
  token?: string; // Optional for token-based emails
  verificationUrl?: string; // Optional for token-based emails
  name?: string | undefined;
  subject: string;
}

emailEvent.on("email", async (data: EmailEventData) => {
  const { to, code, token, verificationUrl, name, subject, type } = data;
  const safeName = name ?? "";
  const baseUrl = process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`;

  let textByType: string;
  let htmlContent: string;
  let isPasswordReset = false;

  // Handle different email types
  switch (type) {
    case EmailEventEnums.CONFIRM_EMAIL:
      if (verificationUrl) {
        // Both options available
        const emailVerificationUrl = verificationUrl || `${baseUrl}/verify-email?token=${token}&email=${encodeURIComponent(to)}`;
        textByType = `Please confirm your email. You can use the OTP code: ${code} or click the link: ${emailVerificationUrl}`;
        htmlContent = template(code || "", safeName, subject, emailVerificationUrl, false);
      } else {
        // OTP only
        textByType = `Please confirm your email using the OTP code: ${code}`;
        htmlContent = template(code || "", safeName, subject, undefined, false);
      }
      break;
    
    case EmailEventEnums.FORGET_PASSWORD:
      isPasswordReset = true;
      if (verificationUrl) {
        // Both options available
        const passwordResetUrl = verificationUrl || `${baseUrl}/reset-password?token=${token}&email=${encodeURIComponent(to)}`;
        textByType = `You requested to reset your password. You can use the OTP code: ${code} or click the link: ${passwordResetUrl}`;
        htmlContent = template(code || "", safeName, subject, passwordResetUrl, isPasswordReset);
      } else {
        // OTP only
        textByType = `You requested to reset your password. Use this OTP code: ${code}`;
        htmlContent = template(code || "", safeName, subject, undefined, isPasswordReset);
      }
      break;
    
    // Keep the token-specific types for backward compatibility (if used elsewhere)
    case EmailEventEnums.CONFIRM_EMAIL_TOKEN:
      const emailVerificationUrl = verificationUrl || `${baseUrl}/verify-email?token=${token}&email=${encodeURIComponent(to)}`;
      textByType = `Please confirm your email. You can use the OTP code: ${code} or click the link: ${emailVerificationUrl}`;
      htmlContent = template(code || "", safeName, subject, emailVerificationUrl, false);
      break;
    
    case EmailEventEnums.FORGET_PASSWORD_TOKEN:
      isPasswordReset = true;
      const passwordResetUrl = verificationUrl || `${baseUrl}/reset-password?token=${token}&email=${encodeURIComponent(to)}`;
      textByType = `You requested to reset your password. You can use the OTP code: ${code} or click the link: ${passwordResetUrl}`;
      htmlContent = template(code || "", safeName, subject, passwordResetUrl, isPasswordReset);
      break;
    
    default:
      textByType = `Please use the provided code: ${code}`;
      htmlContent = template(code || "", safeName, subject, undefined, false);
  }

  await sendEmail({
    to,
    subject,
    html: htmlContent,
    text: textByType,
    cc: "yahia.zakaria.sherif@gmail.com",
    bcc: "yahia.zakaria.sherif@gmail.com",
    attachments: [
      {
        filename: "sendMailData.txt",
        path: path.resolve(".", "sendMailData.txt"),
      },
    ],
  });
});