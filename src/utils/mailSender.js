// utils/mailSender.js
import { createTransport } from 'nodemailer';

async function mailSender(email, title, body) {
  try {
    // Create a Transporter to send emails
    let transporter = createTransport({
      host: process.env.MAIL_HOST,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      }
    });
    console.log("Pass : ",process.env.MAIL_PASS)
    // Send emails to users
    let info = await transporter.sendMail({
      from: process.env.MAIL_USER,
      to: email,
      subject: title,
      html: body,
    });
    console.log("Email info: ", info);
    return info;
  } catch (error) {
    console.log(error.message);
  }
};

export default mailSender;