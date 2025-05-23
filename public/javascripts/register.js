document.addEventListener('DOMContentLoaded', () => {
  const registerForm = document.getElementById('register-form');
  const errorMessage = document.getElementById('error-message');

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Clear previous error messages
    errorMessage.style.display = 'none';
    errorMessage.textContent = '';

    // Get form data
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    // Validate passwords match
    if (password !== confirmPassword) {
      errorMessage.textContent = 'Passwords do not match';
      errorMessage.style.display = 'block';
      return;
    }

    try {
      // Send registration request
      const response = await fetch('/users/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        // Display error message
        errorMessage.textContent = data.message || 'Registration failed';
        errorMessage.style.display = 'block';
        return;
      }

      // Store token in localStorage
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      // Redirect to home page
      window.location.href = '/';

    } catch (error) {
      console.error('Registration error:', error);
      errorMessage.textContent = 'An error occurred during registration. Please try again.';
      errorMessage.style.display = 'block';
    }
  });
});
