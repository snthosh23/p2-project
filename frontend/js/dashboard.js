let charts = {};

document.addEventListener('DOMContentLoaded', () => {
  // Wait a fraction of a second to ensure dynamic layouts (theme preferences) are set up
  setTimeout(() => {
    loadDashboardData();
  }, 100);
});

async function loadDashboardData() {
  try {
    // 1. Fetch main dashboard statistics
    const res = await apiFetch('/reports/dashboard-stats');
    if (!res.success) {
      showToast('Could not fetch financial statistics', 'danger');
      return;
    }

    const { stats, categorySpending, accountBalances } = res;
    
    // Check and set Active Month Label
    const currentMonthName = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
    document.getElementById('income-month-lbl').innerText = `Income in ${currentMonthName}`;
    document.getElementById('expense-month-lbl').innerText = `Spending in ${currentMonthName}`;
    
    // Update counters
    document.getElementById('total-balance').innerText = formatCurrency(stats.totalBalance);
    document.getElementById('total-income').innerText = formatCurrency(stats.monthlyIncome);
    document.getElementById('total-expense').innerText = formatCurrency(stats.monthlyExpense);
    document.getElementById('total-savings').innerText = formatCurrency(stats.monthlySavings);
    
    const savingsVal = document.getElementById('total-savings');
    if (stats.monthlySavings < 0) {
      savingsVal.style.color = 'var(--danger)';
    } else {
      savingsVal.style.color = 'var(--success)';
    }

    // 2. Fetch Recent Transactions
    const txRes = await apiFetch('/transactions?limit=5');
    if (txRes.success) {
      renderRecentTransactions(txRes.data.slice(0, 5));
    }

    // 3. Fetch Budgets progress
    const budgetRes = await apiFetch('/budgets');
    if (budgetRes.success) {
      renderBudgetProgress(budgetRes.data);
    }

    // 4. Fetch Health Score
    loadHealthScore();

    // 5. Fetch AI spending insights
    loadAISpendingInsights();

    // 6. Draw Analytics Charts
    renderCharts(categorySpending, res);

  } catch (error) {
    console.error('Error loading dashboard:', error);
    showToast('Failed to connect to API backend', 'danger');
  }
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(value);
}

function renderRecentTransactions(transactions) {
  const container = document.getElementById('dashboard-tx-list');
  if (transactions.length === 0) {
    container.innerHTML = `<div style="text-align:center; color:var(--text-muted); padding:30px;">No transaction records. click "Add Expense" to start.</div>`;
    return;
  }

  container.innerHTML = '';
  transactions.forEach(t => {
    const item = document.createElement('div');
    item.className = 'transaction-item';
    
    const dateStr = new Date(t.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });

    const isExpense = t.type === 'expense';
    const amountClass = isExpense ? 'expense' : 'income';
    const amountPrefix = isExpense ? '-' : '+';
    
    // Choose icon base on category
    let iconClass = 'fa-tags';
    if (t.category === 'Salary') iconClass = 'fa-wallet';
    else if (t.category === 'Food & Dining') iconClass = 'fa-utensils';
    else if (t.category === 'Groceries') iconClass = 'fa-basket-shopping';
    else if (t.category === 'Rent/Housing') iconClass = 'fa-house-chimney';
    else if (t.category === 'Utilities') iconClass = 'fa-bolt';
    else if (t.category === 'Transportation') iconClass = 'fa-car';
    else if (t.category === 'Entertainment') iconClass = 'fa-film';
    else if (t.category === 'Shopping') iconClass = 'fa-bag-shopping';
    else if (t.category === 'Investments') iconClass = 'fa-chart-line';

    item.innerHTML = `
      <div class="transaction-item-left">
        <div class="category-icon">
          <i class="fa-solid ${iconClass}"></i>
        </div>
        <div class="transaction-details">
          <h4>${t.title}</h4>
          <span>${dateStr} &bull; ${t.category} &bull; ${t.account}</span>
        </div>
      </div>
      <div class="transaction-amount ${amountClass}">
        ${amountPrefix}${formatCurrency(t.amount)}
      </div>
    `;
    container.appendChild(item);
  });
}

function renderBudgetProgress(budgets) {
  const container = document.getElementById('dashboard-budget-list');
  if (budgets.length === 0) {
    container.innerHTML = `<div style="text-align:center; color:var(--text-muted); padding:30px;">No budget envelopes set for this month.</div>`;
    return;
  }

  container.innerHTML = '';
  // Show top 3 budgets on dashboard
  budgets.slice(0, 3).forEach(b => {
    const item = document.createElement('div');
    item.className = 'budget-progress-item';

    const percent = Math.min(Math.round(b.percentUsed), 100);
    let fillClass = 'var(--primary)';
    if (b.percentUsed > 100) {
      fillClass = 'var(--danger)';
    } else if (b.percentUsed >= 85) {
      fillClass = 'var(--warning)';
    } else {
      fillClass = 'var(--success)';
    }

    item.innerHTML = `
      <div class="budget-progress-header">
        <span>${b.category}</span>
        <span style="font-weight: 700;">${formatCurrency(b.spent)} / ${formatCurrency(b.amount)} (${Math.round(b.percentUsed)}%)</span>
      </div>
      <div class="budget-progress-bar-container">
        <div class="budget-progress-fill" style="width: ${percent}%; background-color: ${fillClass}"></div>
      </div>
    `;
    container.appendChild(item);
  });
}

async function loadHealthScore() {
  try {
    const res = await apiFetch('/reports/health-score');
    if (res.success) {
      document.getElementById('health-score-value').innerText = res.healthScore;
      document.getElementById('health-score-grade').innerText = `${res.grade} Grade`;
      document.getElementById('health-score-grade').style.color = res.color;
      document.getElementById('health-score-desc').innerText = res.details.description;

      // Calculate gauge rotation (180deg range from -45deg to 135deg)
      // Score ranges 0 - 100
      const score = res.healthScore;
      const angle = -45 + (score / 100) * 180;
      document.getElementById('health-gauge-fill').style.transform = `rotate(${angle}deg)`;
      document.getElementById('health-gauge-fill').style.borderColor = res.color;
      document.getElementById('health-gauge-fill').style.borderBottomColor = 'transparent';
      document.getElementById('health-gauge-fill').style.borderLeftColor = 'transparent';
    }
  } catch (err) {}
}

async function loadAISpendingInsights() {
  const container = document.getElementById('ai-insights-box');
  try {
    const res = await apiFetch('/reports/insights');
    if (res.success && res.insights) {
      container.innerHTML = '';
      res.insights.forEach(insight => {
        const item = document.createElement('div');
        item.style.cssText = `
          padding: 10px 14px;
          border-radius: var(--radius-sm);
          background-color: var(--primary-light);
          border-left: 3px solid var(--primary);
        `;

        if (insight.type === 'critical') {
          item.style.backgroundColor = 'var(--danger-light)';
          item.style.borderLeftColor = 'var(--danger)';
        } else if (insight.type === 'warning') {
          item.style.backgroundColor = 'var(--warning-light)';
          item.style.borderLeftColor = 'var(--warning)';
        } else if (insight.type === 'positive') {
          item.style.backgroundColor = 'var(--success-light)';
          item.style.borderLeftColor = 'var(--success)';
        }

        item.innerHTML = `
          <div style="font-weight:700; color:var(--text-main); font-size:13px; margin-bottom:4px;">
            <i class="fa-solid fa-lightbulb" style="margin-right:6px;"></i> ${insight.title}
          </div>
          <div>${insight.message}</div>
          <div style="font-style:italic; font-size:11px; margin-top:4px; color:var(--text-muted);">
            Rec: ${insight.recommendation}
          </div>
        `;
        container.appendChild(item);
      });
    }
  } catch (err) {
    container.innerHTML = `<div style="color:var(--danger)">Failed to process AI spending recommendations.</div>`;
  }
}

async function renderCharts(categorySpending, currentMonthStats) {
  // Destructure existing charts to redraw
  if (charts.pie) charts.pie.destroy();
  if (charts.bar) charts.bar.destroy();
  if (charts.line) charts.line.destroy();
  if (charts.savings) charts.savings.destroy();

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const gridColor = isDark ? '#334155' : '#e2e8f0';
  const textColor = isDark ? '#f1f5f9' : '#0f172a';

  // 1. Expense Category Distribution (Pie Chart)
  const pieCtx = document.getElementById('pieChart').getContext('2d');
  const categories = Object.keys(categorySpending);
  const spendingAmounts = Object.values(categorySpending);

  if (categories.length === 0) {
    // Add placeholder
    categories.push('No Expenses');
    spendingAmounts.push(1);
  }

  charts.pie = new Chart(pieCtx, {
    type: 'doughnut',
    data: {
      labels: categories,
      datasets: [{
        data: spendingAmounts,
        backgroundColor: [
          '#2563eb', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', 
          '#8b5cf6', '#ec4899', '#64748b', '#06b6d4', '#14b8a6'
        ],
        borderWidth: isDark ? 2 : 1,
        borderColor: isDark ? '#1e293b' : '#ffffff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: { color: textColor, font: { family: 'Inter', size: 11 } }
        }
      }
    }
  });

  // Fetch history for line and bar trends
  let history = [];
  try {
    const histRes = await apiFetch('/reports/monthly');
    if (histRes.success && histRes.data.length > 0) {
      history = histRes.data;
    }
  } catch (err) {}

  // Fallback history for demo if database has single entry
  if (history.length === 0) {
    const today = new Date();
    for (let i = 4; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      history.push({
        month: mStr,
        totalIncome: 3000 + (Math.random() * 800 - 400),
        totalExpense: 1800 + (Math.random() * 600 - 300),
        savings: 1200 + (Math.random() * 400 - 200)
      });
    }
  }

  const months = history.map(h => h.month);
  const incomes = history.map(h => h.totalIncome);
  const expenses = history.map(h => h.totalExpense);
  const savings = history.map(h => h.savings);

  // 2. Income vs Expense (Bar Chart)
  const barCtx = document.getElementById('barChart').getContext('2d');
  charts.bar = new Chart(barCtx, {
    type: 'bar',
    data: {
      labels: months,
      datasets: [
        {
          label: 'Income',
          data: incomes,
          backgroundColor: 'rgba(16, 185, 129, 0.85)',
          borderRadius: 4
        },
        {
          label: 'Expense',
          data: expenses,
          backgroundColor: 'rgba(239, 68, 68, 0.85)',
          borderRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { grid: { display: false }, ticks: { color: textColor } },
        y: { grid: { color: gridColor }, ticks: { color: textColor } }
      },
      plugins: {
        legend: { labels: { color: textColor } }
      }
    }
  });

  // 3. Monthly Spending Trend (Line Chart)
  const lineCtx = document.getElementById('lineChart').getContext('2d');
  charts.line = new Chart(lineCtx, {
    type: 'line',
    data: {
      labels: months,
      datasets: [{
        label: 'Expense Trend',
        data: expenses,
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
        fill: true,
        tension: 0.3,
        borderWidth: 3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { grid: { display: false }, ticks: { color: textColor } },
        y: { grid: { color: gridColor }, ticks: { color: textColor } }
      },
      plugins: {
        legend: { labels: { color: textColor } }
      }
    }
  });

  // 4. Savings Accumulation Trend Chart
  const savingsCtx = document.getElementById('savingsTrendChart').getContext('2d');
  charts.savings = new Chart(savingsCtx, {
    type: 'line',
    data: {
      labels: months,
      datasets: [{
        label: 'Net Savings',
        data: savings,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.15)',
        fill: true,
        tension: 0.3,
        borderWidth: 3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { grid: { display: false }, ticks: { color: textColor } },
        y: { grid: { color: gridColor }, ticks: { color: textColor } }
      },
      plugins: {
        legend: { labels: { color: textColor } }
      }
    }
  });
}
