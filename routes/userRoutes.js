// routes/userRoutes.js 
const express = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');

const router = express.Router();

// ---- Middleware to protect auth-only pages ----
function requireAuth(req, res, next) {
  if (!req.session.user) {
    req.session.flash = { error: 'Please log in to continue.' };
    return res.redirect('/login');
  }
  next();
}

// ---- Auth ----
router.get('/signup', (req, res) => {
  res.render('signup', { title: 'Sign Up' });
});

router.post(
  '/signup',
  body('email').isEmail().withMessage('Valid email is required.'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters.'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      req.session.flash = {
        error: errors.array().map(e => e.msg).join(' ')
      };
      return res.redirect('/signup');
    }

    const { email, password } = req.body;
    try {
      const existing = await User.findOne({ email });
      if (existing) {
        req.session.flash = { error: 'Email already registered.' };
        return res.redirect('/signup');
      }

      const hash = await bcrypt.hash(password, 10);
      const user = await User.create({ email, passwordHash: hash });

      // ✅ Save session on signup
      req.session.user = { id: user._id, email: user.email };

      req.session.flash = { success: 'Signup successful. Welcome!' };
      res.redirect('/shop');
    } catch (err) {
      console.error(err);
      req.session.flash = { error: 'Signup failed. Try again.' };
      res.redirect('/signup');
    }
  }
);

router.get('/login', (req, res) => {
  res.render('login', { title: 'Log In' });
});

router.post(
  '/login',
  body('email').isEmail().withMessage('Valid email is required.'),
  body('password').notEmpty().withMessage('Password is required.'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      req.session.flash = {
        error: errors.array().map(e => e.msg).join(' ')
      };
      return res.redirect('/login');
    }

    const { email, password } = req.body;
    try {
      const user = await User.findOne({ email });
      if (!user) {
        req.session.flash = { error: 'Invalid credentials.' };
        return res.redirect('/login');
      }

      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) {
        req.session.flash = { error: 'Invalid credentials.' };
        return res.redirect('/login');
      }

      // ✅ Save session on login
      req.session.user = { id: user._id, email: user.email };

      req.session.flash = { success: 'Logged in successfully.' };
      res.redirect('/shop');
    } catch (err) {
      console.error(err);
      req.session.flash = { error: 'Login failed. Try again.' };
      res.redirect('/login');
    }
  }
);

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

// ---- Shop ----
router.get('/shop', async (req, res) => {
  const { country, platform } = req.query;
  const filter = {};
  if (country) filter.country = country;
  if (platform) filter.platform = platform;

  try {
    const products = await Product.find(filter).sort({ createdAt: -1 });
    const distinctCountries = await Product.distinct('country');
    const distinctPlatforms = await Product.distinct('platform');

    res.render('shop', {
      title: 'Shop',
      products,
      filters: { country: country || '', platform: platform || '' },
      options: { countries: distinctCountries, platforms: distinctPlatforms }
    });
  } catch (err) {
    console.error(err);
    req.session.flash = { error: 'Could not load products.' };
    res.redirect('/');
  }
});

// ---- Buy Product ----

// ---- User Order History ----
router.get('/user/orders', requireAuth, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.session.user.id }).sort({
      createdAt: -1
    });
    res.render('user/orders', { title: 'My Orders', orders });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading orders');
  }
});

module.exports = router;
