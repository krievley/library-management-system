const request = require('supertest');
const app = require('../app');
const { pool } = require('../config/database');
const { redisClient } = require('../config/redis');

describe('Books API', () => {
  // Close database and Redis connections after all tests
  afterAll(async () => {
    await pool.end();
    await redisClient.quit();
  });
  // Test for GET /api/books
  describe('GET /api/books', () => {
    it('should return a list of books with pagination', async () => {
      const response = await request(app)
        .get('/api/books')
        .expect('Content-Type', /json/)
        .expect(200);

      // Check that the response has the expected structure
      expect(response.body).toHaveProperty('books');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination).toHaveProperty('total');
      expect(response.body.pagination).toHaveProperty('page');
      expect(response.body.pagination).toHaveProperty('limit');
      expect(response.body.pagination).toHaveProperty('pages');

      // Check that books is an array
      expect(Array.isArray(response.body.books)).toBe(true);
    });

    it('should return the correct number of books per page', async () => {
      const limit = 5;
      const response = await request(app)
        .get(`/api/books?limit=${limit}`)
        .expect('Content-Type', /json/)
        .expect(200);

      // Check that the number of books returned matches the limit
      expect(response.body.books.length).toBeLessThanOrEqual(limit);
      expect(response.body.pagination.limit).toBe(limit);
    });

    it('should return the correct page of books', async () => {
      // Get the first page
      const page1Response = await request(app)
        .get('/api/books?page=1&limit=5')
        .expect('Content-Type', /json/)
        .expect(200);

      // Get the second page
      const page2Response = await request(app)
        .get('/api/books?page=2&limit=5')
        .expect('Content-Type', /json/)
        .expect(200);

      // Check that the pages are different
      if (page1Response.body.books.length > 0 && page2Response.body.books.length > 0) {
        expect(page1Response.body.books[0].id).not.toBe(page2Response.body.books[0].id);
      }
    });

    it('should have copies field for each book with value between 1 and 5', async () => {
      const response = await request(app)
        .get('/api/books')
        .expect('Content-Type', /json/)
        .expect(200);

      // Check that each book has a copies field with a value between 1 and 5
      for (const book of response.body.books) {
        expect(book).toHaveProperty('copies');
        expect(book.copies).toBeGreaterThanOrEqual(1);
        expect(book.copies).toBeLessThanOrEqual(5);
      }
    });

    it('should filter books by search term when search parameter is provided', async () => {
      // Get a book from the database to use for search
      const allBooksResponse = await request(app)
        .get('/api/books')
        .expect(200);

      // Make sure we have books to test with
      expect(allBooksResponse.body.books.length).toBeGreaterThan(0);

      // Get the title of the first book to use as search term
      const searchTerm = allBooksResponse.body.books[0].title.substring(0, 5);

      // Search for books with the search term
      const searchResponse = await request(app)
        .get(`/api/books?search=${encodeURIComponent(searchTerm)}`)
        .expect('Content-Type', /json/)
        .expect(200);

      // Check that we got results
      expect(searchResponse.body.books.length).toBeGreaterThan(0);

      // Check that all returned books match the search term in title, author, or genre
      for (const book of searchResponse.body.books) {
        const matchesTitle = book.title.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesAuthor = book.author.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesGenre = book.genre && book.genre.toLowerCase().includes(searchTerm.toLowerCase());

        expect(matchesTitle || matchesAuthor || matchesGenre).toBe(true);
      }
    });

    it('should return empty books array when search term matches no books', async () => {
      const nonExistentSearchTerm = 'xyznonexistentterm123';

      const response = await request(app)
        .get(`/api/books?search=${nonExistentSearchTerm}`)
        .expect('Content-Type', /json/)
        .expect(200);

      // Check that we got an empty array
      expect(response.body.books.length).toBe(0);
      expect(response.body.pagination.total).toBe(0);
    });

    it('should handle special characters in search parameter', async () => {
      const specialCharSearchTerm = 'special&char%';

      // This should not throw an error
      const response = await request(app)
        .get(`/api/books?search=${encodeURIComponent(specialCharSearchTerm)}`)
        .expect('Content-Type', /json/)
        .expect(200);

      // Response should be valid even with special characters
      expect(response.body).toHaveProperty('books');
      expect(response.body).toHaveProperty('pagination');
    });
  });
});
