document.addEventListener('DOMContentLoaded', () => {
  // Login Form Handler
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value.trim();

      if (!email || !password) {
        showToast('Please enter all fields', 'warning');
        return;
      }

      try {
        const res = await apiFetch('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password })
        });

        if (res.success) {
          localStorage.setItem('token', res.token);
          localStorage.setItem('user', JSON.stringify(res.user));
          localStorage.setItem('theme', res.user.settings?.theme || 'light');
          
          showToast('Sign in successful!', 'success');
          setTimeout(() => {
            window.location.href = 'dashboard.html';
          }, 1000);
        } else {
          showToast(res.message || 'Login failed', 'danger');
        }
      } catch (error) {
        showToast('Server connection error. Please try again.', 'danger');
      }
    });
  }

  // Registration Form Handler
  const registerForm = document.getElementById('register-form');
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const name = document.getElementById('name').value.trim();
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value.trim();
      const confirmPassword = document.getElementById('confirm-password').value.trim();

      if (!name || !email || !password || !confirmPassword) {
        showToast('Please fill all fields', 'warning');
        return;
      }

      if (password.length < 6) {
        showToast('Password must be at least 6 characters long', 'warning');
        return;
      }

      if (password !== confirmPassword) {
        showToast('Passwords do not match', 'danger');
        return;
      }

      try {
        const res = await apiFetch('/auth/register', {
          method: 'POST',
          body: JSON.stringify({ name, email, password })
        });

        if (res.success) {
          localStorage.setItem('token', res.token);
          localStorage.setItem('user', JSON.stringify(res.user));
          localStorage.setItem('theme', 'light');

          showToast('Registration successful!', 'success');
          setTimeout(() => {
            window.location.href = 'dashboard.html';
          }, 1000);
        } else {
          showToast(res.message || 'Registration failed', 'danger');
        }
      } catch (error) {
        showToast('Connection error. Could not connect to API server.', 'danger');
      }
    });
  }
});
