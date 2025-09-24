import nodemailer, { SentMessageInfo } from "nodemailer";
import { EmailSubjects } from "./enums";

export interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
  cc?: string;
  bcc?: string;
  attachments?: Array<{
    filename: string;
    path: string;
    cid?: string;
    content?: string | Buffer;
    encoding?: string;
    contentType?: string;
  }>;
}

export const sendEmail = async ({
  to = "",
  subject = EmailSubjects.WELCOME,
  text = "",
  html = "",
  cc = "",
  bcc = "",
  attachments = [],
}: EmailOptions): Promise<boolean> => {
  const transporter = nodemailer.createTransport({
    service: process.env.SMTP_SERVICE,
    // host: "smtp.gmail.com",
    // port: 465,
    secure: true,
    // host: process.env.SMTP_HOST || "smtp.ethereal.email",
    // port: parseInt(process.env.SMTP_PORT || "587"),
    // secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.APP_EMAIL,
      pass: process.env.APP_PASSWORD,
    },
  });

  const options: EmailOptions = {
    from: `"${process.env.APP_NAME || "System"}" <${process.env.APP_EMAIL}>`,
    to,
    subject,
    text,
    html,
    cc,
    bcc,
    attachments,
  };
  try {
    const info: SentMessageInfo = await transporter.sendMail(options);
    console.log("Message sent: %s", info.messageId);
    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
};
