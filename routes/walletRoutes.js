// // routes/walletRoutes.js
// const express = require('express');
// const axios = require('axios');
// const crypto = require('crypto');

// const User = require('../models/User');
// const Transaction = require('../models/Transaction');

// const router = express.Router();

// const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
// const PAYSTACK_BASE = 'https://api.paystack.co';

// // Auth middleware (adapt to your auth system)
// function requireAuth(req, res, next) {
//   if (!req.session?.user) return res.redirect('/login');
//   next();
// }

// // Wallet page
// router.get('/wallet', requireAuth, async (req, res) => {
//   const user = await User.findById(req.session.user.id);
//   res.render('wallet', { 
//     title: 'My Wallet',
//     currentUser: user 
//   });
// });



// // Initialize funding
// router.post('/wallet/fund', requireAuth, async (req, res) => {
//   try {
//     const { amount } = req.body;
//     const reference = 'fund_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);

//     await Transaction.create({
//       reference,
//       user: req.session.user.id,
//       amount,
//       status: 'initialized'
//     });

//     const resp = await axios.post(`${PAYSTACK_BASE}/transaction/initialize`, {
//       email: req.session.user.email,
//       amount: amount * 100, // convert to kobo
//       reference,
//       callback_url: `${req.protocol}://${req.get('host')}/wallet/callback`
//     }, {
//       headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` }
//     });

//     res.redirect(resp.data.data.authorization_url);
//   } catch (err) {
//     console.error(err.response?.data || err.message);
//     req.session.flash = { error: 'Error initializing payment' };
//     res.redirect('/wallet');
//   }
// });

// // Callback after payment
// router.get('/wallet/callback', requireAuth, async (req, res) => {
//   try {
//     const { reference } = req.query;

//     const verify = await axios.get(`${PAYSTACK_BASE}/transaction/verify/${reference}`, {
//       headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` }
//     });

//     const data = verify.data.data;
//     if (data.status === 'success') {
//       await Transaction.findOneAndUpdate({ reference }, { status: 'success', metadata: data });
//       await User.findByIdAndUpdate(req.session.user.id, { $inc: { walletBalance: data.amount / 100 } });

//       req.session.flash = { success: `Wallet funded with ₦${data.amount/100}` };
//     } else {
//       req.session.flash = { error: 'Payment not successful' };
//     }
//     res.redirect('/wallet');
//   } catch (err) {
//     console.error(err.response?.data || err.message);
//     req.session.flash = { error: 'Payment verification failed' };
//     res.redirect('/wallet');
//   }
// });

// // Webhook for Paystack
// router.post('/webhook/paystack', express.raw({ type: 'application/json' }), async (req, res) => {
//   try {
//     const signature = req.headers['x-paystack-signature'];
//     const hash = crypto.createHmac('sha512', PAYSTACK_SECRET).update(req.body).digest('hex');
//     if (hash !== signature) return res.status(400).send('Invalid signature');

//     const event = JSON.parse(req.body.toString());
//     if (event.event === 'charge.success') {
//       const { reference, amount, customer } = event.data;

//       let tx = await Transaction.findOne({ reference });
//       if (!tx || tx.status !== 'success') {
//         if (tx) {
//           tx.status = 'success';
//           tx.metadata = event.data;
//           await tx.save();
//         } else {
//           tx = await Transaction.create({
//             reference,
//             user: null,
//             amount: amount/100,
//             status: 'success',
//             metadata: event.data
//           });
//         }
//         const user = await User.findOne({ email: customer.email });
//         if (user) {
//           await User.findByIdAndUpdate(user._id, { $inc: { walletBalance: amount/100 } });
//         }
//       }
//     }
//     res.sendStatus(200);
//   } catch (err) {
//     console.error(err);
//     res.sendStatus(500);
//   }
// });
// router.get('/', async (req, res) => {
//   if (!req.session.userId) {
//     return res.redirect('/login');
//   }

//   const user = await User.findById(req.session.userId);
//   res.render('wallet', { 
//     title: 'My Wallet',   // ✅ Add this
//     currentUser: user 
//   });
// });


// module.exports = router;
// routes/walletRoutes.js
const express = require('express');
const axios = require('axios');
const crypto = require('crypto');

const User = require('../models/User');
const Transaction = require('../models/Transaction');

const router = express.Router();

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_BASE = 'https://api.paystack.co';

// Auth middleware (adapt to your auth system)
function requireAuth(req, res, next) {
  if (!req.session?.user) {
    req.session.flash = { error: 'Please log in to continue.' };
    return res.redirect('/login');
  }
  next();
}

// Wallet display page
router.get('/wallet', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.session.user.id);
    if (!user) {
      req.session.flash = { error: 'User not found.' };
      return res.redirect('/login');
    }
    res.render('wallet', { title: 'My Wallet', currentUser: user, flash: req.session.flash });
    delete req.session.flash;
  } catch (err) {
    console.error('Wallet page error', err);
    req.session.flash = { error: 'Could not open wallet.' };
    res.redirect('/');
  }
});

// Initialize Paystack transaction
router.post('/wallet/fund', requireAuth, async (req, res) => {
  try {
    const amount = Number(req.body.amount);
    if (!amount || amount < 1) {
      req.session.flash = { error: 'Enter a valid amount.' };
      return res.redirect('/wallet');
    }

    const reference = 'fund_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);

    // store transaction record
    await Transaction.create({
      reference,
      user: req.session.user.id,
      amount, // Naira
      status: 'initialized'
    });

    // initialize via Paystack API (amount in Kobo)
    const resp = await axios.post(`${PAYSTACK_BASE}/transaction/initialize`, {
      email: req.session.user.email,
      amount: Math.round(amount * 100),
      reference,
      callback_url: `${req.protocol}://${req.get('host')}/wallet/callback?ref=${reference}`
    }, {
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET}`,
        'Content-Type': 'application/json'
      }
    });

    const { authorization_url } = resp.data.data;
    return res.redirect(authorization_url);
  } catch (err) {
    console.error('Init payment error:', err.response?.data || err.message);
    req.session.flash = { error: 'Error initializing payment' };
    return res.redirect('/wallet');
  }
});

// Callback route Paystack redirects to after payment
router.get('/wallet/callback', requireAuth, async (req, res) => {
  try {
    // prefer reference from query ref param
    const reference = req.query.reference || req.query.ref || req.query.reference;
    if (!reference) {
      req.session.flash = { error: 'No reference provided' };
      return res.redirect('/wallet');
    }

    const verify = await axios.get(`${PAYSTACK_BASE}/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` }
    });

    const data = verify.data.data;
    if (data.status === 'success') {
      // update tx & user wallet atomically
      const tx = await Transaction.findOneAndUpdate(
        { reference },
        { status: 'success', metadata: data },
        { new: true }
      );

      if (tx) {
        // amount returned from paystack is in kobo
        const naira = (data.amount || 0) / 100;
        await User.findByIdAndUpdate(tx.user, { $inc: { walletBalance: naira } });
      }

      req.session.flash = { success: `Wallet funded with ₦${(data.amount/100).toFixed(2)}` };
    } else {
      req.session.flash = { error: 'Payment not successful' };
    }
    return res.redirect('/wallet');
  } catch (err) {
    console.error('Callback verify error:', err.response?.data || err.message);
    req.session.flash = { error: 'Payment verification failed' };
    return res.redirect('/wallet');
  }
});

// Webhook - Paystack will POST here
// IMPORTANT: must receive raw body to verify signature; express.raw used
router.post('/webhook/paystack', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['x-paystack-signature'];
    const hash = crypto.createHmac('sha512', PAYSTACK_SECRET).update(req.body).digest('hex');

    if (hash !== signature) {
      console.warn('Invalid Paystack signature');
      return res.status(400).send('Invalid signature');
    }

    const event = JSON.parse(req.body.toString());
    // handle successful charge
    if (event.event === 'charge.success') {
      const { reference, amount, customer } = event.data;
      const amountNaira = (amount || 0) / 100;

      let tx = await Transaction.findOne({ reference });
      if (!tx) {
        // create a new tx record (if you prefer)
        tx = await Transaction.create({
          reference,
          user: null,
          amount: amountNaira,
          status: 'success',
          metadata: event.data
        });
      } else if (tx.status !== 'success') {
        tx.status = 'success';
        tx.metadata = event.data;
        await tx.save();
      }

      // credit user's wallet by email if tx.user missing
      if (tx.user) {
        await User.findByIdAndUpdate(tx.user, { $inc: { walletBalance: amountNaira } });
      } else if (customer?.email) {
        const user = await User.findOne({ email: customer.email });
        if (user) {
          await User.findByIdAndUpdate(user._id, { $inc: { walletBalance: amountNaira } });
        }
      }
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('Webhook error', err);
    res.sendStatus(500);
  }
});

module.exports = router;
