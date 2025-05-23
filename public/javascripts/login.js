document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  const errorMessage = document.getElementById('error-message');

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Clear previous error messages
    errorMessage.style.display = 'none';
    errorMessage.textContent = '';

    // Get form data
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
      // Send login request
      const response = await fetch('/users/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        // Display error message
        errorMessage.textContent = data.message || 'Login failed';
        errorMessage.style.display = 'block';
        return;
      }

      // Store token in localStorage
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      // Redirect to home page
      window.location.href = '/';

    } catch (error) {
      console.error('Login error:', error);
      errorMessage.textContent = 'An error occurred during login. Please try again.';
      errorMessage.style.display = 'block';
    }
  });
});
