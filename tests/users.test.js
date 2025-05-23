const request = require('supertest');
const app = require('../app');
const { pool } = require('../config/database');
const { redisClient } = require('../config/redis');
const User = require('../models/user');
const bcrypt = require('bcrypt');

describe('User Authentication', () => {
  // Test user data
  const testUser = {
    email: 'test@example.com',
    password: 'password123'
  };
  
  // Store token for protected route tests
  let authToken;
  
  // Clean up database before tests
  beforeAll(async () => {
    // Delete test user if it exists
    await pool.query('DELETE FROM users WHERE email = $1', [testUser.email]);
  });
  
  // Close database and Redis connections after all tests
  afterAll(async () => {
    await pool.query('DELETE FROM users WHERE email = $1', [testUser.email]);
    await pool.end();
    await redisClient.quit();
  });
  
  // Test user registration
  describe('POST /users/register', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/users/register')
        .send(testUser)
        .expect('Content-Type', /json/)
        .expect(201);
      
      // Check response structure
      expect(response.body).toHaveProperty('message', 'User registered successfully');
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user).toHaveProperty('email', testUser.email);
      
      // Save token for later tests
      authToken = response.body.token;
    });
    
    it('should return 400 if email is missing', async () => {
      const response = await request(app)
        .post('/users/register')
        .send({ password: testUser.password })
        .expect('Content-Type', /json/)
        .expect(400);
      
      expect(response.body).toHaveProperty('message', 'Email and password are required');
    });
    
    it('should return 400 if password is missing', async () => {
      const response = await request(app)
        .post('/users/register')
        .send({ email: testUser.email })
        .expect('Content-Type', /json/)
        .expect(400);
      
      expect(response.body).toHaveProperty('message', 'Email and password are required');
    });
    
    it('should return 409 if email already exists', async () => {
      const response = await request(app)
        .post('/users/register')
        .send(testUser)
        .expect('Content-Type', /json/)
        .expect(409);
      
      expect(response.body).toHaveProperty('message', 'Email already exists');
    });
  });
  
  // Test user login
  describe('POST /users/login', () => {
    it('should login successfully with correct credentials', async () => {
      const response = await request(app)
        .post('/users/login')
        .send(testUser)
        .expect('Content-Type', /json/)
        .expect(200);
      
      // Check response structure
      expect(response.body).toHaveProperty('message', 'Login successful');
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user).toHaveProperty('email', testUser.email);
      
      // Save token for later tests if not already saved
      if (!authToken) {
        authToken = response.body.token;
      }
    });
    
    it('should return 400 if email is missing', async () => {
      const response = await request(app)
        .post('/users/login')
        .send({ password: testUser.password })
        .expect('Content-Type', /json/)
        .expect(400);
      
      expect(response.body).toHaveProperty('message', 'Email and password are required');
    });
    
    it('should return 400 if password is missing', async () => {
      const response = await request(app)
        .post('/users/login')
        .send({ email: testUser.email })
        .expect('Content-Type', /json/)
        .expect(400);
      
      expect(response.body).toHaveProperty('message', 'Email and password are required');
    });
    
    it('should return 401 if email is incorrect', async () => {
      const response = await request(app)
        .post('/users/login')
        .send({ email: 'wrong@example.com', password: testUser.password })
        .expect('Content-Type', /json/)
        .expect(401);
      
      expect(response.body).toHaveProperty('message', 'Invalid email or password');
    });
    
    it('should return 401 if password is incorrect', async () => {
      const response = await request(app)
        .post('/users/login')
        .send({ email: testUser.email, password: 'wrongpassword' })
        .expect('Content-Type', /json/)
        .expect(401);
      
      expect(response.body).toHaveProperty('message', 'Invalid email or password');
    });
  });
  
  // Test protected routes
  describe('Protected Routes', () => {
    it('should access protected route with valid token', async () => {
      const response = await request(app)
        .get('/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body).toHaveProperty('email', testUser.email);
    });
    
    it('should return 401 when accessing protected route without token', async () => {
      const response = await request(app)
        .get('/users/me')
        .expect('Content-Type', /json/)
        .expect(401);
      
      expect(response.body).toHaveProperty('message', 'Authentication token required');
    });
    
    it('should return 403 when accessing protected route with invalid token', async () => {
      const response = await request(app)
        .get('/users/me')
        .set('Authorization', 'Bearer invalidtoken')
        .expect('Content-Type', /json/)
        .expect(403);
      
      expect(response.body).toHaveProperty('message', 'Invalid or expired token');
    });
  });
  
  // Test user update (protected route)
  describe('PUT /users/me', () => {
    it('should update user email successfully', async () => {
      const updatedEmail = 'updated@example.com';
      
      const response = await request(app)
        .put('/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ email: updatedEmail })
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body).toHaveProperty('message', 'User updated successfully');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('email', updatedEmail);
      
      // Update test user email for subsequent tests
      testUser.email = updatedEmail;
    });
    
    it('should update user password successfully', async () => {
      const updatedPassword = 'newpassword123';
      
      const response = await request(app)
        .put('/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ password: updatedPassword })
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body).toHaveProperty('message', 'User updated successfully');
      
      // Verify password was updated by trying to login with new password
      const loginResponse = await request(app)
        .post('/users/login')
        .send({ email: testUser.email, password: updatedPassword })
        .expect(200);
      
      expect(loginResponse.body).toHaveProperty('message', 'Login successful');
      
      // Update test user password for subsequent tests
      testUser.password = updatedPassword;
    });
    
    it('should return 401 when updating without token', async () => {
      const response = await request(app)
        .put('/users/me')
        .send({ email: 'another@example.com' })
        .expect('Content-Type', /json/)
        .expect(401);
      
      expect(response.body).toHaveProperty('message', 'Authentication token required');
    });
  });
});