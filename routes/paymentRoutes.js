const express = require('express');
const { body, validationResult } = require('express-validator');
const Product = require('../models/Product');
const Transaction = require('../models/Transaction');

const router = express.Router();

function requireAuth(req, res, next) {
  if (!req.session.user) {
    req.session.flash = { error: 'Please log in to continue.' };
    return res.redirect('/login');
  }
  next();
}

// Payment page
router.get('/payment/:productId', requireAuth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.productId);
    if (!product) {
      req.session.flash = { error: 'Product not found.' };
      return res.redirect('/shop');
    }
    if (product.isSold && (!product.buyer || product.buyer.toString() !== req.session.user.id)) {
      req.session.flash = { error: 'Product already sold.' };
      return res.redirect('/shop');
    }
    res.render('payment', { title: 'Payment', product });
  } catch (err) {
    console.error(err);
    req.session.flash = { error: 'Could not load payment page.' };
    res.redirect('/shop');
  }
});

// Mock "Pay" action
router.post('/pay',
  requireAuth,
  body('productId').notEmpty().withMessage('Product ID required.'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      req.session.flash = { error: errors.array().map(e => e.msg).join(' ') };
      return res.redirect('/shop');
    }
    const { productId } = req.body;
    try {
      const product = await Product.findById(productId);
      if (!product) {
        req.session.flash = { error: 'Product not found.' };
        return res.redirect('/shop');
      }
      if (product.isSold && (!product.buyer || product.buyer.toString() !== req.session.user.id)) {
        req.session.flash = { error: 'Product already sold.' };
        return res.redirect('/shop');
      }

      // Simulate payment success
      const amount = product.price || 0;
      await Transaction.create({
        user: req.session.user.id,
        product: product._id,
        amount,
        status: 'success'
      });

      product.isSold = true;
      product.buyer = req.session.user.id;
      await product.save();

      req.session.flash = { success: 'Payment successful! Secret unlocked below.' };
      res.redirect('/payment/' + product._id);
    } catch (err) {
      console.error(err);
      req.session.flash = { error: 'Payment failed.' };
      res.redirect('/shop');
    }
  }
);

module.exports = router;
