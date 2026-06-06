const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');
const path = require('path');

const connectDB = require('./config/db');
const Category = require('./models/Category');

// Load environment variables
dotenv.config();

// Connect to Database
connectDB();

const app = express();

// Security Middlewares
// Customize Helmet content security policy to allow Chart.js and FontAwesome CDN assets in frontend if served together
app.use(helmet({
  contentSecurityPolicy: false
}));

app.use(cors({
  origin: '*', // Allow all origins for development/hosting separation
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Logging Middleware
if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
  app.use(morgan('dev'));
}

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // limit each IP to 300 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes'
  }
});
app.use('/api/', limiter);

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/budgets', require('./routes/budgets'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/notifications', require('./routes/notifications'));

// Root route
app.get('/api', (req, res) => {
  res.json({ message: 'Welcome to the Smart Expense Tracker API. Server is operational.' });
});

// Seed default categories
const seedCategories = async () => {
  try {
    const count = await Category.countDocuments();
    if (count === 0) {
      const defaults = [
        { name: 'Salary', icon: 'fa-wallet', type: 'income' },
        { name: 'Freelance', icon: 'fa-laptop-code', type: 'income' },
        { name: 'Investments', icon: 'fa-chart-line', type: 'income' },
        { name: 'Other Income', icon: 'fa-coins', type: 'income' },
        
        { name: 'Food & Dining', icon: 'fa-utensils', type: 'expense' },
        { name: 'Groceries', icon: 'fa-basket-shopping', type: 'expense' },
        { name: 'Rent/Housing', icon: 'fa-house-chimney', type: 'expense' },
        { name: 'Utilities', icon: 'fa-bolt', type: 'expense' },
        { name: 'Transportation', icon: 'fa-car', type: 'expense' },
        { name: 'Entertainment', icon: 'fa-film', type: 'expense' },
        { name: 'Shopping', icon: 'fa-bag-shopping', type: 'expense' },
        { name: 'Health/Medical', icon: 'fa-heart-pulse', type: 'expense' },
        { name: 'Education', icon: 'fa-graduation-cap', type: 'expense' },
        { name: 'Travel', icon: 'fa-plane', type: 'expense' },
        { name: 'Miscellaneous', icon: 'fa-tags', type: 'expense' }
      ];
      await Category.insertMany(defaults);
      console.log('Category seed templates populated successfully.');
    }
  } catch (error) {
    console.error('Error seeding category options:', error);
  }
};

// Seed categories on start
seedCategories();

// Error Handler Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running in mode on port ${PORT}`);
});
