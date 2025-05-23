document.addEventListener('DOMContentLoaded', () => {
  const userInfo = document.getElementById('user-info');
  const authLinks = document.getElementById('auth-links');
  const emailSpan = document.getElementById('email');
  const logoutBtn = document.getElementById('logout-btn');

  // Check if user is logged in
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  if (token && user) {
    // User is logged in
    userInfo.style.display = 'block';
    authLinks.style.display = 'none';

    // Display email
    if (emailSpan) {
      emailSpan.textContent = user.email || '';
    }

    // Add authorization header to fetch requests for protected routes
    const originalFetch = window.fetch;
    window.fetch = function(url, options = {}) {
      // Only add the Authorization header for API requests to our server
      if (url.startsWith('/') && !url.startsWith('/users/login') && !url.startsWith('/users/register')) {
        options.headers = options.headers || {};
        options.headers['Authorization'] = `Bearer ${token}`;
      }
      return originalFetch(url, options);
    };
  } else {
    // User is not logged in
    userInfo.style.display = 'none';
    authLinks.style.display = 'block';
  }

  // Handle logout
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      // Clear localStorage
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      // Redirect to home page
      window.location.href = '/';
    });
  }
});
