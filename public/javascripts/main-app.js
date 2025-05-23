// Main React application component
const App = () => {
  // State for authentication
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [user, setUser] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  // Check authentication status on component mount and set up fetch interception
  React.useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = JSON.parse(localStorage.getItem('user') || 'null');

    if (token && userData) {
      setIsAuthenticated(true);
      setUser(userData);

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
    }

    setLoading(false);
  }, []);

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setUser(null);
  };

  // Authentication context to be provided to all components
  const authContext = {
    isAuthenticated,
    user,
    login: (token, userData) => {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      setIsAuthenticated(true);
      setUser(userData);
    },
    logout: handleLogout
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <AuthContext.Provider value={authContext}>
      <Router>
        <div className="app-container">
          <Header />
          <main>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthContext.Provider>
  );
};

// Create an authentication context
const AuthContext = React.createContext(null);

// Header component with navigation
const Header = () => {
  const auth = React.useContext(AuthContext);

  return (
    <header>
      <h1>Library Management System</h1>
      <nav>
        <ul>
          <li><Link to="/">Home</Link></li>
          {auth.isAuthenticated ? (
            <>
              <li>
                <span>Welcome, {auth.user.email}!</span>
              </li>
              <li>
                <button onClick={auth.logout}>Logout</button>
              </li>
            </>
          ) : (
            <>
              <li><Link to="/login">Login</Link></li>
              <li><Link to="/register">Register</Link></li>
            </>
          )}
        </ul>
      </nav>
    </header>
  );
};

// Home component that displays the books
const Home = () => {
  return (
    <div>
      <h2>Library Books</h2>
      <BooksApp />
    </div>
  );
};

// Login component
const Login = () => {
  const auth = React.useContext(AuthContext);
  const navigate = useNavigate();
  const [formData, setFormData] = React.useState({
    email: '',
    password: ''
  });
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Clear previous error messages
    setError('');

    setLoading(true);

    try {
      // Send login request
      const response = await fetch('/users/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          email: formData.email, 
          password: formData.password 
        })
      });

      const data = await response.json();

      if (!response.ok) {
        // Display error message
        setError(data.message || 'Login failed');
        return;
      }

      // Update auth context
      auth.login(data.token, data.user);

      // Redirect to home page
      navigate('/');
    } catch (error) {
      console.error('Login error:', error);
      setError('An error occurred during login. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-container">
      <h1>Login</h1>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <button type="submit" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </div>

        <div className="form-links">
          <p>Don't have an account? <Link to="/register">Register here</Link></p>
        </div>
      </form>

      {error && <div className="error-message">{error}</div>}
    </div>
  );
};

// Register component
const Register = () => {
  const auth = React.useContext(AuthContext);
  const navigate = useNavigate();
  const [formData, setFormData] = React.useState({
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Clear previous error messages
    setError('');

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      // Send registration request
      const response = await fetch('/users/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          email: formData.email, 
          password: formData.password 
        })
      });

      const data = await response.json();

      if (!response.ok) {
        // Display error message
        setError(data.message || 'Registration failed');
        return;
      }

      // Update auth context
      auth.login(data.token, data.user);

      // Redirect to home page
      navigate('/');
    } catch (error) {
      console.error('Registration error:', error);
      setError('An error occurred during registration. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-container">
      <h1>Register</h1>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="confirmPassword">Confirm Password</label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <button type="submit" disabled={loading}>
            {loading ? 'Registering...' : 'Register'}
          </button>
        </div>

        <div className="form-links">
          <p>Already have an account? <Link to="/login">Login here</Link></p>
        </div>
      </form>

      {error && <div className="error-message">{error}</div>}
    </div>
  );
};

// Render the app
const { BrowserRouter: Router, Routes, Route, Link, useNavigate } = ReactRouterDOM;
ReactDOM.render(<App />, document.getElementById('root'));
