require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const mongoose = require('mongoose');
const morgan = require('morgan');
const methodOverride = require('method-override');

// Import routes
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const orderRoutes = require('./routes/orderRoutes');
const walletRoutes = require('./routes/walletRoutes');

const app = express();
const MONGO_URI = process.env.MONGO_URI;
const SESSION_SECRET = process.env.SESSION_SECRET || 'devsecret';

// --------------------
// ⚙️ VIEW + STATIC SETUP
// --------------------
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(morgan('dev'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));

// --------------------
// 🛡️ TRUST PROXY (important for HTTPS cookies)
// --------------------
app.set('trust proxy', 1);

// --------------------
// 🧩 CONNECT TO MONGODB
// --------------------
mongoose.connect(MONGO_URI, {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
})
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// --------------------
// 🧠 SESSION SETUP
// --------------------
app.use(session({
  name: 'ecom.sid',
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24, // 1 day
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production', // only https in production
  },
  store: MongoStore.create({
    mongoUrl: MONGO_URI,
    collectionName: 'sessions',
    ttl: 24 * 60 * 60,
  }),
}));

// --------------------
// 🌐 LOCALS
// --------------------
app.use((req, res, next) => {
  res.locals.currentUser = req.session?.user || null;
  res.locals.isAdmin = req.session?.isAdmin || false;
  res.locals.flash = req.session?.flash || {};
  if (req.session) delete req.session.flash;
  next();
});

// --------------------
// 🏠 ROUTES
// --------------------
app.get('/', (req, res) => res.render('index', { title: 'Home' }));
app.use('/', userRoutes);
app.use('/', adminRoutes);
app.use('/', paymentRoutes);
app.use('/', orderRoutes);
app.use('/', walletRoutes);

// --------------------
// 🚫 404 + 💥 ERROR
// --------------------
app.use((req, res) => res.status(404).render('404', { title: 'Not Found' }));
app.use((err, req, res, next) => {
  console.error('🔥 Server Error:', err);
  res.status(500).render('500', {
    title: 'Server Error',
    error: err.message || 'Something broke!',
    currentUser: req.session?.user || null,
    isAdmin: req.session?.isAdmin || false,
    flash: res.locals.flash || {},
  });
});

// --------------------
// 🚀 START LOCALLY ONLY
// --------------------
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
}

// --------------------
// 📦 EXPORT FOR VERCEL
// --------------------
module.exports = app;
