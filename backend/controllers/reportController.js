const PDFDocument = require('pdfkit');
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const Report = require('../models/Report');

// @desc    Get monthly aggregated report summaries
// @route   GET /api/reports/monthly
// @access  Protected
const getMonthlyReport = async (req, res) => {
  try {
    const reports = await Report.find({ userId: req.userId }).sort({ month: 1 });
    res.json({ success: true, count: reports.length, data: reports });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error retrieving monthly report' });
  }
};

// @desc    Get detailed statistics for dashboard charts
// @route   GET /api/reports/dashboard-stats
// @access  Protected
const getDashboardStats = async (req, res) => {
  try {
    const userId = req.userId;
    
    // Calculate total balance, income, expense, savings overall
    const transactions = await Transaction.find({ userId });
    
    let totalIncome = 0;
    let totalExpense = 0;
    const categorySpending = {};
    const accountBalances = {};

    // Get current month details
    const today = new Date();
    const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const startOfMonth = new Date(`${currentMonthStr}-01T00:00:00.000Z`);
    const endOfMonth = new Date(new Date(startOfMonth).setMonth(startOfMonth.getMonth() + 1));

    let monthlyIncome = 0;
    let monthlyExpense = 0;

    transactions.forEach(t => {
      const isCurrentMonth = t.date >= startOfMonth && t.date < endOfMonth;
      
      // Multi-account calculations
      if (!accountBalances[t.account]) {
        accountBalances[t.account] = 0;
      }

      if (t.type === 'income') {
        totalIncome += t.amount;
        accountBalances[t.account] += t.amount;
        if (isCurrentMonth) monthlyIncome += t.amount;
      } else {
        totalExpense += t.amount;
        accountBalances[t.account] -= t.amount;
        if (isCurrentMonth) {
          monthlyExpense += t.amount;
          categorySpending[t.category] = (categorySpending[t.category] || 0) + t.amount;
        }
      }
    });

    const totalBalance = totalIncome - totalExpense;
    const monthlySavings = monthlyIncome - monthlyExpense;

    // Fetch notifications
    const Notification = require('../models/Notification');
    const recentNotifications = await Notification.find({ userId }).sort({ createdAt: -1 }).limit(5);

    // Calculate budget status
    const budgets = await Budget.find({ userId, month: currentMonthStr });
    const budgetTotal = budgets.reduce((sum, b) => sum + b.amount, 0);
    const budgetSpent = budgets.reduce((sum, b) => {
      const spent = categorySpending[b.category] || 0;
      return sum + spent;
    }, 0);

    // Return aggregated stats
    res.json({
      success: true,
      stats: {
        totalBalance,
        totalIncome,
        totalExpense,
        monthlyIncome,
        monthlyExpense,
        monthlySavings,
        budgetLimit: budgetTotal,
        budgetSpent
      },
      categorySpending,
      accountBalances,
      recentNotifications
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error compiling dashboard statistics' });
  }
};

// @desc    Calculate Financial Health Score
// @route   GET /api/reports/health-score
// @access  Protected
const getFinancialHealthScore = async (req, res) => {
  try {
    const userId = req.userId;
    const today = new Date();
    const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const startOfMonth = new Date(`${currentMonthStr}-01T00:00:00.000Z`);

    // Fetch transactions
    const monthlyTransactions = await Transaction.find({
      userId,
      date: { $gte: startOfMonth }
    });

    let income = 0;
    let expense = 0;
    const categoryExpenses = {};

    monthlyTransactions.forEach(t => {
      if (t.type === 'income') {
        income += t.amount;
      } else {
        expense += t.amount;
        categoryExpenses[t.category] = (categoryExpenses[t.category] || 0) + t.amount;
      }
    });

    // Score factor 1: Savings Rate (out of 40 points)
    // Formula: (Savings / Income) * 100
    // Ideal is 20% or more (yielding full 40 points). 0% or negative yields 5 points.
    let savingsScore = 5;
    const savingsRate = income > 0 ? ((income - expense) / income) * 100 : 0;
    if (savingsRate >= 20) savingsScore = 40;
    else if (savingsRate > 0) savingsScore = 5 + Math.round(savingsRate * 1.75);

    // Score factor 2: Budget Compliance (out of 40 points)
    // Look at budgets vs actual spend
    const budgets = await Budget.find({ userId, month: currentMonthStr });
    let budgetScore = 40; // Assume perfect compliance if no budgets set
    if (budgets.length > 0) {
      let brokenBudgetsCount = 0;
      budgets.forEach(b => {
        const spent = categoryExpenses[b.category] || 0;
        if (spent > b.amount) {
          brokenBudgetsCount++;
        }
      });
      const complianceRate = (budgets.length - brokenBudgetsCount) / budgets.length;
      budgetScore = Math.round(complianceRate * 40);
    }

    // Score factor 3: Account Balance Stability (out of 20 points)
    // Score based on whether balance is positive and substantial
    const allTransactions = await Transaction.find({ userId });
    const balance = allTransactions.reduce((acc, t) => acc + (t.type === 'income' ? t.amount : -t.amount), 0);
    let stabilityScore = 5;
    if (balance > 1000) stabilityScore = 20;
    else if (balance > 0) stabilityScore = 5 + Math.round((balance / 1000) * 15);

    const healthScore = savingsScore + budgetScore + stabilityScore;

    // Qualitative assessment
    let grade = 'Fair';
    let color = '#f59e0b'; // Amber
    let description = 'Your financial health is stable. Consider establishing lower spending limits or increasing monthly savings to build buffer funds.';

    if (healthScore >= 85) {
      grade = 'Excellent';
      color = '#10b981'; // Emerald
      description = 'Superb financial management! You have a high savings rate and are fully complying with your category budgets. Keep up the great work!';
    } else if (healthScore >= 70) {
      grade = 'Good';
      color = '#3b82f6'; // Blue
      description = 'Healthy budgeting and steady savings. You are within safe bounds, but minor tweaks to shopping or entertainment categories could push you into the top tier.';
    } else if (healthScore < 50) {
      grade = 'Needs Attention';
      color = '#ef4444'; // Red
      description = 'Your expenses exceed or are extremely close to your income. Recommend setting up strict budgets and reducing discretionary items immediately.';
    }

    res.json({
      success: true,
      healthScore,
      grade,
      color,
      details: {
        savingsRate: Math.round(savingsRate),
        savingsScore,
        budgetComplianceScore: budgetScore,
        stabilityScore,
        description
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error generating health score' });
  }
};

// @desc    Get AI Spending Insights
// @route   GET /api/reports/insights
// @access  Protected
const getAISpendingInsights = async (req, res) => {
  try {
    const userId = req.userId;
    const today = new Date();
    const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const startOfMonth = new Date(`${currentMonthStr}-01T00:00:00.000Z`);

    const currentTransactions = await Transaction.find({ userId, date: { $gte: startOfMonth } });
    
    let totalIncome = 0;
    let totalExpense = 0;
    const categorySpending = {};

    currentTransactions.forEach(t => {
      if (t.type === 'income') {
        totalIncome += t.amount;
      } else {
        totalExpense += t.amount;
        categorySpending[t.category] = (categorySpending[t.category] || 0) + t.amount;
      }
    });

    const insights = [];

    // General monthly overview insight
    if (totalExpense > totalIncome && totalIncome > 0) {
      insights.push({
        type: 'critical',
        title: 'Spending Exceeds Income',
        message: `Warning: You have spent $${totalExpense.toFixed(2)} which exceeds your logged income of $${totalIncome.toFixed(2)}. Consider reviewing discretionary subscription plans or postponing retail purchases.`,
        recommendation: 'Reduce shopping or dining limits by 20% next month.'
      });
    } else if (totalIncome > 0) {
      const savingsRate = ((totalIncome - totalExpense) / totalIncome) * 100;
      if (savingsRate >= 20) {
        insights.push({
          type: 'positive',
          title: 'Strong Savings Rate',
          message: `Great job! You saved $${(totalIncome - totalExpense).toFixed(2)} (${Math.round(savingsRate)}% of your income) this month. This meets the recommended benchmark for long-term wealth building.`,
          recommendation: 'Consider automating a portion of this into investments/savings goals.'
        });
      } else {
        insights.push({
          type: 'warning',
          title: 'Low Savings Margin',
          message: `You saved $${(totalIncome - totalExpense).toFixed(2)} (${Math.round(savingsRate)}% of your income) this month. Standard advice is to aim for a 20% buffer.`,
          recommendation: 'Analyze recurring food or utility costs for easy savings options.'
        });
      }
    }

    // Category specific insights
    let highestCategory = '';
    let highestAmount = 0;
    for (const cat in categorySpending) {
      if (categorySpending[cat] > highestAmount) {
        highestAmount = categorySpending[cat];
        highestCategory = cat;
      }
    }

    if (highestAmount > 0) {
      insights.push({
        type: 'info',
        title: `Primary Expense: ${highestCategory}`,
        message: `Your highest expense this month was in the "${highestCategory}" category, totaling $${highestAmount.toFixed(2)}, which constitutes ${Math.round((highestAmount / totalExpense) * 100)}% of your overall monthly expenses.`,
        recommendation: `Try to set a budget limit specifically for "${highestCategory}" to contain further expansion.`
      });
    }

    // Budget check insight
    const budgets = await Budget.find({ userId, month: currentMonthStr });
    let exceededBudgetsCount = 0;
    budgets.forEach(b => {
      const spent = categorySpending[b.category] || 0;
      if (spent > b.amount) {
        exceededBudgetsCount++;
      }
    });

    if (exceededBudgetsCount > 0) {
      insights.push({
        type: 'warning',
        title: `${exceededBudgetsCount} Budgets Over Limit`,
        message: `You have exceeded the set spending limits for ${exceededBudgetsCount} budget categories this month.`,
        recommendation: 'Check the Budget Planner and adjust limits or throttle spending.'
      });
    } else if (budgets.length > 0) {
      insights.push({
        type: 'positive',
        title: 'Budget Compliance Perfect',
        message: 'Excellent tracking! None of your active budget category allocations have been exceeded so far this month.',
        recommendation: 'Lock in this spending pattern for next month.'
      });
    }

    // Fallback if no insights generated
    if (insights.length === 0) {
      insights.push({
        type: 'info',
        title: 'Awaiting Financial Data',
        message: 'Add more transactions to trigger AI spending insights and custom budget optimization recommendation reports.',
        recommendation: 'Log your recurring income and housing expenses to establish a baseline.'
      });
    }

    res.json({ success: true, insights });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error generating AI insights' });
  }
};

// @desc    Export printable PDF statement of monthly report
// @route   GET /api/reports/export/pdf
// @access  Protected
const exportPDFReport = async (req, res) => {
  try {
    const userId = req.userId;
    const { month } = req.query;
    const activeMonth = month || new Date().toISOString().substring(0, 7);

    // Get transactions for that month
    const start = new Date(`${activeMonth}-01T00:00:00.000Z`);
    const end = new Date(new Date(start).setMonth(start.getMonth() + 1));

    const transactions = await Transaction.find({
      userId,
      date: { $gte: start, $lt: end }
    }).sort({ date: -1 });

    const budgets = await Budget.find({ userId, month: activeMonth });

    let totalIncome = 0;
    let totalExpense = 0;
    const categorySummary = {};

    transactions.forEach(t => {
      if (t.type === 'income') {
        totalIncome += t.amount;
      } else {
        totalExpense += t.amount;
        categorySummary[t.category] = (categorySummary[t.category] || 0) + t.amount;
      }
    });

    const savings = totalIncome - totalExpense;

    // Initialize PDF Document
    const doc = new PDFDocument({ margin: 50 });

    // Stream PDF directly to client response
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=financial_report_${activeMonth}.pdf`);
    doc.pipe(res);

    // PDF HEADER
    doc.fillColor('#1e3a8a').fontSize(26).text('SMART EXPENSE TRACKER', 50, 50, { bold: true });
    doc.fillColor('#4b5563').fontSize(12).text(`Monthly Financial Statement — ${activeMonth}`, 50, 80);
    
    // Draw horizontal line
    doc.moveTo(50, 100).lineTo(550, 100).strokeColor('#e5e7eb').lineWidth(2).stroke();

    // FINANCIAL STATS SUMMARY CARDS
    doc.y = 120;
    doc.fillColor('#1f2937').fontSize(14).text('Overview Summary', 50, doc.y, { underline: true });
    
    doc.y += 20;
    // Income Card
    doc.rect(50, doc.y, 150, 60).fillColor('#eff6ff').fill();
    doc.fillColor('#1e3a8a').fontSize(10).text('TOTAL INCOME', 60, doc.y + 12);
    doc.fillColor('#0369a1').fontSize(14).text(`$${totalIncome.toFixed(2)}`, 60, doc.y + 30, { bold: true });

    // Expense Card
    doc.rect(215, doc.y, 150, 60).fillColor('#fef2f2').fill();
    doc.fillColor('#991b1b').fontSize(10).text('TOTAL EXPENSE', 225, doc.y + 12);
    doc.fillColor('#b91c1c').fontSize(14).text(`$${totalExpense.toFixed(2)}`, 225, doc.y + 30, { bold: true });

    // Savings Card
    doc.rect(380, doc.y, 170, 60).fillColor(savings >= 0 ? '#ecfdf5' : '#fff7ed').fill();
    doc.fillColor(savings >= 0 ? '#065f46' : '#9a3412').fontSize(10).text('NET SAVINGS', 390, doc.y + 12);
    doc.fillColor(savings >= 0 ? '#047857' : '#c2410c').fontSize(14).text(`$${savings.toFixed(2)}`, 390, doc.y + 30, { bold: true });

    // CATEGORY EXPENSE TABLE
    doc.y += 90;
    doc.fillColor('#1f2937').fontSize(14).text('Spending by Category', 50, doc.y, { underline: true });
    
    doc.y += 20;
    doc.fontSize(10).fillColor('#4b5563');
    
    // Headers
    doc.text('Category', 70, doc.y, { bold: true });
    doc.text('Budget Limit', 250, doc.y, { bold: true });
    doc.text('Spent Amount', 380, doc.y, { bold: true });
    doc.text('Status', 490, doc.y, { bold: true });
    
    doc.moveTo(50, doc.y + 15).lineTo(550, doc.y + 15).strokeColor('#e5e7eb').lineWidth(1).stroke();

    let tableY = doc.y + 25;
    const categoriesList = Object.keys(categorySummary);

    if (categoriesList.length === 0) {
      doc.text('No expenses logged for this month.', 70, tableY);
      tableY += 20;
    } else {
      categoriesList.forEach(cat => {
        const spent = categorySummary[cat];
        const matchB = budgets.find(b => b.category === cat);
        const budgetLimit = matchB ? `$${matchB.amount.toFixed(2)}` : 'N/A';
        
        let status = 'Within Budget';
        if (matchB && spent > matchB.amount) {
          status = 'Exceeded';
        }

        doc.text(cat, 70, tableY);
        doc.text(budgetLimit, 250, tableY);
        doc.text(`$${spent.toFixed(2)}`, 380, tableY);
        doc.text(status, 490, tableY);
        
        tableY += 20;
      });
    }

    // RECENT TRANSACTIONS TABLE
    doc.y = tableY + 20;
    if (doc.y > 650) { // Check if we need page break
      doc.addPage();
      doc.y = 50;
    }
    
    doc.fillColor('#1f2937').fontSize(14).text('Recent Transactions Ledger', 50, doc.y, { underline: true });
    
    doc.y += 20;
    doc.fontSize(9).fillColor('#4b5563');
    
    doc.text('Date', 60, doc.y, { bold: true });
    doc.text('Title/Merchant', 130, doc.y, { bold: true });
    doc.text('Type', 280, doc.y, { bold: true });
    doc.text('Category', 350, doc.y, { bold: true });
    doc.text('Account', 430, doc.y, { bold: true });
    doc.text('Amount', 500, doc.y, { bold: true });

    doc.moveTo(50, doc.y + 12).lineTo(550, doc.y + 12).strokeColor('#e5e7eb').lineWidth(1).stroke();

    tableY = doc.y + 20;
    
    const sliceTx = transactions.slice(0, 15); // Show top 15 in statement
    
    if (sliceTx.length === 0) {
      doc.text('No transaction records found.', 60, tableY);
    } else {
      sliceTx.forEach(t => {
        const dateStr = t.date.toISOString().split('T')[0];
        doc.text(dateStr, 60, tableY);
        doc.text(t.title, 130, tableY);
        doc.text(t.type.toUpperCase(), 280, tableY);
        doc.text(t.category, 350, tableY);
        doc.text(t.account, 430, tableY);
        doc.text(`$${t.amount.toFixed(2)}`, 500, tableY, { bold: true });

        tableY += 16;
        if (tableY > 700) {
          doc.addPage();
          tableY = 50;
        }
      });
    }

    // FOOTER SIGNATURE
    doc.y = tableY + 40;
    if (doc.y > 720) {
      doc.addPage();
      doc.y = 50;
    }
    doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor('#e5e7eb').lineWidth(1).stroke();
    doc.fillColor('#9ca3af').fontSize(8).text('This is an automatically compiled financial statement report issued by Smart Expense Tracker application.', 50, doc.y + 10, { align: 'center' });

    // End document write
    doc.end();

  } catch (error) {
    console.error(error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Server error generating PDF statement' });
    }
  }
};

module.exports = {
  getMonthlyReport,
  getDashboardStats,
  getFinancialHealthScore,
  getAISpendingInsights,
  exportPDFReport
};
