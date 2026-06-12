const cron = require('node-cron');
const db = require('../config/database');
const emailService = require('./emailService');

/**
 * Start all scheduled cron jobs.
 * Called once from index.js on server startup.
 */
function startCronJobs() {
  // Run every 30 minutes — check for follow-up emails
  cron.schedule('*/30 * * * *', async () => {
    console.log('[CRON] Running follow-up email check at', new Date().toISOString());

    try {
      // Query work orders where received_date is not null
      const woResult = await db.query(
        'SELECT * FROM work_orders WHERE received_date IS NOT NULL'
      );
      const workOrders = woResult.rows;

      if (!workOrders || workOrders.length === 0) {
        console.log('[CRON] No work orders with received_date found');
        return;
      }

      for (const workOrder of workOrders) {
        try {
          // Check if any pending points have status = 'open'
          const ppResult = await db.query(
            'SELECT * FROM pending_points WHERE work_order_id = $1 AND status = $2',
            [workOrder.id, 'open']
          );
          const openPoints = ppResult.rows;

          if (!openPoints || openPoints.length === 0) {
            continue; // No open points, skip
          }

          // Calculate hours since received_date
          const receivedDate = new Date(workOrder.received_date);
          const now = new Date();
          const hoursSinceReceived = (now.getTime() - receivedDate.getTime()) / (1000 * 60 * 60);

          if (hoursSinceReceived < 48) {
            continue; // Not yet 48 hours, skip
          }

          // Check if a follow-up email has already been sent for this work order
          const logResult = await db.query(
            'SELECT id FROM email_logs WHERE work_order_id = $1 AND type = $2 AND status = $3 LIMIT 1',
            [workOrder.id, 'followup', 'sent']
          );
          const existingLogs = logResult.rows;

          if (existingLogs && existingLogs.length > 0) {
            continue; // Follow-up already sent, skip
          }

          // Fetch active follow-up recipients
          const recipResult = await db.query(
            'SELECT * FROM email_recipients WHERE is_active = $1 AND receives_followup = $2',
            [true, true]
          );
          const recipients = recipResult.rows;

          if (!recipients || recipients.length === 0) {
            console.log('[CRON] No active follow-up recipients configured, skipping WO', workOrder.work_order_number);
            continue;
          }

          // Send follow-up email
          console.log('[CRON] Sending follow-up email for WO', workOrder.work_order_number);
          const emailResult = await emailService.sendFollowUpEmail(workOrder, openPoints, recipients);

          // Log to email_logs
          await db.query(
            'INSERT INTO email_logs (work_order_id, type, status, recipients, error_message) VALUES ($1, $2, $3, $4, $5)',
            [
              workOrder.id,
              'followup',
              emailResult.success ? 'sent' : 'failed',
              recipients.map(r => r.email).join(', '),
              emailResult.error || null
            ]
          );

          if (emailResult.success) {
            console.log('[CRON] Follow-up email sent successfully for WO', workOrder.work_order_number);
          } else {
            console.error('[CRON] Follow-up email failed for WO', workOrder.work_order_number, ':', emailResult.error);
          }
        } catch (innerErr) {
          console.error('[CRON] Error processing work order', workOrder.work_order_number, ':', innerErr.message);
        }
      }

      console.log('[CRON] Follow-up email check completed');
    } catch (err) {
      console.error('[CRON] Critical error in follow-up cron job:', err.message);
    }
  });

  console.log('[CRON] Scheduled follow-up email check to run every 30 minutes');
}

module.exports = { startCronJobs };
