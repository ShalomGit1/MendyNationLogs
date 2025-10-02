// const mongoose = require('mongoose');

// const transactionSchema = new mongoose.Schema({
//   user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
//   product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
//   amount: { type: Number, required: true },
//   status: { type: String, enum: ['success', 'failed'], default: 'success' }
// }, { timestamps: true });

// module.exports = mongoose.model('Transaction', transactionSchema);
// models/Transaction.js
// models/Transaction.js
const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  reference: { type: String, required: true, unique: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  amount: { type: Number, required: true }, // stored in Naira (not Kobo)
  status: { type: String, enum: ['initialized','success','failed'], default: 'initialized' },
  metadata: { type: mongoose.Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Transaction', transactionSchema);
