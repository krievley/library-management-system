const express = require('express');
const router = express.Router();
const Book = require('../models/book');
const { setCache, getCache, deleteCache } = require('../config/redis');

// Cache keys
const ALL_BOOKS_CACHE_KEY = 'all_books';
const BOOK_CACHE_PREFIX = 'book_';
const API_BOOKS_CACHE_PREFIX = 'api_books_';

// GET all books
router.get('/', async (req, res, next) => {
  try {
    // Try to get from cache first
    const cachedBooks = await getCache(ALL_BOOKS_CACHE_KEY);

    if (cachedBooks) {
      console.log('Returning books from cache');
      return res.json(cachedBooks);
    }

    // If not in cache, get from database
    const books = await Book.getAll();

    // Store in cache for future requests
    await setCache(ALL_BOOKS_CACHE_KEY, books);

    res.json(books);
  } catch (error) {
    next(error);
  }
});

// GET API books (paginated)
router.get('/api/books', async (req, res, next) => {
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

// GET a single book by ID
router.get('/:id', async (req, res, next) => {
  try {
    const id = req.params.id;
    const cacheKey = `${BOOK_CACHE_PREFIX}${id}`;

    // Try to get from cache first
    const cachedBook = await getCache(cacheKey);

    if (cachedBook) {
      console.log(`Returning book ${id} from cache`);
      return res.json(cachedBook);
    }

    // If not in cache, get from database
    const book = await Book.getById(id);

    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }

    // Store in cache for future requests
    await setCache(cacheKey, book);

    res.json(book);
  } catch (error) {
    next(error);
  }
});

// POST a new book
router.post('/', async (req, res, next) => {
  try {
    const newBook = await Book.create(req.body);

    // Invalidate the all books cache
    await deleteCache(ALL_BOOKS_CACHE_KEY);

    // Also invalidate any API books cache
    const apiCachePattern = `${API_BOOKS_CACHE_PREFIX}*`;
    await deleteCache(apiCachePattern);

    res.status(201).json(newBook);
  } catch (error) {
    next(error);
  }
});

// PUT update a book
router.put('/:id', async (req, res, next) => {
  try {
    const id = req.params.id;
    const updatedBook = await Book.update(id, req.body);

    if (!updatedBook) {
      return res.status(404).json({ message: 'Book not found' });
    }

    // Invalidate caches
    await deleteCache(ALL_BOOKS_CACHE_KEY);
    await deleteCache(`${BOOK_CACHE_PREFIX}${id}`);

    // Also invalidate any API books cache
    const apiCachePattern = `${API_BOOKS_CACHE_PREFIX}*`;
    await deleteCache(apiCachePattern);

    res.json(updatedBook);
  } catch (error) {
    next(error);
  }
});

// DELETE a book
router.delete('/:id', async (req, res, next) => {
  try {
    const id = req.params.id;
    const result = await Book.delete(id);

    if (!result) {
      return res.status(404).json({ message: 'Book not found' });
    }

    // Invalidate caches
    await deleteCache(ALL_BOOKS_CACHE_KEY);
    await deleteCache(`${BOOK_CACHE_PREFIX}${id}`);

    // Also invalidate any API books cache
    const apiCachePattern = `${API_BOOKS_CACHE_PREFIX}*`;
    await deleteCache(apiCachePattern);

    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

module.exports = router;
