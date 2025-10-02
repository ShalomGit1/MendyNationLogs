// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  passwordHash: {
    type: String,
    required: true
  },
  walletBalance: {
    type: Number,
    default: 0   // store in NGN major unit (₦)
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
