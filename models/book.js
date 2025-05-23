const db = require('../config/database');

class Book {
  // Get all books
  static async getAll() {
    try {
      const result = await db.query('SELECT * FROM books ORDER BY title');
      return result.rows;
    } catch (error) {
      console.error('Error fetching books:', error);
      throw error;
    }
  }

  // Get paginated books
  static async getPaginated(page = 1, limit = 10) {
    try {
      // Calculate offset
      const offset = (page - 1) * limit;

      // Get total count
      const countResult = await db.query('SELECT COUNT(*) FROM books');
      const total = parseInt(countResult.rows[0].count);

      // Get paginated books
      const result = await db.query(
        'SELECT * FROM books ORDER BY title LIMIT $1 OFFSET $2',
        [limit, offset]
      );

      return {
        books: result.rows,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error fetching paginated books:', error);
      throw error;
    }
  }

  // Get a book by ID
  static async getById(id) {
    try {
      const result = await db.query('SELECT * FROM books WHERE id = $1', [id]);
      return result.rows[0];
    } catch (error) {
      console.error(`Error fetching book with ID ${id}:`, error);
      throw error;
    }
  }

  // Create a new book
  static async create(book) {
    const { title, author, isbn, published_year, genre, copies } = book;
    try {
      // Ensure copies is never null and never less than zero
      const copiesValue = copies !== undefined ? Math.max(0, copies) : 1;

      const result = await db.query(
        'INSERT INTO books (title, author, isbn, published_year, genre, copies) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [title, author, isbn, published_year, genre, copiesValue]
      );
      return result.rows[0];
    } catch (error) {
      console.error('Error creating book:', error);
      throw error;
    }
  }

  // Update a book
  static async update(id, book) {
    const { title, author, isbn, published_year, genre, copies } = book;
    try {
      // Ensure copies is never null and never less than zero
      const copiesValue = copies !== undefined ? Math.max(0, copies) : 1;

      const result = await db.query(
        'UPDATE books SET title = $1, author = $2, isbn = $3, published_year = $4, genre = $5, copies = $6 WHERE id = $7 RETURNING *',
        [title, author, isbn, published_year, genre, copiesValue, id]
      );
      return result.rows[0];
    } catch (error) {
      console.error(`Error updating book with ID ${id}:`, error);
      throw error;
    }
  }

  // Delete a book
  static async delete(id) {
    try {
      await db.query('DELETE FROM books WHERE id = $1', [id]);
      return true;
    } catch (error) {
      console.error(`Error deleting book with ID ${id}:`, error);
      throw error;
    }
  }
}

module.exports = Book;
