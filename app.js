require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const mongoose = require('mongoose');
const morgan = require('morgan');
const methodOverride = require('method-override');

const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const orderRoutes = require('./routes/orderRoutes');
const walletRoutes = require('./routes/walletRoutes');

const app = express();

// ---- Database ----
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ecom_demo';
mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// ---- View engine & static ----
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// ---- Middleware ----
app.use(morgan('dev'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));

// ---- Sessions (must come BEFORE locals middleware) ----
const SESSION_SECRET = process.env.SESSION_SECRET || 'devsecret';
app.use(session({
  name: 'ecom.sid',
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, maxAge: 1000 * 60 * 60 * 24 }, // 1 day
  store: MongoStore.create({ mongoUrl: MONGO_URI, collectionName: 'sessions' })
}));

// ---- Locals for templates ----
app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  res.locals.isAdmin = req.session.isAdmin || false;
  res.locals.flash = req.session.flash || {};
  delete req.session.flash;
  next();
});

// ---- Home ----
app.get('/', (req, res) => {
  res.render('index', { title: 'Home' });
});

// ---- Routes ----
app.use('/', userRoutes);
app.use('/', paymentRoutes);
app.use('/', adminRoutes);
app.use('/', orderRoutes);
app.use('/', walletRoutes);

// ---- 404 ----
app.use((req, res, next) => {
  res.status(404).render('404', { title: 'Not Found' });
});

// ---- Error handler ----
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render('500', { 
    title: 'Server Error',
    error: err.message || 'Something broke!',
    currentUser: req.session.user || null,
    isAdmin: req.session.isAdmin || false
  });
});

// ---- Start ----
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
