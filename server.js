require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const morgan = require('morgan');
const methodOverride = require('method-override');

// Import routes
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const orderRoutes = require('./routes/orderRoutes');
const walletRoutes = require('./routes/walletRoutes');

// ✅ Import and run MongoDB connection
const connectDB = require('./config/db');
connectDB();

const app = express();

// --------------------
// ⚙️ APP CONFIG
// --------------------
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// Middleware
app.use(morgan('dev'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));

// --------------------
// 🛡️ SESSIONS
// --------------------
const SESSION_SECRET = process.env.SESSION_SECRET || 'devsecret';
const MONGO_URI = process.env.MONGO_URI;

app.use(
  session({
    name: 'ecom.sid',
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    },
    store: MongoStore.create({
      mongoUrl: MONGO_URI,
      collectionName: 'sessions',
      ttl: 60 * 60 * 24, // 1 day
    }),
  })
);

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
app.use('/', paymentRoutes);
app.use('/', adminRoutes);
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
// 🚀 EXPORT FOR VERCEL
// --------------------
module.exports = app;

// --------------------
// 🧩 LOCAL DEVELOPMENT
// --------------------
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
  });
}
