import { EventEmitter } from "node:events";
import path from "node:path";
import { sendEmail } from "./sendEmail.utils";
import { template } from "sendEmailTemplate";
import { EmailEventEnums } from "./enums";

export const emailEvent = new EventEmitter();

interface EmailEventData {
  type: EmailEventEnums;
  to: string;
  code: string;
  name?: string | undefined;
  subject: string;
}

emailEvent.on("email", async (data: EmailEventData) => {
  const { to, code, name, subject, type } = data;
  const safeName = name ?? "";
  const baseUrl = process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`;

  const textByType =
    type === EmailEventEnums.CONFIRM_EMAIL
      ? `Please confirm your email by clicking on the link: ${baseUrl}/confirm-email/${to}`
      : `You requested to reset your password. Use the code provided or click the link: ${baseUrl}/reset-password/${to}`;

  await sendEmail({
    to,
    subject,
    html: template(code, safeName, subject),
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