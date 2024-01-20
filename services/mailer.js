const nodeMailer = require("nodemailer");
const dotEnv = require("dotenv");
dotEnv.config({ path: "../config.env" });

const transporter = nodeMailer.createTransport({
  service: "gmail",
  host: "smtp.gmail.com",
  port: 25,
  secure: false,
  tls: {
    rejectUnauthorized: false,
  },
  auth: {
    user: "meghanasmtp@gmail.com",
    pass: "rqdrrtmsqevlqbel",
  },
});

module.exports = transporter
