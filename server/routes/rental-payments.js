const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const { RentalPaymentSchedules, Notifications, Properties, Users, AgreementRequests, BrokerEngagements } = require("../models");

// ============================================================================
// HELPER: Notify user
// ============================================================================
async function notifyUser(userId, title, message, type) {
  try {
    await Notifications.create({
      user_id: userId,
      title: title,
      message: message,
      type: type || "info",
      created_at: new Date()
    });
  } catch (error) {
    console.error("Error in notifyUser:", error);
  }
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

  let stepMonths = 1;
  if (paymentSchedule === 'quarterly') stepMonths = 3;
  if (paymentSchedule === 'semi_annual') stepMonths = 6;
  if (paymentSchedule === 'annual' || paymentSchedule === 'yearly') stepMonths = 12;

  const startMonth = 2;
  let installmentCounter = 1;

  for (let currentMonth = startMonth; currentMonth <= leaseDurationMonths; currentMonth += stepMonths) {
    const dueDate = new Date(startDate);
    dueDate.setMonth(dueDate.getMonth() + currentMonth - 1); 

    const monthsCovered = Math.min(stepMonths, leaseDurationMonths - currentMonth + 1);
    
    const installmentAmount = monthlyRent * monthsCovered;
    const ownerNet = installmentAmount; 

    scheduleRows.push({
      agreement_request_id: agreementRequestId || null,
      broker_engagement_id: brokerEngagementId || null,
      tenant_id: tenantId,
      owner_id: ownerId,
      property_id: propertyId,
      installment_number: installmentCounter++,
      amount: installmentAmount,
      due_date: dueDate,
      status: 'pending',
      commission_deducted: false,
      broker_commission_amount: 0,
      system_fee_amount: 0,
      owner_net_amount: ownerNet,
      created_at: new Date()
    });
  }

  if (scheduleRows.length > 0) {
    await RentalPaymentSchedules.insertMany(scheduleRows);
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

    if (agreement_request_id) {
      const existing = await RentalPaymentSchedules.findOne({ agreement_request_id: agreement_request_id });
      if (existing) {
        return res.status(400).json({ success: false, message: "Payment schedule already exists for this agreement" });
      }
    }
    if (broker_engagement_id) {
      const existing = await RentalPaymentSchedules.findOne({ broker_engagement_id: broker_engagement_id });
      if (existing) {
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

    await notifyUser(tenant_id, "📅 Rent Payment Schedule Created",
      `Your rental payment schedule has been set up with ${count} upcoming installments. Check your Rent Payments tab for details.`, "info");

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
    if (!mongoose.Types.ObjectId.isValid(tenantId)) return res.status(400).json({ message: 'Invalid Tenant ID' });

    const payments = await RentalPaymentSchedules.aggregate([
      { $match: { tenant_id: new mongoose.Types.ObjectId(tenantId) } },
      { $lookup: { from: 'properties', localField: 'property_id', foreignField: '_id', as: 'property' } },
      { $unwind: { path: '$property', preserveNullAndEmptyArrays: true } },
      { $lookup: { from: 'users', localField: 'owner_id', foreignField: '_id', as: 'owner' } },
      { $unwind: { path: '$owner', preserveNullAndEmptyArrays: true } },
      { $lookup: { from: 'agreementrequests', localField: 'agreement_request_id', foreignField: '_id', as: 'agreement' } },
      { $unwind: { path: '$agreement', preserveNullAndEmptyArrays: true } },
      { $lookup: { from: 'brokerengagements', localField: 'broker_engagement_id', foreignField: '_id', as: 'engagement' } },
      { $unwind: { path: '$engagement', preserveNullAndEmptyArrays: true } },
      { $addFields: {
        id: '$_id',
        property_title: '$property.title',
        property_location: '$property.location',
        owner_name: '$owner.name',
        payment_schedule: { $ifNull: ['$agreement.payment_schedule', { $ifNull: ['$engagement.payment_schedule', 'monthly'] }] },
        lease_duration_months: { $ifNull: ['$agreement.rental_duration_months', '$engagement.rental_duration_months'] }
      }},
      { $sort: { due_date: 1 } }
    ]);

    const grouped = {};
    for (const pay of payments) {
      const key = pay.property_id.toString();
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
    if (!mongoose.Types.ObjectId.isValid(ownerId)) return res.status(400).json({ message: 'Invalid Owner ID' });

    const payments = await RentalPaymentSchedules.aggregate([
      { $match: { owner_id: new mongoose.Types.ObjectId(ownerId) } },
      { $lookup: { from: 'properties', localField: 'property_id', foreignField: '_id', as: 'property' } },
      { $unwind: { path: '$property', preserveNullAndEmptyArrays: true } },
      { $lookup: { from: 'users', localField: 'tenant_id', foreignField: '_id', as: 'tenant' } },
      { $unwind: { path: '$tenant', preserveNullAndEmptyArrays: true } },
      { $lookup: { from: 'agreementrequests', localField: 'agreement_request_id', foreignField: '_id', as: 'agreement' } },
      { $unwind: { path: '$agreement', preserveNullAndEmptyArrays: true } },
      { $lookup: { from: 'brokerengagements', localField: 'broker_engagement_id', foreignField: '_id', as: 'engagement' } },
      { $unwind: { path: '$engagement', preserveNullAndEmptyArrays: true } },
      { $addFields: {
        id: '$_id',
        property_title: '$property.title',
        property_location: '$property.location',
        tenant_name: '$tenant.name',
        payment_schedule: { $ifNull: ['$agreement.payment_schedule', { $ifNull: ['$engagement.payment_schedule', 'monthly'] }] },
        lease_duration_months: { $ifNull: ['$agreement.rental_duration_months', '$engagement.rental_duration_months'] }
      }},
      { $sort: { due_date: 1 } }
    ]);

    const grouped = {};
    for (const pay of payments) {
      const key = pay.property_id.toString();
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
    const payments = await RentalPaymentSchedules.aggregate([
      { $lookup: { from: 'properties', localField: 'property_id', foreignField: '_id', as: 'property' } },
      { $unwind: { path: '$property', preserveNullAndEmptyArrays: true } },
      { $lookup: { from: 'users', localField: 'tenant_id', foreignField: '_id', as: 'tenant' } },
      { $unwind: { path: '$tenant', preserveNullAndEmptyArrays: true } },
      { $lookup: { from: 'users', localField: 'owner_id', foreignField: '_id', as: 'owner' } },
      { $unwind: { path: '$owner', preserveNullAndEmptyArrays: true } },
      { $lookup: { from: 'agreementrequests', localField: 'agreement_request_id', foreignField: '_id', as: 'agreement' } },
      { $unwind: { path: '$agreement', preserveNullAndEmptyArrays: true } },
      { $lookup: { from: 'brokerengagements', localField: 'broker_engagement_id', foreignField: '_id', as: 'engagement' } },
      { $unwind: { path: '$engagement', preserveNullAndEmptyArrays: true } },
      { $addFields: {
        id: '$_id',
        property_title: '$property.title',
        property_location: '$property.location',
        tenant_name: '$tenant.name',
        owner_name: '$owner.name',
        payment_schedule: { $ifNull: ['$agreement.payment_schedule', { $ifNull: ['$engagement.payment_schedule', 'monthly'] }] },
        lease_duration_months: { $ifNull: ['$agreement.rental_duration_months', '$engagement.rental_duration_months'] }
      }},
      { $sort: { due_date: 1 } }
    ]);
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

    const sched = await RentalPaymentSchedules.findById(scheduleId);
    if (!sched) {
      return res.status(404).json({ success: false, message: "Payment schedule not found" });
    }

    if (sched.tenant_id.toString() !== tenant_id) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }
    if (sched.status === 'paid') {
      return res.status(400).json({ success: false, message: "This installment has already been paid" });
    }

    let final_receipt_path = receipt_url || null;
    if (receipt_url && receipt_url.startsWith('data:')) {
      const fs = require('fs');
      const path = require('path');
      try {
        const parts = receipt_url.split(',');
        if (parts.length === 2) {
          const mimeMatch = parts[0].match(/data:(.*?);/);
          let ext = 'jpg';
          if (mimeMatch && mimeMatch[1]) {
             const mimeParts = mimeMatch[1].split('/');
             ext = mimeParts[1] || 'jpg';
             if (mimeMatch[1] === 'application/pdf') ext = 'pdf';
             else if (mimeMatch[1] === 'image/jpeg') ext = 'jpg';
             else if (mimeMatch[1] === 'image/png') ext = 'png';
          }
          const buffer = Buffer.from(parts[1], 'base64');
          const fileName = `rent_receipt_${sched._id}_${Date.now()}.${ext}`;
          const dirPath = path.join(__dirname, '../uploads/receipts');
          if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
          const filePath = path.join(dirPath, fileName);
          fs.writeFileSync(filePath, buffer);
          final_receipt_path = `/uploads/receipts/${fileName}`;
        }
      } catch (err) {
        console.error("Error saving rent payment receipt file:", err);
      }
    }

    sched.status = 'submitted';
    sched.payment_method = payment_method;
    sched.transaction_reference = transaction_reference;
    sched.receipt_url = final_receipt_path;
    sched.paid_at = new Date();
    sched.updated_at = new Date();
    await sched.save();

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
    const { owner_id, decision, notes, is_admin } = req.body; 

    const sched = await RentalPaymentSchedules.findById(scheduleId);
    if (!sched) {
      return res.status(404).json({ success: false, message: "Payment not found" });
    }

    // Allow verification by owner OR admin
    if (!is_admin && sched.owner_id.toString() !== owner_id) {
      return res.status(403).json({ success: false, message: "Only the landlord or admin can verify payments" });
    }
    if (sched.status !== 'submitted') {
      return res.status(400).json({ success: false, message: "Payment is not in submitted state. Current: " + sched.status });
    }

    if (decision === 'approve') {
      sched.status = 'paid';
      sched.verified_by_id = owner_id;
      sched.verified_at = new Date();
      sched.verification_notes = notes || 'Approved';
      sched.updated_at = new Date();
      await sched.save();

      await notifyUser(sched.tenant_id, "✅ Rent Payment Verified",
        `Your rent payment for installment #${sched.installment_number} has been verified by the landlord.`, "success");

      res.json({ success: true, message: "Payment verified and marked as paid.", status: "paid" });
    } else {
      sched.status = 'pending';
      sched.payment_method = undefined;
      sched.transaction_reference = undefined;
      sched.receipt_url = undefined;
      sched.paid_at = undefined;
      sched.verification_notes = notes || 'Rejected by landlord';
      sched.updated_at = new Date();
      await sched.save();

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
    if (!mongoose.Types.ObjectId.isValid(propertyId)) return res.status(400).json({ message: 'Invalid Property ID' });

    const payments = await RentalPaymentSchedules.find({ property_id: propertyId }).sort({ due_date: 1 }).lean();

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
    const today = new Date();
    const overduePayments = await RentalPaymentSchedules.find({
      status: 'pending',
      due_date: { $lt: today }
    }).populate('tenant_id', 'name');

    let updated = 0;
    for (const payment of overduePayments) {
      payment.status = 'overdue';
      payment.updated_at = new Date();
      await payment.save();

      await notifyUser(payment.tenant_id._id, "⚠️ Rent Payment Overdue",
        `Your rent payment of ${Number(payment.amount).toLocaleString()} ETB (installment #${payment.installment_number}) is overdue. Please submit payment immediately.`, "error");

      await notifyUser(payment.owner_id, "⚠️ Overdue Rent Payment",
        `Tenant ${payment.tenant_id.name}'s rent payment (installment #${payment.installment_number}) is now overdue.`, "warning");

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
