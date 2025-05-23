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
});