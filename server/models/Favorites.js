const mongoose = require('mongoose');

const FavoritesSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
  property_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Properties' },
  created_at: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('Favorites', FavoritesSchema);
