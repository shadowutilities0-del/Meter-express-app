const nodemailer = require('nodemailer');

// Uses the GMAIL_USER / GMAIL_APP_PASSWORD already set in .env.
// GMAIL_APP_PASSWORD must be a Gmail "App Password" (Google Account ->
// Security -> 2-Step Verification -> App passwords), not your normal
// Gmail login password -- Gmail blocks plain-password SMTP logins.
//
// Gmail shows app passwords with spaces for readability (e.g.
// "abcd efgh ijkl mnop"); we strip whitespace here so it doesn't matter
// whether you paste it with or without the spaces.
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: (process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, ''),
  },
});

// options: { to, subject, html, text }
const sendEmail = async (options) => {
  const message = {
    from: process.env.GMAIL_USER,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
  };

  await transporter.sendMail(message);
};

module.exports = sendEmail;