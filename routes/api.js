const express = require('express');
const router = express.Router();
const Book = require('../models/book');
const Transaction = require('../models/transaction');
const { authenticateToken } = require('../middleware/auth');
const { setCache, getCache, deleteCache } = require('../config/redis');

// Cache keys
const API_BOOKS_CACHE_PREFIX = 'api_books_';

// GET all books (paginated)
router.get('/books', async (req, res, next) => {
    try {
        // Get pagination parameters from query string
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || null;

        // Create a cache key based on pagination parameters and search
        const cacheKey = `${API_BOOKS_CACHE_PREFIX}page${page}_limit${limit}${search ? `_search${search}` : ''}`;

        // Try to get from cache first
        const cachedBooks = await getCache(cacheKey);

        if (cachedBooks) {
            console.log(`Returning paginated books (page ${page}, limit ${limit}) from cache`);
            return res.json(cachedBooks);
        }

        // If not in cache, get from database
        const result = await Book.getPaginated(page, limit, search);

        // Store in cache for future requests
        await setCache(cacheKey, result);

        res.json(result);
    } catch (error) {
        next(error);
    }
});

// Create a new transaction (checkout a book) (requires authentication)
router.post('/checkout', authenticateToken, async (req, res, next) => {
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
router.post('/return', authenticateToken, async (req, res, next) => {
    try {
        const { id } = req.body;

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

module.exports = router;