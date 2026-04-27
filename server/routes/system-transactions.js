const express = require("express");
const router = express.Router();
const db = require("../config/db");

// GET /api/system-transactions/all
router.get("/all", async (req, res) => {
  try {
    // We use commission_tracking as the source of truth for all system revenue
    const [transactions] = await db.query(`
      SELECT 
        ct.id AS commission_id,
        ct.agreement_amount AS amount,
        ct.customer_commission AS system_fee,
        ct.owner_commission AS broker_commission,
        ct.total_commission,
        ct.calculated_at AS date,
        ct.commission_type,
        ct.status AS db_status,
        p.title AS property_name,
        p.type AS property_type,
        u_broker.name AS broker_name,
        -- Buyer and Owner names depending on the workflow type
        COALESCE(u_buyer_be.name, u_buyer_ar.name) AS buyer_name,
        COALESCE(u_owner_be.name, u_owner_ar.name, u_owner_p.name) AS owner_name,
        -- Engagement type
        COALESCE(be.engagement_type, 'sale') AS engagement_type,
        -- Payment info (if available)
        COALESCE(be.payment_method, ap.payment_method, 'Bank Transfer') AS payment_method
      FROM commission_tracking ct
      LEFT JOIN properties p ON ct.property_id = p.id
      LEFT JOIN users u_broker ON ct.broker_id = u_broker.id
      -- Join for Broker Engagement workflow
      LEFT JOIN broker_engagements be ON ct.broker_engagement_id = be.id
      LEFT JOIN users u_buyer_be ON be.buyer_id = u_buyer_be.id
      LEFT JOIN users u_owner_be ON be.owner_id = u_owner_be.id
      -- Join for Agreement Request workflow
      LEFT JOIN agreement_requests ar ON ct.agreement_request_id = ar.id
      LEFT JOIN users u_buyer_ar ON ar.customer_id = u_buyer_ar.id
      LEFT JOIN users u_owner_ar ON ar.owner_id = u_owner_ar.id
      -- Fallback for Owner if not in engagement
      LEFT JOIN users u_owner_p ON p.owner_id = u_owner_p.id
      -- Payment receipt join for agreement requests
      LEFT JOIN agreement_payments ap ON ar.id = ap.agreement_request_id AND ap.payment_status IN ('verified', 'released')
      WHERE ct.status = 'paid' OR ct.commission_type = 'bonus'
      ORDER BY ct.calculated_at DESC
    `);

    let totalSalesAmount = 0;
    let totalRentAmount = 0;
    let systemRevenue = 0;
    
    const sales = [];
    const rent = [];

    transactions.forEach(t => {
      const amt = Number(t.amount) || 0;
      const sysFee = Number(t.system_fee) || 0;
      const brkComm = Number(t.broker_commission) || 0;
      const isRent = t.engagement_type === 'rent';

      if (isRent) {
        totalRentAmount += amt;
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
          totalVolume: totalSalesAmount + totalRentAmount
        }
      }
    });

  } catch (error) {
    console.error("Error fetching system transactions:", error);
    res.status(500).json({ success: false, message: "Server error fetching transactions" });
  }
});

module.exports = router;
