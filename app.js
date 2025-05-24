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
var apiRouter = require('./routes/api');
var usersRouter = require('./routes/users');
var booksRouter = require('./routes/books');
var transactionsRouter = require('./routes/transactions');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// explicitly set MIME type for JavaScript files
app.use((req, res, next) => {
  if (req.url.endsWith('.js')) {
    res.type('application/javascript');
  }
  next();
});

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/api', apiRouter);
app.use('/users', usersRouter);
app.use('/books', booksRouter);
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
