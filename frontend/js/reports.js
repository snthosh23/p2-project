document.addEventListener('DOMContentLoaded', () => {
  // Populate filter accounts dropdown
  loadFilterAccountOptions();

  // Load initial ledger list (unfiltered)
  fetchLedgerTransactions();

  // 1. Submit Filter Form
  const filterForm = document.getElementById('filter-form');
  if (filterForm) {
    filterForm.addEventListener('submit', (e) => {
      e.preventDefault();
      fetchLedgerTransactions();
    });
  }

  // 2. Export CSV Trigger
  const exportCsvBtn = document.getElementById('export-csv-btn');
  if (exportCsvBtn) {
    exportCsvBtn.addEventListener('click', triggerCsvDownload);
  }

  // 3. Export PDF Trigger
  const exportPdfBtn = document.getElementById('export-pdf-btn');
  if (exportPdfBtn) {
    exportPdfBtn.addEventListener('click', triggerPdfDownload);
  }
});

async function loadFilterAccountOptions() {
  const accountSelect = document.getElementById('filter-account');
  if (!accountSelect) return;

  try {
    const res = await apiFetch('/profile');
    if (res.success && res.data.accounts) {
      // Clear but keep the "All Accounts" option
      accountSelect.innerHTML = '<option value="">All Accounts</option>';
      res.data.accounts.forEach(acc => {
        const option = document.createElement('option');
        option.value = acc;
        option.textContent = acc;
        accountSelect.appendChild(option);
      });
    }
  } catch (err) {}
}

async function fetchLedgerTransactions() {
  const tbody = document.getElementById('reports-ledger-body');
  if (!tbody) return;

  // Compile query parameters
  const type = document.getElementById('filter-type').value;
  const category = document.getElementById('filter-category').value;
  const account = document.getElementById('filter-account').value;
  const startDate = document.getElementById('filter-start').value;
  const endDate = document.getElementById('filter-end').value;
  const search = document.getElementById('filter-search').value.trim();

  let queryString = '?';
  if (type) queryString += `type=${type}&`;
  if (category) queryString += `category=${category}&`;
  if (account) queryString += `account=${account}&`;
  if (startDate) queryString += `startDate=${startDate}&`;
  if (endDate) queryString += `endDate=${endDate}&`;
  if (search) queryString += `search=${encodeURIComponent(search)}&`;

  try {
    const res = await apiFetch(`/transactions${queryString}`);
    if (res.success) {
      if (res.data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:30px; color:var(--text-muted);">No transactions matching current filters.</td></tr>`;
        return;
      }

      tbody.innerHTML = '';
      res.data.forEach(t => {
        const row = document.createElement('tr');
        row.style.borderBottom = '1px solid var(--border-color)';
        
        const dateStr = new Date(t.date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });

        const isExpense = t.type === 'expense';
        const typeBadge = isExpense 
          ? `<span style="color:var(--danger); background-color:var(--danger-light); padding: 2px 8px; border-radius:10px; font-size:11px; font-weight:700; text-transform:capitalize;">Expense</span>`
          : `<span style="color:var(--success); background-color:var(--success-light); padding: 2px 8px; border-radius:10px; font-size:11px; font-weight:700; text-transform:capitalize;">Income</span>`;

        const amountColor = isExpense ? 'var(--danger)' : 'var(--success)';
        const amountPrefix = isExpense ? '-' : '+';
        const amountVal = `${amountPrefix}$${t.amount.toFixed(2)}`;

        row.innerHTML = `
          <td style="padding: 12px 8px; color:var(--text-muted);">${dateStr}</td>
          <td style="padding: 12px 8px; font-weight:600;">${t.title}</td>
          <td style="padding: 12px 8px;">${typeBadge}</td>
          <td style="padding: 12px 8px;"><i class="fa-solid fa-tag" style="margin-right:6px; font-size:11px; color:var(--text-muted);"></i>${t.category}</td>
          <td style="padding: 12px 8px; color:var(--text-muted); font-size:13px;">${t.account}</td>
          <td style="padding: 12px 8px; text-align:right; font-weight:700; color:${amountColor}; font-family:'Outfit';">${amountVal}</td>
          <td style="padding: 12px 8px; color:var(--text-muted); font-size:12px; max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${t.notes || ''}">${t.notes || '-'}</td>
          <td style="padding: 12px 8px; text-align:center;">
            <button class="btn btn-danger" style="padding: 6px 10px; font-size: 11px;" onclick="deleteTransaction('${t._id}')">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </td>
        `;
        tbody.appendChild(row);
      });
    }
  } catch (error) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:30px; color:var(--danger);">Failed to connect and query ledger logs.</td></tr>`;
  }
}

async function deleteTransaction(id) {
  if (!confirm('Are you sure you want to permanently delete this transaction?')) return;

  try {
    const res = await apiFetch(`/transactions/${id}`, {
      method: 'DELETE'
    });

    if (res.success) {
      showToast('Transaction removed', 'success');
      fetchLedgerTransactions();
    } else {
      showToast(res.message || 'Failed to delete entry', 'danger');
    }
  } catch (err) {
    showToast('Network error during delete request', 'danger');
  }
}

// Authenticated download helper for CSV reports
async function triggerCsvDownload() {
  showToast('Generating CSV report...', 'info');
  const token = localStorage.getItem('token');

  try {
    const response = await fetch(`${API_URL}/transactions/export/csv`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) throw new Error('Failed to generate export file');

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transactions_report.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
    showToast('CSV report downloaded!', 'success');
  } catch (error) {
    showToast('Could not download CSV export file', 'danger');
  }
}

// Authenticated download helper for PDF financial statements
async function triggerPdfDownload() {
  const activeMonth = new Date().toISOString().substring(0, 7); // Compile statement for current month
  showToast('Compiling PDF financial statement...', 'info');
  const token = localStorage.getItem('token');

  try {
    const response = await fetch(`${API_URL}/reports/export/pdf?month=${activeMonth}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) throw new Error('Failed to compile PDF report');

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financial_report_${activeMonth}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
    showToast('PDF Statement downloaded!', 'success');
  } catch (error) {
    showToast('Could not download PDF report statement', 'danger');
  }
}

// Expose delete transaction globally so inline table trigger can catch it
window.deleteTransaction = deleteTransaction;
