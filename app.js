// Load environment variables from .env file
require('dotenv').config();

var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

// Initialize database and Redis connections
require('./config/database');
require('./config/redis');

// Check and run database migrations if needed
const { checkMigrationsNeeded, runMigrations } = require('./db/migrate');
(async () => {
  try {
    const migrationsNeeded = await checkMigrationsNeeded();
    if (migrationsNeeded) {
      console.log('Database migrations needed. Running migrations...');
      await runMigrations();
    } else {
      console.log('Database schema is up to date.');
    }
  } catch (error) {
    console.error('Error checking or running migrations:', error);
    // Continue application startup even if migrations fail
  }
})();

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var booksRouter = require('./routes/books');
var transactionsRouter = require('./routes/transactions');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Direct route for books API to avoid router mounting issues
const Book = require('./models/book');
const { setCache, getCache } = require('./config/redis');
const API_BOOKS_CACHE_PREFIX = 'api_books_';

app.get('/books/api/books', async (req, res, next) => {
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

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/api/books', booksRouter);
app.use('/transactions', transactionsRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
