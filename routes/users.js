const express = require('express');
const router = express.Router();
const User = require('../models/user');
const jwt = require('jsonwebtoken');
const { authenticateToken, JWT_SECRET } = require('../middleware/auth');

// Register a new user
router.post('/register', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Check if email already exists
    const existingEmail = await User.getByEmail(email);
    if (existingEmail) {
      return res.status(409).json({ message: 'Email already exists' });
    }

    // Create the user
    const newUser = await User.create({ email, password });

    // Generate JWT token
    const token = jwt.sign({ id: newUser.id, email: newUser.email }, JWT_SECRET, { expiresIn: '24h' });

    res.status(201).json({ 
      message: 'User registered successfully',
      user: newUser,
      token
    });
  } catch (error) {
    next(error);
  }
});

// Login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Validate credentials
    const user = await User.validateCredentials(email, password);

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });

    res.json({ 
      message: 'Login successful',
      user,
      token
    });
  } catch (error) {
    next(error);
  }
});

// Get current user (protected route)
router.get('/me', authenticateToken, async (req, res, next) => {
  try {
    const user = await User.getById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
});

// Update current user (protected route)
router.put('/me', authenticateToken, async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Update the user
    const updatedUser = await User.update(req.user.id, { email, password });

    res.json({ 
      message: 'User updated successfully',
      user: updatedUser
    });
  } catch (error) {
    next(error);
  }
});

// Render login page
router.get('/login', (req, res) => {
  res.render('login', { title: 'Login' });
});

// Render registration page
router.get('/register', (req, res) => {
  res.render('register', { title: 'Register' });
});

// Get all users (admin only in a real app)
router.get('/', async (req, res, next) => {
  try {
    const users = await User.getAll();
    res.json(users);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
