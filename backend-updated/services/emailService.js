// server/emailService.js
//
// Central place for every transactional email Meter Express sends.
// Uses Nodemailer over Gmail SMTP, authenticated with a Google App
// Password (requires 2-Step Verification to be enabled on the Gmail
// account — see https://myaccount.google.com/apppasswords).
//
//   npm install nodemailer
//
// .env needs:
//   GMAIL_USER=youraccount@gmail.com
//   GMAIL_APP_PASSWORD=abcdefghijklmnop   (16 chars, no spaces)
//   ADMIN_NOTIFICATION_EMAIL=admin@meterexpress.co.uk
//   APP_URL=https://your-production-domain.com

const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

// Optional: verify the connection once on startup so a bad app password
// or misconfigured .env shows up in your server logs immediately instead
// of silently failing the first time a customer submits an application.
transporter.verify((err) => {
  if (err) console.error('Nodemailer/Gmail connection failed:', err.message);
  else console.log('Nodemailer/Gmail ready to send email.');
});

const FROM_EMAIL = process.env.GMAIL_USER; // Gmail requires sending "from" the authenticated address
const ADMIN_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL || process.env.GMAIL_USER;

// Small shared wrapper: log failures instead of throwing, so an email
// problem never breaks the actual application-creation request. Email is
// a nice-to-have notification, not something that should be able to fail
// the customer's submission.
async function sendMail({ to, subject, html }) {
  try {
    const info = await transporter.sendMail({
      from: `"Meter Express" <${FROM_EMAIL}>`,
      to,
      subject,
      html,
    });
    return info;
  } catch (err) {
    console.error('Email send failed:', err.message);
    return null;
  }
}

// ---------------------------------------------------------------------
// Shared layout wrapper — keep every email visually consistent
// ---------------------------------------------------------------------
function layout(bodyHtml) {
  return `
  <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; color: #1E2422;">
    <div style="margin-bottom: 24px;">
      <span style="font-size: 18px; font-weight: 700; color: #1E2422;">Meter Express</span>
    </div>
    ${bodyHtml}
    <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #EDEFEF; font-size: 12px; color: #8A938D;">
      This is an automated message from Meter Express. Please do not reply directly to this email.
    </div>
  </div>`;
}

function button(href, label) {
  return `<a href="${href}" style="display:inline-block; background:#2563EB; color:#ffffff; text-decoration:none; font-weight:600; font-size:14px; padding:10px 20px; border-radius:6px; margin-top:16px;">${label}</a>`;
}

// ---------------------------------------------------------------------
// 1. Customer confirmation — sent the moment they submit an application
// ---------------------------------------------------------------------
async function sendApplicationSubmittedToCustomer(application) {
  const { applicantName, applicantEmail, ref, type, utility, property, postcode } = application;

  const html = layout(`
    <h1 style="font-size:20px; margin:0 0 12px;">Application received</h1>
    <p style="font-size:14px; line-height:1.6; color:#525F58;">
      Hi ${applicantName || 'there'}, thanks for submitting your ${type} request for ${utility}.
      We've received it and one of our team will begin reviewing it shortly.
    </p>
    <table style="width:100%; font-size:14px; margin:20px 0; border-collapse:collapse;">
      <tr><td style="padding:6px 0; color:#8A938D;">Reference</td><td style="padding:6px 0; font-weight:600;">${ref}</td></tr>
      <tr><td style="padding:6px 0; color:#8A938D;">Request type</td><td style="padding:6px 0;">${type} — ${utility}</td></tr>
      <tr><td style="padding:6px 0; color:#8A938D;">Property</td><td style="padding:6px 0;">${property || ''} ${postcode || ''}</td></tr>
    </table>
    <p style="font-size:14px; color:#525F58;">
      Keep hold of your reference number — you'll need it if you contact us about this application.
    </p>
  `);

  return sendMail({
    to: applicantEmail,
    subject: `Application received — ${ref}`,
    html,
  });
}

// ---------------------------------------------------------------------
// 2. Admin alert — sent the moment a new application comes in
// ---------------------------------------------------------------------
async function sendNewApplicationToAdmin(application) {
  const { applicantName, applicantEmail, ref, type, utility, property, postcode, submittedDate } = application;

  const html = layout(`
    <h1 style="font-size:20px; margin:0 0 12px;">New application submitted</h1>
    <table style="width:100%; font-size:14px; margin:16px 0; border-collapse:collapse;">
      <tr><td style="padding:6px 0; color:#8A938D;">Reference</td><td style="padding:6px 0; font-weight:600;">${ref}</td></tr>
      <tr><td style="padding:6px 0; color:#8A938D;">Applicant</td><td style="padding:6px 0;">${applicantName} (${applicantEmail})</td></tr>
      <tr><td style="padding:6px 0; color:#8A938D;">Request type</td><td style="padding:6px 0;">${type} — ${utility}</td></tr>
      <tr><td style="padding:6px 0; color:#8A938D;">Property</td><td style="padding:6px 0;">${property || ''} ${postcode || ''}</td></tr>
      <tr><td style="padding:6px 0; color:#8A938D;">Submitted</td><td style="padding:6px 0;">${new Date(submittedDate).toLocaleString('en-GB')}</td></tr>
    </table>
  `);

  return sendMail({
    to: ADMIN_EMAIL,
    subject: `New application — ${ref} (${type})`,
    html,
  });
}

// ---------------------------------------------------------------------
// 3. Status change — sent to the customer whenever staff update status
//    (optional, but the natural next step — see notes below)
// ---------------------------------------------------------------------
async function sendStatusUpdateToCustomer(application, newStatus) {
  const { applicantName, applicantEmail, ref } = application;

  const statusCopy = {
    'In Progress': 'Your application is now being reviewed by our team.',
    'Quote Issued': 'A quote has been prepared for your application.',
    'Request More Information': 'We need a bit more information from you to continue.',
    Completed: 'Your application has been completed.',
    Rejected: 'There has been an update regarding your application status.',
  };

  const html = layout(`
    <h1 style="font-size:20px; margin:0 0 12px;">Application update</h1>
    <p style="font-size:14px; line-height:1.6; color:#525F58;">
      Hi ${applicantName || 'there'}, your application <strong>${ref}</strong> has a new status:
    </p>
    <p style="font-size:16px; font-weight:700; color:#2563EB; margin:12px 0;">${newStatus}</p>
    <p style="font-size:14px; color:#525F58;">${statusCopy[newStatus] || ''}</p>
    ${button(`${process.env.APP_URL}/track/${ref}`, 'View application')}
  `);

  return sendMail({
    to: applicantEmail,
    subject: `Update on your application ${ref}: ${newStatus}`,
    html,
  });
}

// ---------------------------------------------------------------------
// 4. New message — sent when the OTHER party (customer <-> staff)
//    replies, so nobody has to keep the tab open to know (optional)
// ---------------------------------------------------------------------
async function sendNewMessageNotification({ to, subject, recipientName, ref, senderLabel, messageText, viewUrl }) {
  const html = layout(`
    <h1 style="font-size:20px; margin:0 0 12px;">New message on ${ref}</h1>
    <p style="font-size:14px; line-height:1.6; color:#525F58;">
      Hi ${recipientName || 'there'}, ${senderLabel} sent a new message:
    </p>
    <div style="background:#F7F8F6; border-radius:8px; padding:14px 16px; font-size:14px; color:#1E2422; margin:16px 0;">
      "${messageText}"
    </div>
    ${button(viewUrl, 'Reply now')}
  `);

  return sendMail({ to, subject, html });
}

module.exports = {
  sendApplicationSubmittedToCustomer,
  sendNewApplicationToAdmin,
  sendStatusUpdateToCustomer,
  sendNewMessageNotification,
};