/**
 * Email Service
 *
 * Sends invoice emails with optional PDF attachment.
 * Requires SMTP_* env vars. If not set, sendEmail returns { sent: false }.
 */

const nodemailer = require('nodemailer');
const config = require('../config/env');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!config.smtpHost || !config.smtpUser) return null;
  transporter = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpPort === 465,
    auth: {
      user: config.smtpUser,
      pass: config.smtpPass,
    },
  });
  return transporter;
}

/**
 * Send invoice email to client
 *
 * @param {object} options
 * @param {string} options.to - Recipient email
 * @param {string} options.invoiceNumber - Invoice number
 * @param {string} options.businessName - Business name
 * @param {string} options.paymentUrl - Full URL to payment page
 * @param {Buffer} [options.pdfBuffer] - Optional PDF attachment
 * @param {string} [options.pdfFilename] - Filename for PDF (e.g. invoice-INV-0001.pdf)
 * @returns {Promise<{ sent: boolean, messageId?: string, error?: string }>}
 */
async function sendInvoiceEmail({ to, invoiceNumber, businessName, paymentUrl, pdfBuffer, pdfFilename }) {
  const transport = getTransporter();
  if (!transport) {
    return { sent: false, error: 'Email not configured. Set SMTP_HOST and SMTP_USER.' };
  }

  const subject = `Invoice ${invoiceNumber} from ${businessName}`;
  const html = `
    <p>Hello,</p>
    <p>You have received an invoice from <strong>${businessName}</strong>.</p>
    <p><strong>Invoice number:</strong> ${invoiceNumber}</p>
    <p>Pay online here: <a href="${paymentUrl}">${paymentUrl}</a></p>
    <p>${pdfBuffer ? 'A PDF copy of the invoice is attached.' : ''}</p>
    <p>— ${businessName}</p>
  `;

  const mailOptions = {
    from: config.smtpFrom || config.smtpUser,
    to,
    subject,
    html,
    attachments: [],
  };

  if (pdfBuffer && pdfFilename) {
    mailOptions.attachments.push({
      filename: pdfFilename,
      content: pdfBuffer,
    });
  }

  try {
    const info = await transport.sendMail(mailOptions);
    return { sent: true, messageId: info.messageId };
  } catch (err) {
    console.error('Send invoice email error:', err);
    return { sent: false, error: err.message };
  }
}

module.exports = {
  sendInvoiceEmail,
  isEmailConfigured: () => Boolean(config.smtpHost && config.smtpUser),
};
