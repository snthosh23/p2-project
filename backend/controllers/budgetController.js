const Budget = require('../models/Budget');
const Transaction = require('../models/Transaction');

// @desc    Get all budgets and current spending status
// @route   GET /api/budgets
// @access  Protected
const getBudgets = async (req, res) => {
  try {
    const { month } = req.query;
    
    // Default to current month (YYYY-MM)
    const activeMonth = month || new Date().toISOString().substring(0, 7);

    // Retrieve budgets
    const budgets = await Budget.find({ userId: req.userId, month: activeMonth });

    // Calculate current spending for each category in the active month
    const start = new Date(`${activeMonth}-01T00:00:00.000Z`);
    const end = new Date(new Date(start).setMonth(start.getMonth() + 1));

    const transactions = await Transaction.find({
      userId: req.userId,
      type: 'expense',
      date: { $gte: start, $lt: end }
    });

    const expensesByCategory = {};
    transactions.forEach(t => {
      expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + t.amount;
    });

    const data = budgets.map(b => {
      const spent = expensesByCategory[b.category] || 0;
      return {
        _id: b._id,
        category: b.category,
        amount: b.amount,
        spent,
        remaining: b.amount - spent,
        percentUsed: b.amount > 0 ? (spent / b.amount) * 100 : 0,
        month: b.month
      };
    });

    res.json({ success: true, count: data.length, data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error retrieving budgets' });
  }
};

// @desc    Create or update a budget
// @route   POST /api/budgets
// @access  Protected
const setBudget = async (req, res) => {
  try {
    const { category, amount, month } = req.body;

    if (!category || amount === undefined || !month) {
      return res.status(400).json({ success: false, message: 'Please provide category, amount and month' });
    }

    // Upsert budget
    const budget = await Budget.findOneAndUpdate(
      { userId: req.userId, category, month },
      { amount },
      { upsert: true, new: true, runValidators: true }
    );

    res.status(201).json({ success: true, data: budget });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error creating or updating budget' });
  }
};

// @desc    Get budget recommendations based on 50/30/20 rule
// @route   GET /api/budgets/recommendations
// @access  Protected
const getRecommendations = async (req, res) => {
  try {
    // Look at last month's stats or default values
    const today = new Date();
    const lastMonth = new Date(today.setMonth(today.getMonth() - 1));
    const monthStr = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;

    // Get last month's income
    const start = new Date(`${monthStr}-01T00:00:00.000Z`);
    const end = new Date(new Date(start).setMonth(start.getMonth() + 1));

    const transactions = await Transaction.find({
      userId: req.userId,
      date: { $gte: start, $lt: end }
    });

    let lastMonthIncome = 0;
    transactions.forEach(t => {
      if (t.type === 'income') {
        lastMonthIncome += t.amount;
      }
    });

    // Fallback if no income logged last month
    if (lastMonthIncome === 0) {
      lastMonthIncome = 3000; // default benchmark
    }

    // Recommendations based on 50/30/20 rule
    // 50% Needs: Housing, Groceries, Utilities, Health
    // 30% Wants: Dining Out, Shopping, Entertainment, Travel
    // 20% Savings/Investments
    const needsLimit = lastMonthIncome * 0.50;
    const wantsLimit = lastMonthIncome * 0.30;
    const savingsLimit = lastMonthIncome * 0.20;

    const recommendations = [
      { category: 'Rent/Housing', suggestedAmount: Math.round(needsLimit * 0.60), type: 'Need' },
      { category: 'Groceries', suggestedAmount: Math.round(needsLimit * 0.25), type: 'Need' },
      { category: 'Transportation', suggestedAmount: Math.round(needsLimit * 0.15), type: 'Need' },
      { category: 'Food & Dining', suggestedAmount: Math.round(wantsLimit * 0.40), type: 'Want' },
      { category: 'Shopping', suggestedAmount: Math.round(wantsLimit * 0.35), type: 'Want' },
      { category: 'Entertainment', suggestedAmount: Math.round(wantsLimit * 0.25), type: 'Want' },
      { category: 'Savings', suggestedAmount: Math.round(savingsLimit), type: 'Savings' }
    ];

    res.json({
      success: true,
      incomeBasis: lastMonthIncome,
      month: monthStr,
      recommendations
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error generating budget recommendations' });
  }
};

module.exports = {
  getBudgets,
  setBudget,
  getRecommendations
};
