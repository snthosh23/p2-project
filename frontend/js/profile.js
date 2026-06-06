document.addEventListener('DOMContentLoaded', () => {
  // Load initial profile settings
  loadProfileData();

  // 1. Submit Profile Form
  const profileForm = document.getElementById('profile-form');
  if (profileForm) {
    profileForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const name = document.getElementById('profile-name').value.trim();
      const email = document.getElementById('profile-email').value.trim();

      if (!name || !email) {
        showToast('Please enter name and email', 'warning');
        return;
      }

      try {
        const res = await apiFetch('/profile', {
          method: 'PUT',
          body: JSON.stringify({ name, email })
        });

        if (res.success) {
          localStorage.setItem('user', JSON.stringify(res.data));
          showToast('Credentials updated successfully!', 'success');
          // Reload avatar initials in layout navbar
          const initials = res.data.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
          const avatar = document.querySelector('.user-avatar');
          if (avatar) avatar.textContent = initials;
        } else {
          showToast(res.message || 'Update failed', 'danger');
        }
      } catch (err) {
        showToast('Server update request failed', 'danger');
      }
    });
  }

  // 2. Submit Password Form
  const passwordForm = document.getElementById('password-form');
  if (passwordForm) {
    passwordForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const password = document.getElementById('new-password').value.trim();
      const confirmPassword = document.getElementById('confirm-new-password').value.trim();

      if (password.length < 6) {
        showToast('Password must be at least 6 characters long', 'warning');
        return;
      }

      if (password !== confirmPassword) {
        showToast('Passwords do not match', 'danger');
        return;
      }

      try {
        const res = await apiFetch('/profile', {
          method: 'PUT',
          body: JSON.stringify({ password })
        });

        if (res.success) {
          showToast('Password changed successfully!', 'success');
          document.getElementById('new-password').value = '';
          document.getElementById('confirm-new-password').value = '';
        } else {
          showToast(res.message || 'Password update failed', 'danger');
        }
      } catch (err) {
        showToast('Server connection failed', 'danger');
      }
    });
  }

  // 3. Multi-Accounts Handlers
  const addAccountBtn = document.getElementById('add-account-btn');
  if (addAccountBtn) {
    addAccountBtn.addEventListener('click', addCustomAccount);
  }

  // 4. Submit Settings Form
  const settingsForm = document.getElementById('settings-form');
  if (settingsForm) {
    settingsForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const theme = document.getElementById('settings-theme').value;
      const currency = document.getElementById('settings-currency').value;
      const threshold = parseInt(document.getElementById('settings-threshold').value);

      try {
        const res = await apiFetch('/profile', {
          method: 'PUT',
          body: JSON.stringify({
            settings: {
              theme,
              currency,
              threshold: threshold || 85
            }
          })
        });

        if (res.success) {
          localStorage.setItem('theme', theme);
          document.documentElement.setAttribute('data-theme', theme);
          
          // Sync theme toggle button icon in navbar
          const themeBtn = document.getElementById('darkmode-toggle');
          if (themeBtn) {
            themeBtn.innerHTML = theme === 'dark' ? '<i class="fa-regular fa-sun"></i>' : '<i class="fa-regular fa-moon"></i>';
          }
          
          showToast('System preferences saved!', 'success');
        } else {
          showToast(res.message || 'Failed to save settings', 'danger');
        }
      } catch (err) {
        showToast('Server update failed', 'danger');
      }
    });
  }

  // 5. Purge/Erase Data Handler
  const purgeBtn = document.getElementById('purge-data-btn');
  if (purgeBtn) {
    purgeBtn.addEventListener('click', purgeAllUserData);
  }
});

let cachedAccounts = [];

async function loadProfileData() {
  try {
    const res = await apiFetch('/profile');
    if (res.success && res.data) {
      const user = res.data;
      cachedAccounts = user.accounts || [];

      // Populate profile inputs
      const nameInp = document.getElementById('profile-name');
      const emailInp = document.getElementById('profile-email');
      if (nameInp) nameInp.value = user.name || '';
      if (emailInp) emailInp.value = user.email || '';

      // Populate settings fields
      const currencySel = document.getElementById('settings-currency');
      const themeSel = document.getElementById('settings-theme');
      const thresholdInp = document.getElementById('settings-threshold');
      
      if (currencySel) currencySel.value = user.settings?.currency || 'USD';
      if (themeSel) themeSel.value = user.settings?.theme || 'light';
      if (thresholdInp) thresholdInp.value = user.settings?.threshold || 85;

      // Draw multi-accounts list
      renderAccountsList();
    }
  } catch (err) {
    showToast('Failed to retrieve profile credentials', 'danger');
  }
}

function renderAccountsList() {
  const container = document.getElementById('profile-accounts-list');
  if (!container) return;

  if (cachedAccounts.length === 0) {
    container.innerHTML = '<div style="color:var(--text-muted); font-size:12px;">No active account cards.</div>';
    return;
  }

  container.innerHTML = '';
  cachedAccounts.forEach(acc => {
    const row = document.createElement('div');
    row.style.cssText = `
      display:flex;
      justify-content:space-between;
      align-items:center;
      padding:10px 14px;
      background-color: var(--bg-sidebar);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-sm);
      font-size:13px;
    `;
    row.innerHTML = `
      <div style="font-weight:600;"><i class="fa-solid fa-wallet" style="margin-right:8px; color:var(--primary);"></i>${acc}</div>
      <button class="btn btn-danger" style="padding: 4px 8px; font-size: 11px;" onclick="deleteCustomAccount('${acc}')">
        <i class="fa-solid fa-xmark"></i>
      </button>
    `;
    container.appendChild(row);
  });
}

async function addCustomAccount() {
  const input = document.getElementById('new-account-name');
  if (!input) return;

  const accName = input.value.trim();
  if (!accName) {
    showToast('Please enter an account source name', 'warning');
    return;
  }

  if (cachedAccounts.includes(accName)) {
    showToast('Account source already exists!', 'warning');
    return;
  }

  const updatedAccounts = [...cachedAccounts, accName];

  try {
    const res = await apiFetch('/profile', {
      method: 'PUT',
      body: JSON.stringify({ accounts: updatedAccounts })
    });

    if (res.success) {
      cachedAccounts = updatedAccounts;
      renderAccountsList();
      input.value = '';
      showToast(`Asset source "${accName}" added!`, 'success');
    } else {
      showToast(res.message || 'Error adding account', 'danger');
    }
  } catch (err) {
    showToast('Server request failed', 'danger');
  }
}

async function deleteCustomAccount(accName) {
  if (cachedAccounts.length <= 1) {
    showToast('You must keep at least one active asset source!', 'warning');
    return;
  }

  if (!confirm(`Are you sure you want to delete the asset source "${accName}"?`)) return;

  const updatedAccounts = cachedAccounts.filter(a => a !== accName);

  try {
    const res = await apiFetch('/profile', {
      method: 'PUT',
      body: JSON.stringify({ accounts: updatedAccounts })
    });

    if (res.success) {
      cachedAccounts = updatedAccounts;
      renderAccountsList();
      showToast(`Asset source "${accName}" deleted!`, 'success');
    } else {
      showToast(res.message || 'Error deleting account', 'danger');
    }
  } catch (err) {
    showToast('Server request failed', 'danger');
  }
}

async function purgeAllUserData() {
  const confirmation1 = confirm('WARNING: This will permanently delete all your transactions, budgets and notifications. This cannot be undone!\n\nDo you want to continue?');
  if (!confirmation1) return;

  const confirmation2 = confirm('FINAL CONFIRMATION: Are you absolutely certain you want to purge all your ledger parameters?');
  if (!confirmation2) return;

  showToast('Purging ledger data...', 'warning');

  try {
    const res = await apiFetch('/profile/purge', {
      method: 'DELETE'
    });

    if (res.success) {
      showToast('All ledger data erased. Restarting...', 'success');
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 1500);
    } else {
      showToast(res.message || 'Error erasing ledger data', 'danger');
    }
  } catch (err) {
    showToast('Server purge request failed', 'danger');
  }
}

// Expose account deleting globally for inline click handlers
window.deleteCustomAccount = deleteCustomAccount;
