const nodemailer = require("nodemailer");
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com", // Or use the server IP if given: 172.93.223.239
  port: 587, // Use 465 for SSL (recommended)
  secure: false, // true for port 465, false for 587
  auth: {
    user: "fivliaindia@gmail.com", // Your no-reply email
    pass: "xybmyypjxwyeldgl",
  },
    tls: {
    rejectUnauthorized: false,
  },

});

const sendVerificationEmail = async (to, subject, html) => {
  await transporter.sendMail({
    from: "India College Fest <fivliaindia@gmail.com>",
    to,
    subject,
    html,
  });
};

module.exports = {
  sendVerificationEmail,
};
