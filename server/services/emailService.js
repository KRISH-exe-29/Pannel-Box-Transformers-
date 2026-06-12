const nodemailer = require('nodemailer');

let transporter = null;

function initTransporter() {
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.office365.com', // Default to Outlook/Office 365
      port: process.env.SMTP_PORT || 587,
      secure: false, // false for TLS (port 587)
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
      },
      tls: {
        ciphers: 'SSLv3',
        rejectUnauthorized: false // Helps bypass some strict company firewall SSL issues
      }
    });
  }
}

// Initialize on startup
initTransporter();

/**
 * Re-initialize transporter if credentials change
 */
function updateConfig() {
  initTransporter();
}

/**
 * Build the common HTML email header.
 */
function buildHeader() {
  return `
    <div style="background-color: #0F172A; padding: 24px 32px; text-align: center;">
      <h1 style="color: #FFFFFF; font-family: Arial, sans-serif; font-size: 22px; margin: 0; font-weight: 700;">
        Indo Tech Transformers Industries
      </h1>
      <p style="color: #94A3B8; font-family: Arial, sans-serif; font-size: 13px; margin: 6px 0 0 0; letter-spacing: 1px;">
        RTCC Tracking System
      </p>
    </div>
  `;
}

/**
 * Build the work order details table.
 */
function buildWorkOrderTable(workOrder) {
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return `
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-family: Arial, sans-serif;">
      <tr style="background-color: #F1F5F9;">
        <td style="padding: 10px 14px; border: 1px solid #E2E8F0; font-weight: 600; color: #334155; width: 35%;">Work Order No</td>
        <td style="padding: 10px 14px; border: 1px solid #E2E8F0; color: #1E293B;">${workOrder.work_order_number || 'N/A'}</td>
      </tr>
      <tr>
        <td style="padding: 10px 14px; border: 1px solid #E2E8F0; font-weight: 600; color: #334155;">Customer</td>
        <td style="padding: 10px 14px; border: 1px solid #E2E8F0; color: #1E293B;">${workOrder.customer_name || 'N/A'}</td>
      </tr>
      <tr style="background-color: #F1F5F9;">
        <td style="padding: 10px 14px; border: 1px solid #E2E8F0; font-weight: 600; color: #334155;">Rating MVA</td>
        <td style="padding: 10px 14px; border: 1px solid #E2E8F0; color: #1E293B;">${workOrder.rating_mva || 'N/A'}</td>
      </tr>
      <tr>
        <td style="padding: 10px 14px; border: 1px solid #E2E8F0; font-weight: 600; color: #334155;">Received Date</td>
        <td style="padding: 10px 14px; border: 1px solid #E2E8F0; color: #1E293B;">${formatDate(workOrder.received_date)}</td>
      </tr>
    </table>
  `;
}

/**
 * Build the pending points table.
 */
function buildPendingPointsTable(pendingPoints) {
  if (!pendingPoints || pendingPoints.length === 0) {
    return `
      <p style="font-family: Arial, sans-serif; color: #64748B; font-size: 14px; padding: 10px 0;">
        No open pending points found.
      </p>
    `;
  }

  const statusColor = (status) => {
    switch ((status || '').toLowerCase()) {
      case 'open': return 'background-color: #FEF2F2; color: #DC2626;';
      case 'in_progress': return 'background-color: #FFF7ED; color: #EA580C;';
      case 'resolved': return 'background-color: #F0FDF4; color: #16A34A;';
      default: return 'color: #334155;';
    }
  };

  let rows = '';
  pendingPoints.forEach((point, index) => {
    const bgColor = index % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
    rows += `
      <tr style="background-color: ${bgColor};">
        <td style="padding: 10px 14px; border: 1px solid #E2E8F0; text-align: center; color: #334155;">${index + 1}</td>
        <td style="padding: 10px 14px; border: 1px solid #E2E8F0; color: #1E293B;">${point.description || ''}</td>
        <td style="padding: 10px 14px; border: 1px solid #E2E8F0; color: #64748B;">${point.remarks || '-'}</td>
        <td style="padding: 10px 14px; border: 1px solid #E2E8F0; text-align: center; ${statusColor(point.status)}">${(point.status || 'open').toUpperCase()}</td>
      </tr>
    `;
  });

  return `
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-family: Arial, sans-serif;">
      <thead>
        <tr style="background-color: #1E293B;">
          <th style="padding: 12px 14px; border: 1px solid #334155; color: #FFFFFF; text-align: center; width: 60px;">S.No</th>
          <th style="padding: 12px 14px; border: 1px solid #334155; color: #FFFFFF; text-align: left;">Description</th>
          <th style="padding: 12px 14px; border: 1px solid #334155; color: #FFFFFF; text-align: left;">Remarks</th>
          <th style="padding: 12px 14px; border: 1px solid #334155; color: #FFFFFF; text-align: center; width: 120px;">Status</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}

/**
 * Build the email footer.
 */
function buildFooter() {
  return `
    <div style="background-color: #F8FAFC; padding: 16px 32px; border-top: 1px solid #E2E8F0; margin-top: 24px;">
      <p style="font-family: Arial, sans-serif; font-size: 12px; color: #94A3B8; text-align: center; margin: 0;">
        This is an automated notification from the RTCC Tracking System. Please do not reply to this email.
      </p>
    </div>
  `;
}

/**
 * Send a reminder email for open pending points.
 * @param {Object} workOrder - The work order record
 * @param {Array} pendingPoints - Array of open pending points
 * @param {Array} recipients - Array of recipient objects with email field
 * @returns {Object} { success: boolean, error?: string }
 */
async function sendReminderEmail(workOrder, pendingPoints, recipients) {
  try {
    if (!recipients || recipients.length === 0) {
      return { success: false, error: 'No recipients specified' };
    }

    const recipientEmails = recipients.map(r => r.email).filter(Boolean);

    if (recipientEmails.length === 0) {
      return { success: false, error: 'No valid recipient email addresses' };
    }

    const subject = `[REMINDER] Pending Points Open - Work Order ${workOrder.work_order_number} | ${workOrder.customer_name}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="margin: 0; padding: 0; background-color: #F1F5F9;">
        <div style="max-width: 700px; margin: 0 auto; background-color: #FFFFFF; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          ${buildHeader()}
          <div style="padding: 24px 32px;">
            <h2 style="font-family: Arial, sans-serif; color: #1E293B; font-size: 18px; margin: 0 0 8px 0;">
              Pending Points Reminder
            </h2>
            <p style="font-family: Arial, sans-serif; color: #64748B; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
              The following work order has pending points that remain open and require your attention.
              Please review and resolve these items at your earliest convenience.
            </p>

            <h3 style="font-family: Arial, sans-serif; color: #334155; font-size: 15px; margin: 20px 0 4px 0;">Work Order Details</h3>
            ${buildWorkOrderTable(workOrder)}

            <h3 style="font-family: Arial, sans-serif; color: #334155; font-size: 15px; margin: 20px 0 4px 0;">Open Pending Points</h3>
            ${buildPendingPointsTable(pendingPoints)}
          </div>
          ${buildFooter()}
        </div>
      </body>
      </html>
    `;

    if (!transporter) {
      return { success: false, error: 'Email sender is not configured in settings' };
    }

    await transporter.sendMail({
      from: `"RTCC Tracking System" <${process.env.GMAIL_USER}>`,
      to: recipientEmails.join(', '),
      subject,
      html
    });

    return { success: true };
  } catch (err) {
    console.error('Failed to send reminder email:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Send a follow-up email for unresolved pending points (stronger language).
 * @param {Object} workOrder - The work order record
 * @param {Array} pendingPoints - Array of open pending points
 * @param {Array} recipients - Array of recipient objects with email field
 * @returns {Object} { success: boolean, error?: string }
 */
async function sendFollowUpEmail(workOrder, pendingPoints, recipients) {
  try {
    if (!recipients || recipients.length === 0) {
      return { success: false, error: 'No recipients specified' };
    }

    const recipientEmails = recipients.map(r => r.email).filter(Boolean);

    if (recipientEmails.length === 0) {
      return { success: false, error: 'No valid recipient email addresses' };
    }

    const subject = `[FOLLOW-UP - ACTION REQUIRED] Work Order ${workOrder.work_order_number} | ${workOrder.customer_name}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="margin: 0; padding: 0; background-color: #F1F5F9;">
        <div style="max-width: 700px; margin: 0 auto; background-color: #FFFFFF; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          ${buildHeader()}
          <div style="padding: 24px 32px;">
            <div style="background-color: #FEF2F2; border: 1px solid #FECACA; border-radius: 6px; padding: 14px 18px; margin-bottom: 20px;">
              <h2 style="font-family: Arial, sans-serif; color: #DC2626; font-size: 16px; margin: 0 0 6px 0;">
                ACTION REQUIRED - Pending Points Unresolved
              </h2>
              <p style="font-family: Arial, sans-serif; color: #991B1B; font-size: 13px; margin: 0; line-height: 1.5;">
                Immediate action is required. These items have remained unresolved beyond 48 hours.
              </p>
            </div>

            <p style="font-family: Arial, sans-serif; color: #64748B; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
              This is a follow-up notification regarding unresolved pending points on the work order listed below.
              These items have exceeded the expected resolution timeframe and require immediate attention
              from the responsible departments.
            </p>

            <h3 style="font-family: Arial, sans-serif; color: #334155; font-size: 15px; margin: 20px 0 4px 0;">Work Order Details</h3>
            ${buildWorkOrderTable(workOrder)}

            <h3 style="font-family: Arial, sans-serif; color: #334155; font-size: 15px; margin: 20px 0 4px 0;">Unresolved Pending Points</h3>
            ${buildPendingPointsTable(pendingPoints)}

            <div style="background-color: #FFFBEB; border: 1px solid #FDE68A; border-radius: 6px; padding: 14px 18px; margin-top: 20px;">
              <p style="font-family: Arial, sans-serif; color: #92400E; font-size: 13px; margin: 0; line-height: 1.5;">
                Please prioritize the resolution of the above items and update the tracking system accordingly.
                If you require any clarification, contact the RTCC panel inspection team immediately.
              </p>
            </div>
          </div>
          ${buildFooter()}
        </div>
      </body>
      </html>
    `;

    if (!transporter) {
      return { success: false, error: 'Email sender is not configured in settings' };
    }

    await transporter.sendMail({
      from: `"RTCC Tracking System" <${process.env.GMAIL_USER}>`,
      to: recipientEmails.join(', '),
      subject,
      html
    });

    return { success: true };
  } catch (err) {
    console.error('Failed to send follow-up email:', err.message);
    return { success: false, error: err.message };
  }
}

module.exports = { sendReminderEmail, sendFollowUpEmail, updateConfig };
