const express = require('express');
const { body, validationResult } = require('express-validator');
const Product = require('../models/Product');
const Order = require('../models/Order');
const User = require('../models/User'); // make sure you have this model

const router = express.Router();

// ---- Middleware to check admin ----
function requireAdmin(req, res, next) {
  if (!req.session.isAdmin) {
    req.session.flash = { error: 'Admin access required.' };
    return res.redirect('/admin-login');
  }
  next();
}

// ---- Admin Auth via passcode ----
router.get('/admin-login', (req, res) => {
  res.render('admin_login', { title: 'Admin Login' });
});

router.post(
  '/admin-login',
  body('passcode').notEmpty().withMessage('Passcode is required.'),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      req.session.flash = { error: errors.array().map(e => e.msg).join(' ') };
      return res.redirect('/admin-login');
    }
    const { passcode } = req.body;
    if (passcode === process.env.ADMIN_PASSCODE) {
      req.session.isAdmin = true;
      req.session.flash = { success: 'Admin authenticated.' };
      return res.redirect('/admin');
    }
    req.session.flash = { error: 'Invalid passcode.' };
    res.redirect('/admin-login');
  }
);

router.post('/admin-logout', (req, res) => {
  req.session.isAdmin = false;
  req.session.flash = { success: 'Admin logged out.' };
  res.redirect('/');
});

// ---- Admin Panel (Products) ----
router.get('/admin', requireAdmin, async (req, res) => {
  const products = await Product.find().sort({ createdAt: -1 });
  res.render('admin_panel', { title: 'Admin Panel', products });
});

router.post(
  '/admin/products',
  requireAdmin,
  body('name').notEmpty().withMessage('Name is required.'),
  body('secretInfo').notEmpty().withMessage('Secret info is required.'),
  body('country').notEmpty().withMessage('Country is required.'),
  body('platform').notEmpty().withMessage('Platform is required.'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      req.session.flash = { error: errors.array().map(e => e.msg).join(' ') };
      return res.redirect('/admin');
    }
    try {
      const { name, imageUrl, description, secretInfo, country, platform, price } = req.body;
      await Product.create({
        name,
        imageUrl,
        description,
        secretInfo,
        country,
        platform,
        price: Number(price || 0),
      });
      req.session.flash = { success: 'Product added.' };
      res.redirect('/admin');
    } catch (err) {
      console.error(err);
      req.session.flash = { error: 'Failed to add product.' };
      res.redirect('/admin');
    }
  }
);

router.post('/admin/products/:id/delete', requireAdmin, async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    req.session.flash = { success: 'Product deleted.' };
  } catch (err) {
    console.error(err);
    req.session.flash = { error: 'Failed to delete product.' };
  }
  res.redirect('/admin');
});

// ---- Admin Orders ----
router.get('/admin/orders', requireAdmin, async (req, res) => {
  const orders = await Order.find().populate('user');
  console.log("Orders found:", JSON.stringify(orders, null, 2)); // 🐛 debug
  res.render('admin/orders', { title: 'All Orders', orders });
});


// ---- Admin Users ----
router.get('/admin/users', requireAdmin, async (req, res) => {
  const users = await User.find();
  res.render('admin/users', { title: 'All Users', users });
});

module.exports = router;
