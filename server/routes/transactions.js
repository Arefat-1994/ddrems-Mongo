const express = require('express');
const router = express.Router();
const { Transactions, AgreementTransactions } = require('../models');

router.get('/', async (req, res) => {
  try {
    const transactions = await AgreementTransactions.aggregate([
      { $lookup: { from: 'properties', let: { pid: '$property_id' }, pipeline: [{ $match: { $expr: { $eq: ['$_id', '$$pid'] } } }, { $project: { images: 0 } }], as: 'property' } },
      { $lookup: { from: 'users', localField: 'buyer_id', foreignField: '_id', as: 'user' } },
      { $unwind: { path: '$property', preserveNullAndEmptyArrays: true } },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      { $addFields: { 
        id: '$_id', 
        property_title: '$property.title', 
        user_name: '$user.name',
        amount: '$transaction_amount',
        status: '$transaction_status',
        payment_method: '$payout_payment_method'
      } },
      { $project: { property: 0, user: 0 } },
      { $sort: { created_at: -1 } }
    ]);
    res.json(transactions);
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

module.exports = router;
