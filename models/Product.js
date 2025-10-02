// const mongoose = require('mongoose');

// const productSchema = new mongoose.Schema({
//   name: { type: String, required: true },
//   imageUrl: { type: String, default: '' },
//   description: { type: String, default: '' },
//   secretInfo: { type: String, required: true }, // revealed after purchase
//   country: { type: String, required: true },
//   platform: { type: String, required: true },
//   price: { type: Number, default: 0 },
//   isSold: { type: Boolean, default: false },
//   buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
// }, { timestamps: true });

// module.exports = mongoose.model('Product', productSchema);
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: String,
  description: String,
  price: Number,
  imageUrl: String,
  country: String,
  platform: String,
  secretInfo: String,

  isSold: { type: Boolean, default: false },   // 🔑 lock product
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // 🔑 track owner

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Product', productSchema);
