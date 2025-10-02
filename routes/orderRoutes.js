// routes/orderRoutes.js
const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Order = require('../models/Order');
const User = require('../models/User');

// ✅ Middleware to make sure user is logged in
function isLoggedIn(req, res, next) {
  if (!req.session.user) {
    req.session.flash = { error: 'Please login first' };
    return res.redirect('/login');
  }
  next();
}

// --- Buy product ---
router.post('/buy/:productId', isLoggedIn, async (req, res) => {
  try {
    const userId = req.session.user._id || req.session.user.id;
    const product = await Product.findById(req.params.productId);
    const user = await User.findById(userId);

    if (!product) {
      req.session.flash = { error: 'Product not found' };
      return res.redirect('/shop');
    }

    if (product.isSold) {
      req.session.flash = { error: 'This product is already sold' };
      return res.redirect('/shop');
    }

    if (user.walletBalance < product.price) {
      req.session.flash = { error: 'Insufficient wallet balance. Please fund your wallet.' };
      return res.redirect('/wallet');
    }

    // ✅ Deduct balance
    user.walletBalance -= product.price;
    await user.save();

    // ✅ Mark product as sold
    product.isSold = true;
    product.buyer = user._id;
    await product.save();

    // ✅ Create order with secretInfo
    const order = new Order({
      user: user._id,
      items: [
        {
          product: product.name,
          quantity: 1,
          price: product.price,
          secretInfo: product.secretInfo // 🔑 Save secret key/info
        }
      ],
      total: product.price,
      status: 'Completed'
    });
    await order.save();

    // ✅ Update session walletBalance
    req.session.user.walletBalance = user.walletBalance;

    // ✅ Redirect to orders page (not a missing view)
    req.session.flash = { success: `You successfully purchased ${product.name}` };
    res.redirect('/user/orders');
  } catch (err) {
    console.error('Buy error:', err);
    req.session.flash = { error: 'Purchase failed, please try again' };
    res.redirect('/shop');
  }
});

module.exports = router;
