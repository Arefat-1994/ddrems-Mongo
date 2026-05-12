const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { CommissionTracking, BrokerEngagements, Properties, Users, Agreements } = require('../models');

router.get('/broker/:brokerId', async (req, res) => {
  try {
    const brokerId = new mongoose.Types.ObjectId(req.params.brokerId);
    const commissions = await CommissionTracking.aggregate([
      { $match: { broker_id: brokerId } },
      { $lookup: { from: 'properties', let: { pid: '$property_id' }, pipeline: [{ $match: { $expr: { $eq: ['$_id', '$$pid'] } } }, { $project: { images: 0 } }], as: 'property' } },
      { $unwind: { path: '$property', preserveNullAndEmptyArrays: true } },
      { $addFields: { 
        id: '$_id',
        property_title: '$property.title',
        property_location: '$property.location',
        property_type: '$property.type'
      }},
      { $project: { property: 0 } },
      { $sort: { created_at: -1 } }
    ]);
    res.json(commissions);
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.get('/broker/:brokerId/summary', async (req, res) => {
  try {
    const brokerId = new mongoose.Types.ObjectId(req.params.brokerId);
    
    // Total deal commission
    const totalComms = await CommissionTracking.aggregate([
      { $match: { broker_id: brokerId } },
      { $group: {
        _id: null,
        deal_commission: { $sum: '$total_commission' },
        highest_commission: { $max: '$total_commission' },
        lowest_commission: { $min: '$total_commission' },
        avg_rate_customer: { $avg: '$customer_commission_percentage' },
        avg_rate_owner: { $avg: '$owner_commission_percentage' }
      }}
    ]);

    const summary = totalComms.length > 0 ? totalComms[0] : { deal_commission: 0, highest_commission: 0, lowest_commission: 0 };
    summary.avg_commission_rate = ((summary.avg_rate_customer || 0) + (summary.avg_rate_owner || 0)) / 2 || 2;
    delete summary._id;
    
    res.json(summary);
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.get('/broker/:brokerId/engagements', async (req, res) => {
  try {
    const brokerId = new mongoose.Types.ObjectId(req.params.brokerId);
    const engagements = await BrokerEngagements.aggregate([
      { $match: { broker_id: brokerId } },
      { $lookup: { from: 'properties', let: { pid: '$property_id' }, pipeline: [{ $match: { $expr: { $eq: ['$_id', '$$pid'] } } }, { $project: { images: 0 } }], as: 'property' } },
      { $lookup: { from: 'users', localField: 'buyer_id', foreignField: '_id', as: 'buyer' } },
      { $lookup: { from: 'users', localField: 'owner_id', foreignField: '_id', as: 'owner' } },
      { $unwind: { path: '$property', preserveNullAndEmptyArrays: true } },
      { $unwind: { path: '$buyer', preserveNullAndEmptyArrays: true } },
      { $unwind: { path: '$owner', preserveNullAndEmptyArrays: true } },
      { $addFields: {
        id: '$_id',
        property_title: '$property.title',
        buyer_name: '$buyer.name',
        owner_name: '$owner.name'
      }},
      { $project: { property: 0, buyer: 0, owner: 0 } },
      { $sort: { created_at: -1 } }
    ]);
    res.json({ engagements });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.post('/', async (req, res) => {
  try {
    const comm = await CommissionTracking.create(req.body);
    res.json({ message: 'Success', success: true, id: comm._id });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.put('/:id/status', async (req, res) => {
  try {
    await CommissionTracking.findByIdAndUpdate(req.params.id, { status: req.body.status });
    res.json({ message: 'Updated', success: true });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.get('/revenue-stats', async (req, res) => {
  try {
    const [monthlyRevenue, byPropertyType, byEngagementType, brokerStats] = await Promise.all([
      // Mocking/aggregating real stats
      CommissionTracking.aggregate([
        { $group: {
          _id: { $month: '$created_at' },
          sale_commission: { $sum: { $cond: [{ $eq: ['$commission_type', 'sale'] }, '$total_commission', 0] } },
          rent_commission: { $sum: { $cond: [{ $eq: ['$commission_type', 'rent'] }, '$total_commission', 0] } }
        }}
      ]),
      CommissionTracking.aggregate([
        { $lookup: { from: 'properties', let: { pid: '$property_id' }, pipeline: [{ $match: { $expr: { $eq: ['$_id', '$$pid'] } } }, { $project: { images: 0 } }], as: 'property' } },
        { $unwind: { path: '$property', preserveNullAndEmptyArrays: true } },
        { $group: { _id: '$property.type', total_commission: { $sum: '$total_commission' } } },
        { $project: { property_type: '$_id', total_commission: 1, _id: 0 } }
      ]),
      CommissionTracking.aggregate([
        { $group: { _id: '$commission_type', total_commission: { $sum: '$total_commission' } } },
        { $project: { engagement_type: '$_id', total_commission: 1, _id: 0 } }
      ]),
      CommissionTracking.aggregate([
        { $group: { _id: '$broker_id', total_commission: { $sum: '$total_commission' } } },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'broker' } },
        { $unwind: { path: '$broker', preserveNullAndEmptyArrays: true } },
        { $project: { broker_name: '$broker.name', total_commission: 1, _id: 0 } },
        { $sort: { total_commission: -1 } },
        { $limit: 10 }
      ])
    ]);

    // Format monthly revenue assuming 1-12 months map correctly
    const formattedMonthly = monthlyRevenue.map(m => ({ month: m._id, sale_commission: m.sale_commission, rent_commission: m.rent_commission }));

    // Calculate total stats
    const totalRevenue = byEngagementType.reduce((sum, e) => sum + Number(e.total_commission || 0), 0);
    const totalDeals = await CommissionTracking.countDocuments({});

    res.json({
      monthlyRevenue: formattedMonthly,
      byPropertyType,
      byEngagementType,
      topBrokers: brokerStats,
      summary: {
        total_revenue: totalRevenue,
        total_deals: totalDeals
      }
    });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

module.exports = router;
