const db = require('../config/database');

class Transaction {
  // Get all transactions
  static async getAll() {
    try {
      const result = await db.query(`
        SELECT t.*, u.email as user_email, b.title as book_title 
        FROM transactions t
        JOIN users u ON t.user_id = u.id
        JOIN books b ON t.book_id = b.id
        ORDER BY t.checkout_date DESC
      `);
      return result.rows;
    } catch (error) {
      console.error('Error fetching transactions:', error);
      throw error;
    }
  }

  // Get a transaction by ID
  static async getById(id) {
    try {
      const result = await db.query(`
        SELECT t.*, u.email as user_email, b.title as book_title 
        FROM transactions t
        JOIN users u ON t.user_id = u.id
        JOIN books b ON t.book_id = b.id
        WHERE t.id = $1
      `, [id]);
      return result.rows[0];
    } catch (error) {
      console.error(`Error fetching transaction with ID ${id}:`, error);
      throw error;
    }
  }

  // Get transactions by user ID
  static async getByUserId(userId) {
    try {
      const result = await db.query(`
        SELECT t.*, b.title as book_title 
        FROM transactions t
        JOIN books b ON t.book_id = b.id
        WHERE t.user_id = $1
        ORDER BY t.checkout_date DESC
      `, [userId]);
      return result.rows;
    } catch (error) {
      console.error(`Error fetching transactions for user ${userId}:`, error);
      throw error;
    }
  }

  // Get transactions by book ID
  static async getByBookId(bookId) {
    try {
      const result = await db.query(`
        SELECT t.*, u.email as user_email 
        FROM transactions t
        JOIN users u ON t.user_id = u.id
        WHERE t.book_id = $1
        ORDER BY t.checkout_date DESC
      `, [bookId]);
      return result.rows;
    } catch (error) {
      console.error(`Error fetching transactions for book ${bookId}:`, error);
      throw error;
    }
  }

  // Get active transactions (books not returned yet)
  static async getActive() {
    try {
      const result = await db.query(`
        SELECT t.*, u.email as user_email, b.title as book_title 
        FROM transactions t
        JOIN users u ON t.user_id = u.id
        JOIN books b ON t.book_id = b.id
        WHERE t.return_date IS NULL
        ORDER BY t.due_date ASC
      `);
      return result.rows;
    } catch (error) {
      console.error('Error fetching active transactions:', error);
      throw error;
    }
  }

  // Get overdue transactions
  static async getOverdue() {
    try {
      const result = await db.query(`
        SELECT t.*, u.email as user_email, b.title as book_title 
        FROM transactions t
        JOIN users u ON t.user_id = u.id
        JOIN books b ON t.book_id = b.id
        WHERE t.return_date IS NULL AND t.due_date < NOW()
        ORDER BY t.due_date ASC
      `);
      return result.rows;
    } catch (error) {
      console.error('Error fetching overdue transactions:', error);
      throw error;
    }
  }

  // Create a new transaction (checkout a book)
  static async create(transaction) {
    const { user_id, book_id, due_date } = transaction;
    try {
      // Start a transaction to ensure atomicity
      await db.query('BEGIN');

      // Check if the book has available copies
      const bookResult = await db.query('SELECT copies FROM books WHERE id = $1 FOR UPDATE', [book_id]);
      const book = bookResult.rows[0];
      
      if (!book) {
        await db.query('ROLLBACK');
        throw new Error(`Book with ID ${book_id} not found`);
      }
      
      if (book.copies <= 0) {
        await db.query('ROLLBACK');
        throw new Error(`No copies available for book with ID ${book_id}`);
      }

      // Decrement the book copies
      await db.query('UPDATE books SET copies = copies - 1 WHERE id = $1', [book_id]);

      // Create the transaction
      const result = await db.query(
        'INSERT INTO transactions (user_id, book_id, due_date) VALUES ($1, $2, $3) RETURNING *',
        [user_id, book_id, due_date]
      );

      // Commit the transaction
      await db.query('COMMIT');

      return result.rows[0];
    } catch (error) {
      // Rollback in case of error
      await db.query('ROLLBACK');
      console.error('Error creating transaction:', error);
      throw error;
    }
  }

  // Return a book
  static async returnBook(id) {
    try {
      // Start a transaction to ensure atomicity
      await db.query('BEGIN');

      // Get the transaction
      const transactionResult = await db.query('SELECT * FROM transactions WHERE id = $1 FOR UPDATE', [id]);
      const transaction = transactionResult.rows[0];
      
      if (!transaction) {
        await db.query('ROLLBACK');
        throw new Error(`Transaction with ID ${id} not found`);
      }
      
      if (transaction.return_date) {
        await db.query('ROLLBACK');
        throw new Error(`Book already returned for transaction with ID ${id}`);
      }

      // Update the transaction with return date
      const result = await db.query(
        'UPDATE transactions SET return_date = NOW() WHERE id = $1 RETURNING *',
        [id]
      );

      // Increment the book copies
      await db.query('UPDATE books SET copies = copies + 1 WHERE id = $1', [transaction.book_id]);

      // Commit the transaction
      await db.query('COMMIT');

      return result.rows[0];
    } catch (error) {
      // Rollback in case of error
      await db.query('ROLLBACK');
      console.error(`Error returning book for transaction ${id}:`, error);
      throw error;
    }
  }

  // Delete a transaction
  static async delete(id) {
    try {
      await db.query('DELETE FROM transactions WHERE id = $1', [id]);
      return true;
    } catch (error) {
      console.error(`Error deleting transaction with ID ${id}:`, error);
      throw error;
    }
  }
}

module.exports = Transaction;