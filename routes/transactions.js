const express = require('express');
const router = express.Router();
const Transaction = require('../models/transaction');
const { authenticateToken } = require('../middleware/auth');

// Get all transactions (requires authentication)
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const transactions = await Transaction.getAll();
    res.json(transactions);
  } catch (error) {
    next(error);
  }
});

// Get active transactions (requires authentication)
router.get('/active', authenticateToken, async (req, res, next) => {
  try {
    const transactions = await Transaction.getActive();
    res.json(transactions);
  } catch (error) {
    next(error);
  }
});

// Get overdue transactions (requires authentication)
router.get('/overdue', authenticateToken, async (req, res, next) => {
  try {
    const transactions = await Transaction.getOverdue();
    res.json(transactions);
  } catch (error) {
    next(error);
  }
});

// Get transactions for a specific user (requires authentication)
router.get('/user/:userId', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.params.userId;
    const transactions = await Transaction.getByUserId(userId);
    res.json(transactions);
  } catch (error) {
    next(error);
  }
});

// Get transactions for a specific book (requires authentication)
router.get('/book/:bookId', authenticateToken, async (req, res, next) => {
  try {
    const bookId = req.params.bookId;
    const transactions = await Transaction.getByBookId(bookId);
    res.json(transactions);
  } catch (error) {
    next(error);
  }
});

// Get a specific transaction (requires authentication)
router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const id = req.params.id;
    const transaction = await Transaction.getById(id);

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    res.json(transaction);
  } catch (error) {
    next(error);
  }
});

// Create a new transaction (checkout a book) (requires authentication)
router.post('/', authenticateToken, async (req, res, next) => {
  try {
    const { user_id, book_id } = req.body;

    // Validate required fields
    if (!user_id || !book_id) {
      return res.status(400).json({ message: 'Missing required fields: user_id, and book_id are required' });
    }

    const transaction = await Transaction.create({ user_id, book_id });
    res.status(201).json(transaction);
  } catch (error) {
    // Handle specific errors
    if (error.message.includes('No copies available') || error.message.includes('not found')) {
      return res.status(400).json({ message: error.message });
    }
    next(error);
  }
});

// Return a book (requires authentication)
router.put('/:id/return', authenticateToken, async (req, res, next) => {
  try {
    const id = req.params.id;

    // First get the transaction to check if the user is authorized
    const transactionCheck = await Transaction.getById(id);

    if (!transactionCheck) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    // Check if the user making the request is the one who checked out the book
    if (transactionCheck.user_id !== req.user.id) {
      return res.status(403).json({ message: 'You are not authorized to return this book' });
    }

    const transaction = await Transaction.returnBook(id);

    res.json(transaction);
  } catch (error) {
    // Handle specific errors
    if (error.message.includes('not found') || error.message.includes('already returned')) {
      return res.status(400).json({ message: error.message });
    }
    next(error);
  }
});

// Delete a transaction (requires authentication)
router.delete('/:id', authenticateToken, async (req, res, next) => {
  try {
    const id = req.params.id;
    const result = await Transaction.delete(id);

    if (!result) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

module.exports = router;
