const request = require('supertest');
const app = require('../app');
const { pool } = require('../config/database');
const { redisClient } = require('../config/redis');
const Book = require('../models/book');
const User = require('../models/user');
const Transaction = require('../models/transaction');

describe('Transactions API', () => {
  // Test data
  const testUser = {
    email: 'transaction-test@example.com',
    password: 'password123'
  };

  let authToken;
  let userId;
  let bookId;
  let bookWithNoCopiesId;

  // Set up test data before all tests
  beforeAll(async () => {
    // Clean up any existing test data
    await pool.query('DELETE FROM users WHERE email = $1', [testUser.email]);

    // Create test user
    const userResponse = await request(app)
      .post('/users/register')
      .send(testUser);

    authToken = userResponse.body.token;
    userId = userResponse.body.user.id;

    // Create test book with copies
    const bookWithCopies = {
      title: 'Test Book With Copies',
      author: 'Test Author',
      isbn: '1234567890',
      published_year: 2023,
      genre: 'Test',
      copies: 1
    };

    const bookResult = await Book.create(bookWithCopies);
    bookId = bookResult.id;

    // Create test book with no copies
    const bookWithNoCopies = {
      title: 'Test Book With No Copies',
      author: 'Test Author',
      isbn: '0987654321',
      published_year: 2023,
      genre: 'Test',
      copies: 0
    };

    const bookWithNoCopiesResult = await Book.create(bookWithNoCopies);
    bookWithNoCopiesId = bookWithNoCopiesResult.id;
  });

  // Clean up test data after all tests
  afterAll(async () => {
    // Delete test transactions
    await pool.query('DELETE FROM transactions WHERE book_id IN ($1, $2)', [bookId, bookWithNoCopiesId]);

    // Delete test books
    await Book.delete(bookId);
    await Book.delete(bookWithNoCopiesId);

    // Delete test user
    await pool.query('DELETE FROM users WHERE email = $1', [testUser.email]);

    // Close connections
    await pool.end();
    await redisClient.quit();
  });

  // Test checkout validation
  describe('POST /transactions', () => {
    it('should return 401 when trying to checkout without authentication', async () => {
      const response = await request(app)
        .post('/transactions')
        .send({
          user_id: userId,
          book_id: bookId
        })
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('message', 'Authentication token required');
    });

    it('should return 400 when trying to checkout a book with no available copies', async () => {
      const response = await request(app)
        .post('/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          user_id: userId,
          book_id: bookWithNoCopiesId
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('No copies available');
    });

    it('should return 400 when trying to checkout without user_id', async () => {
      const response = await request(app)
        .post('/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          book_id: bookId
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('user_id');
    });

    it('should return 400 when trying to checkout without book_id', async () => {
      const response = await request(app)
        .post('/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          user_id: userId
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('book_id');
    });

    it('should successfully checkout a book with available copies', async () => {
      const response = await request(app)
        .post('/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          user_id: userId,
          book_id: bookId
        })
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('user_id', userId);
      expect(response.body).toHaveProperty('book_id', bookId);
      expect(response.body).toHaveProperty('checkout_date');

      // After successful checkout, the book should have no available copies
      const secondCheckoutResponse = await request(app)
        .post('/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          user_id: userId,
          book_id: bookId
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(secondCheckoutResponse.body).toHaveProperty('message');
      expect(secondCheckoutResponse.body.message).toContain('No copies available');
    });
  });

  // Test return validation
  describe('PUT /transactions/:id/return', () => {
    let transactionId;
    let secondUserId;
    let secondUserAuthToken;

    // Create a second test user and checkout a book for the first user
    beforeAll(async () => {
      // Create second test user
      const secondTestUser = {
        email: 'transaction-test-2@example.com',
        password: 'password123'
      };

      // Clean up any existing second test user
      await pool.query('DELETE FROM users WHERE email = $1', [secondTestUser.email]);

      const secondUserResponse = await request(app)
        .post('/users/register')
        .send(secondTestUser);

      secondUserAuthToken = secondUserResponse.body.token;
      secondUserId = secondUserResponse.body.user.id;

      // Create a new book for checkout with a random ISBN to avoid conflicts
      const randomISBN = Math.floor(Math.random() * 10000000000).toString().padStart(10, '0');
      const newBookWithCopies = {
        title: 'Test Book For Return',
        author: 'Test Author',
        isbn: randomISBN,
        published_year: 2023,
        genre: 'Test',
        copies: 1
      };

      const newBookResult = await Book.create(newBookWithCopies);
      const newBookId = newBookResult.id;

      // Checkout the book with the first user
      const checkoutResponse = await request(app)
        .post('/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          user_id: userId,
          book_id: newBookId
        });

      transactionId = checkoutResponse.body.id;
    });

    // Clean up second test user after tests
    afterAll(async () => {
      await pool.query('DELETE FROM users WHERE email = $1', ['transaction-test-2@example.com']);
    });

    it('should return 401 when trying to return a book without authentication', async () => {
      const response = await request(app)
        .put(`/transactions/${transactionId}/return`)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('message', 'Authentication token required');
    });

    it('should return 404 when trying to return a non-existent transaction', async () => {
      const nonExistentId = 99999;
      const response = await request(app)
        .put(`/transactions/${nonExistentId}/return`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('not found');
    });

    it('should return 403 when a different user tries to return a book they did not check out', async () => {
      // Try to return the book with the second user's token
      const response = await request(app)
        .put(`/transactions/${transactionId}/return`)
        .set('Authorization', `Bearer ${secondUserAuthToken}`)
        .expect('Content-Type', /json/)
        .expect(403);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('not authorized');
    });

    it('should successfully return a book that the user has checked out', async () => {
      const response = await request(app)
        .put(`/transactions/${transactionId}/return`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('id', transactionId);
      expect(response.body).toHaveProperty('return_date');
    });

    it('should return 400 when trying to return a book that has already been returned', async () => {
      const response = await request(app)
        .put(`/transactions/${transactionId}/return`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('already returned');
    });
  });
});
