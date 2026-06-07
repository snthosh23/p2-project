let recommendationsCache = [];

document.addEventListener('DOMContentLoaded', () => {
  // Default Target Month to current month YYYY-MM
  const monthInput = document.getElementById('month');
  if (monthInput) {
    const currentMonth = new Date().toISOString().substring(0, 7);
    monthInput.value = currentMonth;
    
    // Listen for month selection changes
    monthInput.addEventListener('change', () => {
      loadBudgets(monthInput.value);
    });
  }

  // 1. Submit Budget Form
  const budgetForm = document.getElementById('budget-form');
  if (budgetForm) {
    budgetForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const category = document.getElementById('category').value;
      const amount = parseFloat(document.getElementById('amount').value);
      const month = document.getElementById('month').value;

      if (!category || isNaN(amount) || !month) {
        showToast('Please specify category, month and amount', 'warning');
        return;
      }

      try {
        const res = await apiFetch('/budgets', {
          method: 'POST',
          body: JSON.stringify({ category, amount, month })
        });

        if (res.success) {
          showToast(`Budget set for ${category}`, 'success');
          loadBudgets(month);
          // Reset form fields
          document.getElementById('amount').value = '';
          document.getElementById('category').selectedIndex = 0;
        } else {
          showToast(res.message || 'Error setting budget', 'danger');
        }
      } catch (err) {
        showToast('Server connection failed', 'danger');
      }
    });
  }

  // 2. Auto-Apply Recommendations trigger
  const applyRecsBtn = document.getElementById('apply-recommendations-btn');
  if (applyRecsBtn) {
    applyRecsBtn.addEventListener('click', applyRecommendations);
  }

  // Load Initial Data
  const initialMonth = monthInput ? monthInput.value : new Date().toISOString().substring(0, 7);
  loadBudgets(initialMonth);
  loadRecommendations();
});

async function loadBudgets(month) {
  const container = document.getElementById('budget-list');
  if (!container) return;

  try {
    const res = await apiFetch(`/budgets?month=${month}`);
    if (res.success) {
      if (res.data.length === 0) {
        container.innerHTML = `<div style="text-align:center; color:var(--text-muted); padding:30px;">No budget envelopes set for ${month}. Fill the form above to add limits.</div>`;
        return;
      }

      container.innerHTML = '';
      res.data.forEach(b => {
        const item = document.createElement('div');
        item.className = 'budget-progress-item';

        const percent = Math.min(Math.round(b.percentUsed), 100);
        let fillClass = 'var(--primary)';
        let badgeStyle = 'background-color: var(--primary-light); color: var(--primary);';

        if (b.percentUsed > 100) {
          fillClass = 'var(--danger)';
          badgeStyle = 'background-color: var(--danger-light); color: var(--danger);';
        } else if (b.percentUsed >= 85) {
          fillClass = 'var(--warning)';
          badgeStyle = 'background-color: var(--warning-light); color: var(--warning);';
        } else {
          fillClass = 'var(--success)';
          badgeStyle = 'background-color: var(--success-light); color: var(--success);';
        }

        item.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 6px;">
            <div>
              <strong style="color:var(--text-main); font-size:14px;">${b.category}</strong>
              <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">
                Remaining: $${b.remaining.toFixed(2)}
              </div>
            </div>
            <div style="text-align:right;">
              <span style="display:inline-block; font-size:11px; padding: 2px 6px; border-radius: 12px; font-weight:700; ${badgeStyle}">
                ${Math.round(b.percentUsed)}% Used
              </span>
              <div style="font-size:13px; font-weight:600; margin-top:4px; color:var(--text-main);">
                $${b.spent.toFixed(2)} / $${b.amount.toFixed(2)}
              </div>
            </div>
          </div>
          <div class="budget-progress-bar-container">
            <div class="budget-progress-fill" style="width: ${percent}%; background-color: ${fillClass}"></div>
          </div>
        `;
        container.appendChild(item);
      });
    }
  } catch (err) {
    container.innerHTML = `<div style="text-align:center; color:var(--danger); padding:30px;">Failed to retrieve active budget parameters.</div>`;
  }
}

async function loadRecommendations() {
  const container = document.getElementById('recommendations-box');
  if (!container) return;

  try {
    const res = await apiFetch('/budgets/recommendations');
    if (res.success && res.recommendations) {
      recommendationsCache = res.recommendations;
      container.innerHTML = `
        <div style="background-color: var(--primary-light); padding:10px; border-radius:var(--radius-sm); font-size:12px; margin-bottom:10px;">
          <strong>Income Basis:</strong> $${res.incomeBasis.toFixed(2)} (from last month)
        </div>
      `;

      res.recommendations.forEach(rec => {
        const row = document.createElement('div');
        row.style.cssText = `
          display:flex;
          justify-content:space-between;
          align-items:center;
          padding: 8px 12px;
          background-color: var(--bg-sidebar);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          font-size: 13px;
        `;

        let typeBadge = `<span style="font-size:10px; font-weight:600; color:var(--primary); padding:1px 6px; border-radius:10px; background-color:var(--primary-light);">${rec.type}</span>`;
        if (rec.type === 'Want') {
          typeBadge = `<span style="font-size:10px; font-weight:600; color:var(--warning); padding:1px 6px; border-radius:10px; background-color:var(--warning-light);">${rec.type}</span>`;
        } else if (rec.type === 'Savings') {
          typeBadge = `<span style="font-size:10px; font-weight:600; color:var(--success); padding:1px 6px; border-radius:10px; background-color:var(--success-light);">${rec.type}</span>`;
        }

        row.innerHTML = `
          <div>
            <div style="font-weight:600;">${rec.category}</div>
            <div style="margin-top:2px;">${typeBadge}</div>
          </div>
          <div style="font-weight:700; color:var(--text-main);">$${rec.suggestedAmount}</div>
        `;
        container.appendChild(row);
      });
    }
  } catch (err) {
    container.innerHTML = `<div style="text-align:center; color:var(--text-muted); font-size:13px;">No past financial history found to compute recommendations.</div>`;
  }
}

async function applyRecommendations() {
  if (recommendationsCache.length === 0) {
    showToast('No recommendations available to apply.', 'warning');
    return;
  }

  const month = document.getElementById('month').value;
  if (!month) {
    showToast('Please specify target month first', 'warning');
    return;
  }

  showToast('Applying recommendations...', 'info');

  try {
    // Iterate and save each budget recommendation sequentially
    for (const rec of recommendationsCache) {
      if (rec.category === 'Savings') continue; // Budgets apply only to expenses
      
      await apiFetch('/budgets', {
        method: 'POST',
        body: JSON.stringify({
          category: rec.category,
          amount: rec.suggestedAmount,
          month
        })
      });
    }

    showToast('All recommendations applied successfully!', 'success');
    loadBudgets(month);
  } catch (err) {
    showToast('Failed to apply all recommendations', 'danger');
  }
}
