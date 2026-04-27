const express = require("express");
const router = express.Router();
const db = require("../config/db");

// ============================================================================
// HELPER: Notify user
// ============================================================================
async function notifyUser(userId, title, message, type) {
  await db.query(
    "INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)",
    [userId, title, message, type || "info"]
  );
}

// ============================================================================
// HELPER: Generate rental payment schedule for an agreement
// Called after handover is confirmed for a rental property
// ============================================================================
async function generateRentalSchedule({
  agreementRequestId,
  brokerEngagementId,
  tenantId,
  ownerId,
  propertyId,
  monthlyRent,
  leaseDurationMonths,
  paymentSchedule, // 'monthly', 'quarterly', 'yearly'
  brokerCommissionPct,
  systemFeePct,
  brokerId
}) {
  const scheduleRows = [];
  const startDate = new Date();
  startDate.setDate(1); // Start from 1st of current month

  // Per user decision: schedule starts from Month 2
  // Month 1 is the initial payment already handled by the main workflow
  let stepMonths = 1;
  if (paymentSchedule === 'quarterly') stepMonths = 3;
  if (paymentSchedule === 'semi_annual') stepMonths = 6;
  if (paymentSchedule === 'annual' || paymentSchedule === 'yearly') stepMonths = 12;

  // Per user decision: schedule starts from Month 2
  // Month 1 is the initial payment already handled by the main workflow
  const startMonth = 2;
  let installmentCounter = 1;

  for (let currentMonth = startMonth; currentMonth <= leaseDurationMonths; currentMonth += stepMonths) {
    const dueDate = new Date(startDate);
    dueDate.setMonth(dueDate.getMonth() + currentMonth - 1); 

    // Calculate how many months this installment covers (handles partial periods at the end of the lease)
    const monthsCovered = Math.min(stepMonths, leaseDurationMonths - currentMonth + 1);
    
    const installmentAmount = monthlyRent * monthsCovered;
    const ownerNet = installmentAmount; // Full amount to owner

    scheduleRows.push({
      installmentNumber: installmentCounter++,
      amount: installmentAmount,
      dueDate: dueDate.toISOString().split('T')[0],
      ownerNet: ownerNet,
      commissionDeducted: false,
      brokerCommission: 0,
      systemFee: 0
    });
  }

  // Insert all rows
  for (const row of scheduleRows) {
    await db.query(
      `INSERT INTO rental_payment_schedules
         (agreement_request_id, broker_engagement_id, tenant_id, owner_id, property_id,
          installment_number, amount, due_date, status,
          commission_deducted, broker_commission_amount, system_fee_amount, owner_net_amount)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)`,
      [
        agreementRequestId || null,
        brokerEngagementId || null,
        tenantId,
        ownerId,
        propertyId,
        row.installmentNumber,
        row.amount,
        row.dueDate,
        row.commissionDeducted,
        row.brokerCommission,
        row.systemFee,
        row.ownerNet
      ]
    );
  }

  return scheduleRows.length;
}

// ============================================================================
// POST /api/rental-payments/generate-schedule
// Admin or system triggers after handover to create payment schedule
// ============================================================================
router.post("/generate-schedule", async (req, res) => {
  try {
    const {
      agreement_request_id,
      broker_engagement_id,
      tenant_id,
      owner_id,
      property_id,
      monthly_rent,
      lease_duration_months,
      payment_schedule,
      broker_commission_pct,
      system_fee_pct,
      broker_id
    } = req.body;

    if (!tenant_id || !owner_id || !property_id || !monthly_rent || !lease_duration_months) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    // Check if schedule already exists for this agreement
    if (agreement_request_id) {
      const [existing] = await db.query(
        "SELECT id FROM rental_payment_schedules WHERE agreement_request_id = ? LIMIT 1",
        [agreement_request_id]
      );
      if (existing.length > 0) {
        return res.status(400).json({ success: false, message: "Payment schedule already exists for this agreement" });
      }
    }
    if (broker_engagement_id) {
      const [existing] = await db.query(
        "SELECT id FROM rental_payment_schedules WHERE broker_engagement_id = ? LIMIT 1",
        [broker_engagement_id]
      );
      if (existing.length > 0) {
        return res.status(400).json({ success: false, message: "Payment schedule already exists for this engagement" });
      }
    }

    const count = await generateRentalSchedule({
      agreementRequestId: agreement_request_id,
      brokerEngagementId: broker_engagement_id,
      tenantId: tenant_id,
      ownerId: owner_id,
      propertyId: property_id,
      monthlyRent: Number(monthly_rent),
      leaseDurationMonths: Number(lease_duration_months),
      paymentSchedule: payment_schedule || "monthly",
      brokerCommissionPct: Number(broker_commission_pct || 0),
      systemFeePct: Number(system_fee_pct || 2),
      brokerId: broker_id
    });

    // Notify tenant
    await notifyUser(tenant_id, "📅 Rent Payment Schedule Created",
      `Your rental payment schedule has been set up with ${count} upcoming installments. Check your Rent Payments tab for details.`, "info");

    // Notify owner
    await notifyUser(owner_id, "📅 Rent Schedule Active",
      `A rental payment schedule with ${count} installments has been created for your property.`, "info");

    res.json({ success: true, message: `Payment schedule created with ${count} installments.`, installment_count: count });
  } catch (error) {
    console.error("Error generating rental schedule:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

// ============================================================================
// GET /api/rental-payments/tenant/:tenantId
// Tenant fetches their rent payment schedule
// ============================================================================
router.get("/tenant/:tenantId", async (req, res) => {
  try {
    const { tenantId } = req.params;
    const [payments] = await db.query(
      `SELECT rps.*, p.title AS property_title, p.location AS property_location,
              u.name AS owner_name,
              COALESCE(ar.payment_schedule, be.payment_schedule, 'monthly') AS payment_schedule,
              COALESCE(ar.rental_duration_months, be.rental_duration_months) AS lease_duration_months
       FROM rental_payment_schedules rps
       JOIN properties p ON rps.property_id = p.id
       JOIN users u ON rps.owner_id = u.id
       LEFT JOIN agreement_requests ar ON rps.agreement_request_id = ar.id
       LEFT JOIN broker_engagements be ON rps.broker_engagement_id = be.id
       WHERE rps.tenant_id = ?
       ORDER BY rps.due_date ASC`,
      [tenantId]
    );

    // Group by property
    const grouped = {};
    for (const pay of payments) {
      const key = pay.property_id;
      if (!grouped[key]) {
        grouped[key] = {
          property_id: pay.property_id,
          property_title: pay.property_title,
          property_location: pay.property_location,
          owner_name: pay.owner_name,
          payment_schedule: pay.payment_schedule || 'monthly',
          lease_duration_months: pay.lease_duration_months,
          installments: []
        };
      }
      grouped[key].installments.push(pay);
    }

    res.json({ success: true, payments, grouped: Object.values(grouped) });
  } catch (error) {
    console.error("Error fetching tenant payments:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

// ============================================================================
// GET /api/rental-payments/owner/:ownerId
// Owner/Landlord fetches incoming rent payments across all properties
// ============================================================================
router.get("/owner/:ownerId", async (req, res) => {
  try {
    const { ownerId } = req.params;
    const [payments] = await db.query(
      `SELECT rps.*, p.title AS property_title, p.location AS property_location,
              u.name AS tenant_name,
              COALESCE(ar.payment_schedule, be.payment_schedule, 'monthly') AS payment_schedule,
              COALESCE(ar.rental_duration_months, be.rental_duration_months) AS lease_duration_months
       FROM rental_payment_schedules rps
       JOIN properties p ON rps.property_id = p.id
       JOIN users u ON rps.tenant_id = u.id
       LEFT JOIN agreement_requests ar ON rps.agreement_request_id = ar.id
       LEFT JOIN broker_engagements be ON rps.broker_engagement_id = be.id
       WHERE rps.owner_id = ?
       ORDER BY rps.due_date ASC`,
      [ownerId]
    );

    const grouped = {};
    for (const pay of payments) {
      const key = pay.property_id;
      if (!grouped[key]) {
        grouped[key] = {
          property_id: pay.property_id,
          property_title: pay.property_title,
          property_location: pay.property_location,
          tenant_name: pay.tenant_name,
          payment_schedule: pay.payment_schedule || 'monthly',
          lease_duration_months: pay.lease_duration_months,
          installments: []
        };
      }
      grouped[key].installments.push(pay);
    }

    res.json({ success: true, payments, grouped: Object.values(grouped) });
  } catch (error) {
    console.error("Error fetching owner payments:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

// ============================================================================
// GET /api/rental-payments/admin/all
// Admin fetches all rental payments (for dispute/oversight)
// ============================================================================
router.get("/admin/all", async (req, res) => {
  try {
    const [payments] = await db.query(
      `SELECT rps.*, p.title AS property_title, p.location AS property_location,
              t.name AS tenant_name, o.name AS owner_name,
              COALESCE(ar.payment_schedule, be.payment_schedule, 'monthly') AS payment_schedule,
              COALESCE(ar.rental_duration_months, be.rental_duration_months) AS lease_duration_months
       FROM rental_payment_schedules rps
       JOIN properties p ON rps.property_id = p.id
       JOIN users t ON rps.tenant_id = t.id
       JOIN users o ON rps.owner_id = o.id
       LEFT JOIN agreement_requests ar ON rps.agreement_request_id = ar.id
       LEFT JOIN broker_engagements be ON rps.broker_engagement_id = be.id
       ORDER BY rps.due_date ASC`
    );
    res.json({ success: true, payments });
  } catch (error) {
    console.error("Error fetching admin payments:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

// ============================================================================
// POST /api/rental-payments/pay/:scheduleId
// Tenant submits payment for a specific installment
// ============================================================================
router.post("/pay/:scheduleId", async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const { tenant_id, payment_method, transaction_reference, receipt_url } = req.body;

    const [schedule] = await db.query(
      "SELECT * FROM rental_payment_schedules WHERE id = ?", [scheduleId]
    );
    if (schedule.length === 0) {
      return res.status(404).json({ success: false, message: "Payment schedule not found" });
    }

    const sched = schedule[0];
    if (sched.tenant_id !== tenant_id) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }
    if (sched.status === 'paid') {
      return res.status(400).json({ success: false, message: "This installment has already been paid" });
    }

    await db.query(
      `UPDATE rental_payment_schedules SET
         status = 'submitted',
         payment_method = ?,
         transaction_reference = ?,
         receipt_url = ?,
         paid_at = NOW(),
         updated_at = NOW()
       WHERE id = ?`,
      [payment_method, transaction_reference, receipt_url, scheduleId]
    );

    // Notify the landlord
    await notifyUser(sched.owner_id, "💰 Rent Payment Submitted",
      `Your tenant has submitted rent payment for installment #${sched.installment_number}. Please verify.`, "warning");

    res.json({ success: true, message: "Payment submitted. Awaiting landlord verification.", status: "submitted" });
  } catch (error) {
    console.error("Error submitting payment:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

// ============================================================================
// PUT /api/rental-payments/verify/:scheduleId
// Landlord verifies/rejects a tenant's payment
// ============================================================================
router.put("/verify/:scheduleId", async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const { owner_id, decision, notes } = req.body; // decision: 'approve' or 'reject'

    const [schedule] = await db.query(
      "SELECT * FROM rental_payment_schedules WHERE id = ?", [scheduleId]
    );
    if (schedule.length === 0) {
      return res.status(404).json({ success: false, message: "Payment not found" });
    }

    const sched = schedule[0];
    if (sched.owner_id !== owner_id) {
      return res.status(403).json({ success: false, message: "Only the landlord can verify payments" });
    }
    if (sched.status !== 'submitted') {
      return res.status(400).json({ success: false, message: "Payment is not in submitted state. Current: " + sched.status });
    }

    if (decision === 'approve') {
      await db.query(
        `UPDATE rental_payment_schedules SET
           status = 'paid',
           verified_by_id = ?,
           verified_at = NOW(),
           verification_notes = ?,
           updated_at = NOW()
         WHERE id = ?`,
        [owner_id, notes || 'Approved', scheduleId]
      );

      await notifyUser(sched.tenant_id, "✅ Rent Payment Verified",
        `Your rent payment for installment #${sched.installment_number} has been verified by the landlord.`, "success");

      res.json({ success: true, message: "Payment verified and marked as paid.", status: "paid" });
    } else {
      // Reject — reset to pending so tenant can re-submit
      await db.query(
        `UPDATE rental_payment_schedules SET
           status = 'pending',
           payment_method = NULL,
           transaction_reference = NULL,
           receipt_url = NULL,
           paid_at = NULL,
           verification_notes = ?,
           updated_at = NOW()
         WHERE id = ?`,
        [notes || 'Rejected by landlord', scheduleId]
      );

      await notifyUser(sched.tenant_id, "❌ Rent Payment Rejected",
        `Your rent payment for installment #${sched.installment_number} was rejected. Reason: ${notes || 'No reason given'}. Please re-submit.`, "error");

      res.json({ success: true, message: "Payment rejected. Tenant notified.", status: "pending" });
    }
  } catch (error) {
    console.error("Error verifying payment:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

// ============================================================================
// GET /api/rental-payments/summary/:propertyId
// Summary stats for a specific rental property
// ============================================================================
router.get("/summary/:propertyId", async (req, res) => {
  try {
    const { propertyId } = req.params;
    const [payments] = await db.query(
      "SELECT * FROM rental_payment_schedules WHERE property_id = ? ORDER BY due_date ASC",
      [propertyId]
    );

    const total = payments.length;
    const paid = payments.filter(p => p.status === 'paid').length;
    const submitted = payments.filter(p => p.status === 'submitted').length;
    const overdue = payments.filter(p => p.status === 'overdue').length;
    const pending = payments.filter(p => p.status === 'pending').length;
    const totalPaid = payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + Number(p.amount), 0);
    const totalDue = payments.filter(p => ['pending', 'overdue'].includes(p.status)).reduce((sum, p) => sum + Number(p.amount), 0);

    res.json({
      success: true,
      summary: { total, paid, submitted, overdue, pending, totalPaid, totalDue },
      payments
    });
  } catch (error) {
    console.error("Error fetching summary:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

// ============================================================================
// PUT /api/rental-payments/check-overdue
// Called periodically (or manually by admin) to flag overdue payments
// ============================================================================
router.put("/check-overdue", async (req, res) => {
  try {
    // Find all pending payments with due_date in the past
    const [overdue] = await db.query(
      `SELECT rps.*, u.name AS tenant_name
       FROM rental_payment_schedules rps
       JOIN users u ON rps.tenant_id = u.id
       WHERE rps.status = 'pending' AND rps.due_date < CURRENT_DATE`
    );

    let updated = 0;
    for (const payment of overdue) {
      await db.query(
        "UPDATE rental_payment_schedules SET status = 'overdue', updated_at = NOW() WHERE id = ?",
        [payment.id]
      );

      await notifyUser(payment.tenant_id, "⚠️ Rent Payment Overdue",
        `Your rent payment of ${Number(payment.amount).toLocaleString()} ETB (installment #${payment.installment_number}) is overdue. Please submit payment immediately.`, "error");

      await notifyUser(payment.owner_id, "⚠️ Overdue Rent Payment",
        `Tenant ${payment.tenant_name}'s rent payment (installment #${payment.installment_number}) is now overdue.`, "warning");

      updated++;
    }

    res.json({ success: true, message: `${updated} payments marked as overdue.`, count: updated });
  } catch (error) {
    console.error("Error checking overdue:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

// Export both the router and the helper
module.exports = router;
module.exports.generateRentalSchedule = generateRentalSchedule;
