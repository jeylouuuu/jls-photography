const nodemailer = require('nodemailer');
const { getSetting } = require('../config/settings');

function getTransporter() {
  const host = getSetting('smtp_host');
  if (!host) return null;
  const port = parseInt(getSetting('smtp_port') || '587', 10);
  const secure = getSetting('smtp_secure') === 'true' || port === 465;
  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user: getSetting('smtp_user'),
      pass: getSetting('smtp_pass')
    }
  });
}

async function sendMail(to, subject, html) {
  const transporter = getTransporter();
  if (!transporter) {
    return { skipped: true, reason: 'SMTP not configured' };
  }
  try {
    const info = await transporter.sendMail({
      from: `"${getSetting('smtp_from_name') || 'JLS Photography'}" <${getSetting('smtp_from') || getSetting('smtp_user')}>`,
      to,
      subject,
      html
    });
    return { ok: true, info };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

module.exports = { sendMail, getTransporter };