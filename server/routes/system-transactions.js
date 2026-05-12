const express = require("express");
const router = express.Router();
const db = require("../config/db");

// GET /api/system-transactions/all
router.get("/all", async (req, res) => {
  try {
    const { CommissionTracking } = require('../models');
    
    // We use commission_tracking as the source of truth for all system revenue
    const rawTransactions = await CommissionTracking.aggregate([
      { $match: { $or: [{ status: 'paid' }, { commission_type: 'bonus' }] } },
      
      // Lookup Property
      { $lookup: { from: 'properties', let: { pid: '$property_id' }, pipeline: [{ $match: { $expr: { $eq: ['$_id', '$$pid'] } } }, { $project: { images: 0 } }], as: 'property' } },
      { $unwind: { path: '$property', preserveNullAndEmptyArrays: true } },
      
      // Lookup Broker
      { $lookup: { from: 'users', localField: 'broker_id', foreignField: '_id', as: 'broker' } },
      { $unwind: { path: '$broker', preserveNullAndEmptyArrays: true } },
      
      // Lookup Broker Engagement
      { $lookup: { from: 'brokerengagements', localField: 'broker_engagement_id', foreignField: '_id', as: 'be' } },
      { $unwind: { path: '$be', preserveNullAndEmptyArrays: true } },
      
      // Lookup Agreement Request
      { $lookup: { from: 'agreementrequests', localField: 'agreement_request_id', foreignField: '_id', as: 'ar' } },
      { $unwind: { path: '$ar', preserveNullAndEmptyArrays: true } },
      
      // Lookup Buyers
      { $lookup: { from: 'users', localField: 'be.buyer_id', foreignField: '_id', as: 'be_buyer' } },
      { $unwind: { path: '$be_buyer', preserveNullAndEmptyArrays: true } },
      { $lookup: { from: 'users', localField: 'ar.customer_id', foreignField: '_id', as: 'ar_buyer' } },
      { $unwind: { path: '$ar_buyer', preserveNullAndEmptyArrays: true } },
      
      // Lookup Owners
      { $lookup: { from: 'users', localField: 'be.owner_id', foreignField: '_id', as: 'be_owner' } },
      { $unwind: { path: '$be_owner', preserveNullAndEmptyArrays: true } },
      { $lookup: { from: 'users', localField: 'ar.owner_id', foreignField: '_id', as: 'ar_owner' } },
      { $unwind: { path: '$ar_owner', preserveNullAndEmptyArrays: true } },
      { $lookup: { from: 'users', localField: 'property.owner_id', foreignField: '_id', as: 'p_owner' } },
      { $unwind: { path: '$p_owner', preserveNullAndEmptyArrays: true } },

      // Determine fields
      { $addFields: {
        commission_id: '$_id',
        amount: '$agreement_amount',
        system_fee: '$customer_commission',
        broker_commission: '$owner_commission',
        total_commission: '$total_commission',
        date: '$calculated_at',
        commission_type: '$commission_type',
        db_status: '$status',
        property_name: '$property.title',
        property_type: '$property.property_type',
        broker_name: '$broker.name',
        buyer_name: { $ifNull: ['$be_buyer.name', '$ar_buyer.name'] },
        owner_name: { $ifNull: ['$be_owner.name', { $ifNull: ['$ar_owner.name', '$p_owner.name'] }] },
        engagement_type: { $ifNull: ['$be.engagement_type', { $ifNull: ['$property.listing_type', 'sale'] }] },
        payment_method: { $ifNull: ['$be.payment_method', { $ifNull: ['$ar.payment_method', 'Bank Transfer'] }] }
      }},
      
      // Clean up giant joined objects
      { $project: { property: 0, broker: 0, be: 0, ar: 0, be_buyer: 0, ar_buyer: 0, be_owner: 0, ar_owner: 0, p_owner: 0 } },
      { $sort: { date: -1 } }
    ]);
    
    // Map aggregation results into the array format expected by the frontend
    const transactions = rawTransactions.map(t => ({
      ...t,
      commission_id: t.commission_id.toString()
    }));

    let totalSalesAmount = 0;
    let totalRentAmount = 0;
    let systemRevenue = 0;
    let saleSystemRevenue = 0;
    let rentSystemRevenue = 0;
    let totalBrokerCommission = 0;
    
    const sales = [];
    const rent = [];

    transactions.forEach(t => {
      const amt = Number(t.amount) || 0;
      const sysFee = Number(t.system_fee) || 0;
      const brkComm = Number(t.broker_commission) || 0;
      const isRent = t.engagement_type === 'rent';

      if (isRent) {
        totalRentAmount += amt;
        rentSystemRevenue += sysFee;
        rent.push({
          id: `REV-${t.commission_id}`,
          type: 'rent',
          property_name: t.property_name || 'N/A',
          tenant_name: t.buyer_name || 'N/A',
          owner_name: t.owner_name || 'N/A',
          rent_amount: amt,
          commission: sysFee, // We show system fee as "commission" for the admin
          broker_commission: brkComm,
          date: t.date,
          status: 'completed',
          payment_method: t.payment_method,
          transfer_type: t.commission_type === 'bonus' ? 'Performance Bonus' : 'Agreement Commission'
        });
      } else {
        totalSalesAmount += amt;
        saleSystemRevenue += sysFee;
        sales.push({
          id: t.commission_id,
          type: 'sale',
          property_name: t.property_name || 'N/A',
          buyer_name: t.buyer_name || 'N/A',
          owner_name: t.owner_name || 'N/A',
          sale_amount: amt,
          commission: sysFee, // We show system fee as "commission" for the admin
          broker_commission: brkComm,
          net_amount: amt - sysFee - brkComm,
          date: t.date,
          status: 'completed',
          payment_method: t.payment_method
        });
      }
      systemRevenue += sysFee;
      totalBrokerCommission += brkComm;
    });

    res.json({
      success: true,
      data: {
        sale: sales,
        rent: rent,
        summary: {
          totalSalesAmount,
          totalRentAmount,
          totalCommission: systemRevenue, // Admin sees system earnings here
          systemRevenue: systemRevenue,
          saleSystemRevenue,
          rentSystemRevenue,
          totalBrokerCommission,
          totalVolume: totalSalesAmount + totalRentAmount,
          saleCount: sales.length,
          rentCount: rent.length
        }
      }
    });

  } catch (error) {
    console.error("Error fetching system transactions:", error);
    res.status(500).json({ success: false, message: "Server error fetching transactions" });
  }
});

// GET /api/system-transactions/rental-revenue
// Aggregates paid rental installments for reports & revenue dashboards
router.get("/rental-revenue", async (req, res) => {
  try {
    const { RentalPaymentSchedules } = require('../models');
    
    const rentalStats = await RentalPaymentSchedules.aggregate([
      { $lookup: { from: 'properties', localField: 'property_id', foreignField: '_id', as: 'property' } },
      { $unwind: { path: '$property', preserveNullAndEmptyArrays: true } },
      { $lookup: { from: 'users', localField: 'tenant_id', foreignField: '_id', as: 'tenant' } },
      { $unwind: { path: '$tenant', preserveNullAndEmptyArrays: true } },
      { $lookup: { from: 'users', localField: 'owner_id', foreignField: '_id', as: 'owner' } },
      { $unwind: { path: '$owner', preserveNullAndEmptyArrays: true } },
      { $addFields: {
        id: '$_id',
        property_title: '$property.title',
        property_location: '$property.location',
        tenant_name: '$tenant.name',
        owner_name: '$owner.name'
      }},
      { $project: { property: 0, tenant: 0, owner: 0 } },
      { $sort: { due_date: -1 } }
    ]);

    const totalScheduled = rentalStats.length;
    const paidInstallments = rentalStats.filter(r => r.status === 'paid');
    const pendingInstallments = rentalStats.filter(r => r.status === 'pending');
    const overdueInstallments = rentalStats.filter(r => r.status === 'overdue');
    const submittedInstallments = rentalStats.filter(r => r.status === 'submitted');

    const totalRentCollected = paidInstallments.reduce((s, r) => s + Number(r.amount || 0), 0);
    const totalRentPending = pendingInstallments.reduce((s, r) => s + Number(r.amount || 0), 0);
    const totalRentOverdue = overdueInstallments.reduce((s, r) => s + Number(r.amount || 0), 0);
    const totalRentSubmitted = submittedInstallments.reduce((s, r) => s + Number(r.amount || 0), 0);

    // Monthly breakdown of collected rent
    const monthlyRent = {};
    for (const p of paidInstallments) {
      const d = new Date(p.paid_at || p.due_date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyRent[key]) monthlyRent[key] = { month: key, collected: 0, count: 0 };
      monthlyRent[key].collected += Number(p.amount || 0);
      monthlyRent[key].count += 1;
    }

    // Unique properties with active schedules
    const uniqueProperties = [...new Set(rentalStats.map(r => r.property_id?.toString()))].length;

    res.json({
      success: true,
      data: {
        installments: rentalStats,
        summary: {
          totalScheduled,
          totalPaid: paidInstallments.length,
          totalPending: pendingInstallments.length,
          totalOverdue: overdueInstallments.length,
          totalSubmitted: submittedInstallments.length,
          totalRentCollected,
          totalRentPending,
          totalRentOverdue,
          totalRentSubmitted,
          uniqueProperties,
          monthlyBreakdown: Object.values(monthlyRent).sort((a, b) => a.month.localeCompare(b.month))
        }
      }
    });
  } catch (error) {
    console.error("Error fetching rental revenue:", error);
    res.status(500).json({ success: false, message: "Server error fetching rental revenue" });
  }
});

module.exports = router;
