// Global configurations
// Global configurations - dynamic API routing for local vs deployed environments
const API_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && window.location.port !== '5000'
  ? 'http://localhost:5000/api'
  : (window.location.protocol === 'file:' ? 'http://localhost:5000/api' : '/api');

// Shared API fetch wrapper
async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  
  // Setup headers
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers
  };

  try {
    const response = await fetch(`${API_URL}${endpoint}`, config);
    
    // Auto-logout if unauthorized
    if (response.status === 401) {
      localStorage.clear();
      showToast('Session expired. Please log in again.', 'danger');
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 1500);
      throw new Error('Unauthorized');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`API Fetch Error [${endpoint}]:`, error);
    throw error;
  }
}

// User auth route guardian
function checkAuth() {
  const token = localStorage.getItem('token');
  const path = window.location.pathname;
  const page = path.substring(path.lastIndexOf('/') + 1);
  
  const publicPages = ['index.html', 'login.html', 'register.html', ''];
  const isPublic = publicPages.includes(page);

  if (!token && !isPublic) {
    window.location.href = 'login.html';
  } else if (token && (page === 'login.html' || page === 'register.html')) {
    window.location.href = 'dashboard.html';
  }
}

// Toast alerts helper
function showToast(message, type = 'info') {
  // Check if toast-container exists
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.style.cssText = 'position: fixed; bottom: 24px; right: 24px; z-index: 9999; display: flex; flex-direction: column; gap: 10px;';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `glass-card`;
  toast.style.cssText = `
    padding: 14px 20px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    min-width: 250px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    transform: translateY(20px);
    opacity: 0;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    gap: 10px;
  `;

  // Color mapping
  let borderLeftColor = '#2563eb';
  let icon = 'fa-info-circle';
  if (type === 'success') {
    borderLeftColor = '#10b981';
    icon = 'fa-check-circle';
  } else if (type === 'danger') {
    borderLeftColor = '#ef4444';
    icon = 'fa-exclamation-circle';
  } else if (type === 'warning') {
    borderLeftColor = '#f59e0b';
    icon = 'fa-exclamation-triangle';
  }

  toast.style.borderLeft = `5px solid ${borderLeftColor}`;
  toast.innerHTML = `<i class="fa-solid ${icon}" style="color: ${borderLeftColor}"></i> <div>${message}</div>`;

  container.appendChild(toast);

  // Trigger animation
  setTimeout(() => {
    toast.style.transform = 'translateY(0)';
    toast.style.opacity = '1';
  }, 50);

  // Remove toast
  setTimeout(() => {
    toast.style.transform = 'translateY(20px)';
    toast.style.opacity = '0';
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 4000);
}

// Inject Sidebar and Header templates dynamically
function injectLayout() {
  const path = window.location.pathname;
  const page = path.substring(path.lastIndexOf('/') + 1);
  const publicPages = ['index.html', 'login.html', 'register.html', ''];
  const isPublic = publicPages.includes(page);
  
  if (isPublic) return; // Skip injection for public page variants

  const appContainer = document.querySelector('.app-container');
  if (!appContainer) return;

  const user = JSON.parse(localStorage.getItem('user')) || { name: 'User', email: '' };
  const initials = user.name ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'U';

  // Inject Sidebar
  const sidebar = document.createElement('aside');
  sidebar.className = 'sidebar';
  sidebar.id = 'sidebar';
  sidebar.innerHTML = `
    <div class="sidebar-brand">
      <i class="fa-solid fa-vault"></i> SmartExpense
    </div>
    <ul class="sidebar-menu">
      <li class="sidebar-menu-item ${page === 'dashboard.html' ? 'active' : ''}">
        <a href="dashboard.html"><i class="fa-solid fa-chart-pie"></i> Dashboard</a>
      </li>
      <li class="sidebar-menu-item ${page === 'add-expense.html' ? 'active' : ''}">
        <a href="add-expense.html"><i class="fa-solid fa-minus"></i> Add Expense</a>
      </li>
      <li class="sidebar-menu-item ${page === 'add-income.html' ? 'active' : ''}">
        <a href="add-income.html"><i class="fa-solid fa-plus"></i> Add Income</a>
      </li>
      <li class="sidebar-menu-item ${page === 'reports.html' ? 'active' : ''}">
        <a href="reports.html"><i class="fa-solid fa-file-invoice-dollar"></i> Reports Ledger</a>
      </li>
      <li class="sidebar-menu-item ${page === 'budgets.html' ? 'active' : ''}">
        <a href="budgets.html"><i class="fa-solid fa-calculator"></i> Budget Planner</a>
      </li>
      <li class="sidebar-menu-item ${page === 'profile.html' ? 'active' : ''}">
        <a href="profile.html"><i class="fa-solid fa-user-gear"></i> Account Profile</a>
      </li>
      <li class="sidebar-menu-item ${page === 'settings.html' ? 'active' : ''}">
        <a href="settings.html"><i class="fa-solid fa-sliders"></i> System Settings</a>
      </li>
    </ul>
    <div class="sidebar-footer">
      <div class="sidebar-logout" id="logout-btn">
        <i class="fa-solid fa-arrow-right-from-bracket" style="margin-right: 12px;"></i> Sign Out
      </div>
    </div>
  `;

  // Inject Sticky Navbar in main-content
  const mainContent = document.querySelector('.main-content');
  if (mainContent) {
    const navbar = document.createElement('nav');
    navbar.className = 'navbar';
    navbar.innerHTML = `
      <div class="nav-left">
        <i class="fa-solid fa-bars menu-toggle" id="sidebar-toggle"></i>
        <h2 style="font-size: 20px; text-transform: capitalize;">${page.replace('.html', '').replace('-', ' ')}</h2>
      </div>
      <div class="nav-right">
        <button class="theme-toggle" id="darkmode-toggle" aria-label="Toggle Dark Mode">
          <i class="fa-regular fa-moon"></i>
        </button>
        <button class="notifications-bell" id="notif-toggle" aria-label="Notifications Panel">
          <i class="fa-regular fa-bell"></i>
          <span class="badge-dot" id="notif-badge" style="display: none;"></span>
        </button>
        <div class="user-profile-menu" onclick="window.location.href='profile.html'">
          <div class="user-avatar">${initials}</div>
          <span style="font-weight: 600; font-size: 14px;" class="hide-mobile">${user.name}</span>
        </div>
      </div>
    `;

    mainContent.insertBefore(navbar, mainContent.firstChild);
  }

  appContainer.insertBefore(sidebar, appContainer.firstChild);

  // Set up layout listeners
  setupLayoutListeners();
}

function setupLayoutListeners() {
  // Sidebar Toggle Mobile
  const toggleBtn = document.getElementById('sidebar-toggle');
  const sidebar = document.getElementById('sidebar');
  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });
  }

  // Sign out handler
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.clear();
      showToast('Logging out...', 'info');
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 1000);
    });
  }

  // Theme Toggle listener
  const themeBtn = document.getElementById('darkmode-toggle');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', nextTheme);
      localStorage.setItem('theme', nextTheme);
      themeBtn.innerHTML = nextTheme === 'dark' ? '<i class="fa-regular fa-sun"></i>' : '<i class="fa-regular fa-moon"></i>';
      showToast(`Switched to ${nextTheme} mode`, 'success');
      
      // Try to save to server if auth'd
      apiFetch('/profile', {
        method: 'PUT',
        body: JSON.stringify({ settings: { theme: nextTheme } })
      }).catch(() => {});
    });
  }

  // Load active theme
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  if (themeBtn) {
    themeBtn.innerHTML = savedTheme === 'dark' ? '<i class="fa-regular fa-sun"></i>' : '<i class="fa-regular fa-moon"></i>';
  }

  // Notifications bell toggle
  const notifBtn = document.getElementById('notif-toggle');
  if (notifBtn) {
    notifBtn.addEventListener('click', toggleNotificationsModal);
  }

  // Check unread notifications count
  checkUnreadNotifications();
}

async function checkUnreadNotifications() {
  try {
    const res = await apiFetch('/notifications');
    if (res.success && res.data) {
      const unread = res.data.filter(n => !n.read);
      const badge = document.getElementById('notif-badge');
      if (badge) {
        badge.style.display = unread.length > 0 ? 'block' : 'none';
      }
    }
  } catch (err) {}
}

function toggleNotificationsModal() {
  let modal = document.getElementById('notifications-modal');
  if (modal) {
    modal.remove();
    return;
  }

  modal = document.createElement('div');
  modal.id = 'notifications-modal';
  modal.className = 'glass-card';
  modal.style.cssText = `
    position: absolute;
    top: 75px;
    right: 24px;
    width: 320px;
    max-height: 400px;
    z-index: 1000;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 12px;
    box-shadow: var(--glass-shadow);
  `;

  modal.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 1px solid var(--border-color); padding-bottom:8px;">
      <h4 style="font-size:15px;">Notifications</h4>
      <button class="btn-link" style="border:none; background:none; cursor:pointer;" onclick="clearAllNotifications()">Clear All</button>
    </div>
    <div class="notifications-container" id="notif-modal-list">
      <div style="text-align:center; color:var(--text-muted); font-size:13px; padding: 20px 0;">Loading notifications...</div>
    </div>
  `;

  document.body.appendChild(modal);

  // Load actual notifications list
  loadNotificationsList();

  // Close modal when clicking outside
  const closeHandler = (e) => {
    if (!modal.contains(e.target) && !document.getElementById('notif-toggle').contains(e.target)) {
      modal.remove();
      document.removeEventListener('click', closeHandler);
    }
  };
  setTimeout(() => {
    document.addEventListener('click', closeHandler);
  }, 100);
}

async function loadNotificationsList() {
  const container = document.getElementById('notif-modal-list');
  if (!container) return;

  try {
    const res = await apiFetch('/notifications');
    if (res.success && res.data) {
      if (res.data.length === 0) {
        container.innerHTML = `<div style="text-align:center; color:var(--text-muted); font-size:13px; padding: 20px 0;">No active alerts</div>`;
        return;
      }

      container.innerHTML = '';
      res.data.forEach(n => {
        const item = document.createElement('div');
        item.className = `notification-item ${n.read ? '' : 'unread'}`;
        
        let type = 'info';
        if (n.title.toLowerCase().includes('exceeded')) type = 'danger';
        else if (n.title.toLowerCase().includes('warning')) type = 'warning';
        item.className += ` ${type}`;

        item.innerHTML = `
          <div style="font-weight: 600; display:flex; justify-content:space-between; align-items:center;">
            <span>${n.title}</span>
            ${n.read ? '' : `<i class="fa-solid fa-circle" style="font-size: 8px; color: var(--primary); cursor:pointer;" onclick="markNotificationRead('${n._id}')"></i>`}
          </div>
          <div style="margin-top: 4px; line-height: 1.4;">${n.message}</div>
          <div class="notification-time">${new Date(n.createdAt).toLocaleDateString()}</div>
        `;
        container.appendChild(item);
      });
    }
  } catch (err) {
    container.innerHTML = `<div style="text-align:center; color:var(--danger); font-size:13px; padding: 20px 0;">Failed to load alerts</div>`;
  }
}

async function markNotificationRead(id) {
  try {
    const res = await apiFetch(`/notifications/${id}/read`, { method: 'PUT' });
    if (res.success) {
      loadNotificationsList();
      checkUnreadNotifications();
    }
  } catch (err) {}
}

async function clearAllNotifications() {
  try {
    const res = await apiFetch('/notifications', { method: 'DELETE' });
    if (res.success) {
      loadNotificationsList();
      checkUnreadNotifications();
      showToast('Notifications cleared', 'success');
    }
  } catch (err) {}
}

// Expose functions globally
window.clearAllNotifications = clearAllNotifications;
window.markNotificationRead = markNotificationRead;

// Initialize triggers
document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  injectLayout();
});
