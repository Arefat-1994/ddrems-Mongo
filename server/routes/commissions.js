const express = require('express');
const router = express.Router();
const db = require('../config/db');

// ============================================================================
// GET /api/commissions/broker/:brokerId
// Get all commissions for a broker from commission_tracking + broker_engagements
// ============================================================================
router.get('/broker/:brokerId', async (req, res) => {
  try {
    const { brokerId } = req.params;

    // Fetch from commission_tracking joined with engagement data
    const [commissions] = await db.query(`
      SELECT 
        ct.id,
        ct.broker_engagement_id,
        ct.agreement_request_id,
        ct.agreement_amount,
        ct.customer_commission_percentage AS system_pct,
        ct.owner_commission_percentage AS broker_pct,
        ct.customer_commission AS system_amount,
        ct.owner_commission AS broker_amount,
        ct.total_commission,
        ct.status,
        ct.calculated_at,
        ct.property_id,
        p.title AS property_title,
        p.location AS property_location,
        p.type AS property_type,
        p.listing_type AS property_listing_type,
        be.buyer_id,
        be.owner_id,
        be.engagement_type,
        be.agreed_price,
        be.status AS engagement_status,
        be.completed_at,
        be.funds_released_at,
        u_buyer.name AS buyer_name,
        u_owner.name AS owner_name,
        u_broker.name AS broker_name
      FROM commission_tracking ct
      LEFT JOIN properties p ON ct.property_id = p.id
      LEFT JOIN broker_engagements be ON ct.broker_engagement_id = be.id
      LEFT JOIN users u_buyer ON be.buyer_id = u_buyer.id
      LEFT JOIN users u_owner ON be.owner_id = u_owner.id
      LEFT JOIN users u_broker ON ct.broker_id = u_broker.id
      WHERE ct.broker_id = $1
      ORDER BY ct.calculated_at DESC
    `, [brokerId]);

    res.json(commissions);
  } catch (error) {
    console.error('Error fetching broker commissions:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ============================================================================
// GET /api/commissions/broker/:brokerId/summary
// Get commission summary with detailed stats
// ============================================================================
router.get('/broker/:brokerId/summary', async (req, res) => {
  try {
    const { brokerId } = req.params;

    const [summary] = await db.query(`
      SELECT 
        COUNT(CASE WHEN commission_type = 'deal' OR commission_type IS NULL THEN 1 END) AS total_deals,
        SUM(CASE WHEN (status = 'paid' OR status IS NULL) AND (commission_type = 'deal' OR commission_type IS NULL) THEN owner_commission ELSE 0 END) AS deal_commission,
        SUM(CASE WHEN (status = 'paid' OR status IS NULL) AND commission_type = 'bonus' THEN owner_commission ELSE 0 END) AS bonus_earned,
        SUM(CASE WHEN status = 'paid' OR status IS NULL THEN owner_commission ELSE 0 END) AS total_earned,
        SUM(CASE WHEN status = 'pending' THEN owner_commission ELSE 0 END) AS total_pending,
        SUM(owner_commission) AS total_amount,
        SUM(CASE WHEN commission_type = 'deal' OR commission_type IS NULL THEN agreement_amount ELSE 0 END) AS total_deal_value,
        AVG(CASE WHEN commission_type = 'deal' OR commission_type IS NULL THEN owner_commission_percentage ELSE NULL END) AS avg_commission_rate,
        MAX(CASE WHEN commission_type = 'deal' OR commission_type IS NULL THEN owner_commission ELSE NULL END) AS highest_commission,
        MIN(CASE WHEN (commission_type = 'deal' OR commission_type IS NULL) AND owner_commission > 0 THEN owner_commission ELSE NULL END) AS lowest_commission
      FROM commission_tracking
      WHERE broker_id = $1
    `, [brokerId]);

    // Also get pending engagements that haven't been completed yet (future commission)
    const [pending] = await db.query(`
      SELECT 
        COUNT(*) AS pending_count,
        COALESCE(SUM(agreed_price * COALESCE(broker_commission_pct, 2) / 100), 0) AS projected_earnings
      FROM broker_engagements
      WHERE broker_id = $1
        AND status NOT IN ('completed', 'cancelled', 'declined', 'rejected')
        AND agreed_price IS NOT NULL
        AND agreed_price > 0
    `, [brokerId]);

    // Get broker's bonus progress
    const [profile] = await db.query('SELECT completed_properties_count, bonus_eligible_value FROM broker_profiles WHERE user_id = $1', [brokerId]);

    const data = summary[0] || {};
    const pendingData = pending[0] || {};
    const prof = profile[0] || {};

    res.json({
      total_deals: Number(data.total_deals || 0),
      deal_commission: Number(data.deal_commission || 0),
      bonus_earned: Number(data.bonus_earned || 0),
      total_earned: Number(data.total_earned || 0),
      total_pending: Number(data.total_pending || 0),
      total_amount: Number(data.total_amount || 0),
      total_deal_value: Number(data.total_deal_value || 0),
      avg_commission_rate: Number(data.avg_commission_rate || 2),
      highest_commission: Number(data.highest_commission || 0),
      lowest_commission: Number(data.lowest_commission || 0),
      pending_deals: Number(pendingData.pending_count || 0),
      projected_earnings: Number(pendingData.projected_earnings || 0),
      properties_to_bonus: Number(prof.completed_properties_count || 0),
      bonus_eligible_value: Number(prof.bonus_eligible_value || 0)
    });
  } catch (error) {
    console.error('Error fetching commission summary:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ============================================================================
// GET /api/commissions/broker/:brokerId/engagements
// Get engagement pipeline with projected commission for each
// ============================================================================
router.get('/broker/:brokerId/engagements', async (req, res) => {
  try {
    const { brokerId } = req.params;

    const [engagements] = await db.query(`
      SELECT 
        be.id,
        be.status,
        be.engagement_type,
        be.agreed_price,
        be.starting_offer,
        be.current_offer,
        be.broker_commission_pct,
        be.broker_commission_amount,
        be.system_commission_pct,
        be.system_commission_amount,
        be.owner_payout_amount,
        be.funds_released_at,
        be.completed_at,
        be.created_at,
        be.updated_at,
        p.title AS property_title,
        p.location AS property_location,
        p.type AS property_type,
        u_buyer.name AS buyer_name,
        u_owner.name AS owner_name
      FROM broker_engagements be
      LEFT JOIN properties p ON be.property_id = p.id
      LEFT JOIN users u_buyer ON be.buyer_id = u_buyer.id
      LEFT JOIN users u_owner ON be.owner_id = u_owner.id
      WHERE be.broker_id = $1
      ORDER BY be.updated_at DESC
    `, [brokerId]);

    res.json({ success: true, engagements });
  } catch (error) {
    console.error('Error fetching broker engagement pipeline:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ============================================================================
// POST /api/commissions
// Create commission record (used during fund release)
// ============================================================================
router.post('/', async (req, res) => {
  try {
    const { broker_id, property_id, broker_engagement_id, agreement_amount, owner_commission, owner_commission_percentage, status } = req.body;
    
    const [result] = await db.query(
      `INSERT INTO commission_tracking 
       (broker_id, property_id, broker_engagement_id, agreement_amount, owner_commission, owner_commission_percentage, status, calculated_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [broker_id, property_id, broker_engagement_id, agreement_amount, owner_commission, owner_commission_percentage, status || 'pending']
    );
    
    res.json({ id: result.insertId, message: 'Commission recorded' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ============================================================================
// PUT /api/commissions/:id/status
// Update commission status
// ============================================================================
router.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    
    await db.query(
      'UPDATE commission_tracking SET status = $1 WHERE id = $2',
      [status, req.params.id]
    );
    
    res.json({ message: 'Commission status updated' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ============================================================================
// GET /api/commissions/revenue-stats
// Get comprehensive revenue statistics for Reports charts
// ============================================================================
router.get('/revenue-stats', async (req, res) => {
  try {
    // Total commission revenue broken down by engagement type (sale vs rent)
    const [byType] = await db.query(`
      SELECT 
        COALESCE(be.engagement_type, 'sale') AS engagement_type,
        COUNT(ct.id) AS deal_count,
        COALESCE(SUM(ct.total_commission), 0) AS total_commission,
        COALESCE(SUM(ct.customer_commission), 0) AS system_commission,
        COALESCE(SUM(ct.owner_commission), 0) AS broker_commission,
        COALESCE(SUM(ct.agreement_amount), 0) AS total_deal_value
      FROM commission_tracking ct
      LEFT JOIN broker_engagements be ON ct.broker_engagement_id = be.id
      GROUP BY COALESCE(be.engagement_type, 'sale')
    `);

    // Monthly commission revenue (last 12 months)
    const [monthly] = await db.query(`
      SELECT 
        TO_CHAR(ct.calculated_at, 'Mon') AS month,
        EXTRACT(MONTH FROM ct.calculated_at) AS month_num,
        EXTRACT(YEAR FROM ct.calculated_at) AS year,
        COALESCE(SUM(CASE WHEN COALESCE(be.engagement_type, 'sale') = 'sale' THEN ct.total_commission ELSE 0 END), 0) AS sale_commission,
        COALESCE(SUM(CASE WHEN COALESCE(be.engagement_type, 'sale') = 'rent' THEN ct.total_commission ELSE 0 END), 0) AS rent_commission,
        COALESCE(SUM(ct.total_commission), 0) AS total_commission,
        COUNT(ct.id) AS deal_count
      FROM commission_tracking ct
      LEFT JOIN broker_engagements be ON ct.broker_engagement_id = be.id
      WHERE ct.calculated_at >= NOW() - INTERVAL '12 months'
      GROUP BY TO_CHAR(ct.calculated_at, 'Mon'), EXTRACT(MONTH FROM ct.calculated_at), EXTRACT(YEAR FROM ct.calculated_at)
      ORDER BY year, month_num
    `);

    // Commission by property type
    const [byPropertyType] = await db.query(`
      SELECT 
        COALESCE(p.type, 'Unknown') AS property_type,
        COUNT(ct.id) AS deal_count,
        COALESCE(SUM(ct.total_commission), 0) AS total_commission,
        COALESCE(SUM(ct.agreement_amount), 0) AS total_deal_value
      FROM commission_tracking ct
      LEFT JOIN properties p ON ct.property_id = p.id
      GROUP BY COALESCE(p.type, 'Unknown')
    `);

    // Overall summary
    const [summary] = await db.query(`
      SELECT 
        COUNT(ct.id) AS total_deals,
        COALESCE(SUM(ct.customer_commission), 0) AS total_revenue, -- Revenue now specifically means System Revenue
        COALESCE(SUM(ct.customer_commission), 0) AS system_earnings,
        COALESCE(SUM(ct.owner_commission), 0) AS broker_payouts,
        COALESCE(SUM(ct.total_commission), 0) AS gross_commissions,
        COALESCE(SUM(ct.agreement_amount), 0) AS total_deal_value,
        COALESCE(AVG(ct.customer_commission), 0) AS avg_system_fee,
        COALESCE(MAX(ct.customer_commission), 0) AS max_system_fee
      FROM commission_tracking ct
      WHERE ct.status = 'paid' OR ct.commission_type = 'bonus'
    `);

    // Top performing brokers by commission
    const [topBrokers] = await db.query(`
      SELECT 
        u.name AS broker_name,
        COUNT(ct.id) AS deal_count,
        COALESCE(SUM(ct.total_commission), 0) AS total_commission,
        COALESCE(SUM(ct.agreement_amount), 0) AS total_deal_value
      FROM commission_tracking ct
      LEFT JOIN users u ON ct.broker_id = u.id
      GROUP BY u.name
      ORDER BY total_commission DESC
      LIMIT 10
    `);

    res.json({
      success: true,
      byEngagementType: byType,
      monthlyRevenue: monthly,
      byPropertyType: byPropertyType,
      summary: summary[0] || { total_deals: 0, total_revenue: 0, system_earnings: 0, broker_payouts: 0, total_deal_value: 0, avg_commission: 0, max_commission: 0 },
      topBrokers: topBrokers
    });
  } catch (error) {
    console.error('Error fetching revenue stats:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
