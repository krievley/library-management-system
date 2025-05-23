const request = require('supertest');
const app = require('../app');

describe('Books API', () => {
  // Test for GET /books/api/books
  describe('GET /books/api/books', () => {
    it('should return a list of books with pagination', async () => {
      const response = await request(app)
        .get('/books/api/books')
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
        .get(`/books/api/books?limit=${limit}`)
        .expect('Content-Type', /json/)
        .expect(200);

      // Check that the number of books returned matches the limit
      expect(response.body.books.length).toBeLessThanOrEqual(limit);
      expect(response.body.pagination.limit).toBe(limit);
    });

    it('should return the correct page of books', async () => {
      // Get the first page
      const page1Response = await request(app)
        .get('/books/api/books?page=1&limit=5')
        .expect('Content-Type', /json/)
        .expect(200);

      // Get the second page
      const page2Response = await request(app)
        .get('/books/api/books?page=2&limit=5')
        .expect('Content-Type', /json/)
        .expect(200);

      // Check that the pages are different
      if (page1Response.body.books.length > 0 && page2Response.body.books.length > 0) {
        expect(page1Response.body.books[0].id).not.toBe(page2Response.body.books[0].id);
      }
    });

    it('should have copies field for each book with value between 1 and 5', async () => {
      const response = await request(app)
        .get('/books/api/books')
        .expect('Content-Type', /json/)
        .expect(200);

      // Check that each book has a copies field with a value between 1 and 5
      for (const book of response.body.books) {
        expect(book).toHaveProperty('copies');
        expect(book.copies).toBeGreaterThanOrEqual(1);
        expect(book.copies).toBeLessThanOrEqual(5);
      }
    });
  });
});