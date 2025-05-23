const db = require('../config/database');
const bcrypt = require('bcrypt');

class User {
  // Get all users
  static async getAll() {
    try {
      const result = await db.query('SELECT id, email, created_at, updated_at FROM users ORDER BY email');
      return result.rows;
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  }

  // Get a user by ID
  static async getById(id) {
    try {
      const result = await db.query('SELECT id, email, created_at, updated_at FROM users WHERE id = $1', [id]);
      return result.rows[0];
    } catch (error) {
      console.error(`Error fetching user with ID ${id}:`, error);
      throw error;
    }
  }

  // Get a user by email
  static async getByEmail(email) {
    try {
      const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
      return result.rows[0];
    } catch (error) {
      console.error(`Error fetching user with email ${email}:`, error);
      throw error;
    }
  }

  // Create a new user
  static async create(user) {
    const { email, password } = user;
    try {
      // Hash the password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      const result = await db.query(
        'INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id, email, created_at, updated_at',
        [email, hashedPassword]
      );
      return result.rows[0];
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  // Update a user
  static async update(id, user) {
    const { email, password } = user;
    try {
      let hashedPassword = password;

      // If password is provided, hash it
      if (password) {
        const saltRounds = 10;
        hashedPassword = await bcrypt.hash(password, saltRounds);
      }

      // Build the query dynamically based on what fields are provided
      let query = 'UPDATE users SET ';
      const queryParams = [];
      const updateFields = [];

      if (email) {
        queryParams.push(email);
        updateFields.push(`email = $${queryParams.length}`);
      }

      if (password) {
        queryParams.push(hashedPassword);
        updateFields.push(`password = $${queryParams.length}`);
      }

      // If no fields to update, return the user
      if (updateFields.length === 0) {
        return this.getById(id);
      }

      query += updateFields.join(', ');
      queryParams.push(id);
      query += ` WHERE id = $${queryParams.length} RETURNING id, email, created_at, updated_at`;

      const result = await db.query(query, queryParams);
      return result.rows[0];
    } catch (error) {
      console.error(`Error updating user with ID ${id}:`, error);
      throw error;
    }
  }

  // Delete a user
  static async delete(id) {
    try {
      await db.query('DELETE FROM users WHERE id = $1', [id]);
      return true;
    } catch (error) {
      console.error(`Error deleting user with ID ${id}:`, error);
      throw error;
    }
  }

  // Validate user credentials
  static async validateCredentials(email, password) {
    try {
      // Get the user by email
      const user = await this.getByEmail(email);

      // If user not found, return null
      if (!user) {
        return null;
      }

      // Compare the provided password with the stored hash
      const isValid = await bcrypt.compare(password, user.password);

      // If password is valid, return the user (excluding the password)
      if (isValid) {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      }

      // If password is invalid, return null
      return null;
    } catch (error) {
      console.error('Error validating user credentials:', error);
      throw error;
    }
  }
}

module.exports = User;
