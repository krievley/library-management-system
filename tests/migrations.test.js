const { pool } = require('../config/database');
const { runMigrations } = require('../db/migrate');
const { exec } = require('child_process');
const path = require('path');

describe('Database Migrations', () => {
  beforeAll(async () => {
    // Run migrations directly using npm script to avoid ESM issues
    await new Promise((resolve, reject) => {
      exec('npm run migrate:up', { cwd: path.resolve(__dirname, '..') }, (error, stdout, stderr) => {
        if (error) {
          console.error('Error running migrations:');
          console.error(stderr);
          reject(error);
          return;
        }
        console.log(stdout);
        resolve();
      });
    });
  });

  afterAll(async () => {
    // Close database connection
    await pool.end();
  });

  it('should create the users table with correct schema', async () => {
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position;
    `);

    // Check that the users table has the expected columns
    expect(result.rows).toHaveLength(5);

    // Check id column
    expect(result.rows[0].column_name).toBe('id');
    expect(result.rows[0].data_type).toBe('integer');
    expect(result.rows[0].is_nullable).toBe('NO');

    // Check email column
    expect(result.rows[1].column_name).toBe('email');
    expect(result.rows[1].data_type).toBe('character varying');
    expect(result.rows[1].is_nullable).toBe('NO');

    // Check password column
    expect(result.rows[2].column_name).toBe('password');
    expect(result.rows[2].data_type).toBe('character varying');
    expect(result.rows[2].is_nullable).toBe('NO');
  });

  it('should create the books table with correct schema', async () => {
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'books'
      ORDER BY ordinal_position;
    `);

    // Check that the books table has the expected columns
    expect(result.rows).toHaveLength(9);

    // Check id column
    expect(result.rows[0].column_name).toBe('id');
    expect(result.rows[0].data_type).toBe('integer');
    expect(result.rows[0].is_nullable).toBe('NO');

    // Check title column
    expect(result.rows[1].column_name).toBe('title');
    expect(result.rows[1].data_type).toBe('character varying');
    expect(result.rows[1].is_nullable).toBe('NO');

    // Check author column
    expect(result.rows[2].column_name).toBe('author');
    expect(result.rows[2].data_type).toBe('character varying');
    expect(result.rows[2].is_nullable).toBe('NO');

    // Check copies column
    expect(result.rows[6].column_name).toBe('copies');
    expect(result.rows[6].data_type).toBe('integer');
    expect(result.rows[6].is_nullable).toBe('NO');
  });

  it('should create the transactions table with correct schema', async () => {
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'transactions'
      ORDER BY ordinal_position;
    `);

    // Check that the transactions table has the expected columns
    expect(result.rows).toHaveLength(7);

    // Check id column
    expect(result.rows[0].column_name).toBe('id');
    expect(result.rows[0].data_type).toBe('integer');
    expect(result.rows[0].is_nullable).toBe('NO');

    // Check user_id column
    expect(result.rows[1].column_name).toBe('user_id');
    expect(result.rows[1].data_type).toBe('integer');
    expect(result.rows[1].is_nullable).toBe('NO');

    // Check book_id column
    expect(result.rows[2].column_name).toBe('book_id');
    expect(result.rows[2].data_type).toBe('integer');
    expect(result.rows[2].is_nullable).toBe('NO');

    // Check checkout_date column
    expect(result.rows[3].column_name).toBe('checkout_date');
    expect(result.rows[3].data_type).toBe('timestamp without time zone');
    expect(result.rows[3].is_nullable).toBe('NO');

    // Check return_date column
    expect(result.rows[4].column_name).toBe('return_date');
    expect(result.rows[4].data_type).toBe('timestamp without time zone');
    expect(result.rows[4].is_nullable).toBe('YES');
  });

  it('should create indexes on commonly queried fields', async () => {
    const result = await pool.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename IN ('users', 'books', 'transactions')
      ORDER BY tablename, indexname;
    `);

    // Check that the expected indexes exist
    const indexNames = result.rows.map(row => row.indexname);

    // Check users indexes
    expect(indexNames).toContain('users_email_index');

    // Check books indexes
    expect(indexNames).toContain('books_author_index');
    expect(indexNames).toContain('books_genre_index');
    expect(indexNames).toContain('books_title_index');

    // Check transactions indexes
    expect(indexNames).toContain('transactions_checkout_date_index');
    expect(indexNames).toContain('transactions_return_date_index');
  });

  it('should create triggers for updating the updated_at timestamp', async () => {
    const result = await pool.query(`
      SELECT trigger_name, event_manipulation, action_statement
      FROM information_schema.triggers
      WHERE event_object_table IN ('users', 'books', 'transactions')
      ORDER BY event_object_table;
    `);

    // Check that the expected triggers exist
    const triggerNames = result.rows.map(row => row.trigger_name);

    expect(triggerNames).toContain('update_books_modtime');
    expect(triggerNames).toContain('update_users_modtime');
    expect(triggerNames).toContain('update_transactions_modtime');
  });
});
