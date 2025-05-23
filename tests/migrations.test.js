const { pool } = require('../config/database');
const { runMigrations } = require('../db/migrate');

describe('Database Migrations', () => {
  beforeAll(async () => {
    // Run migrations before tests
    await runMigrations();
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
    expect(result.rows).toHaveLength(6);
    
    // Check id column
    expect(result.rows[0].column_name).toBe('id');
    expect(result.rows[0].data_type).toBe('integer');
    expect(result.rows[0].is_nullable).toBe('NO');
    
    // Check username column
    expect(result.rows[1].column_name).toBe('username');
    expect(result.rows[1].data_type).toBe('character varying');
    expect(result.rows[1].is_nullable).toBe('NO');
    
    // Check email column
    expect(result.rows[2].column_name).toBe('email');
    expect(result.rows[2].data_type).toBe('character varying');
    expect(result.rows[2].is_nullable).toBe('NO');
    
    // Check password column
    expect(result.rows[3].column_name).toBe('password');
    expect(result.rows[3].data_type).toBe('character varying');
    expect(result.rows[3].is_nullable).toBe('NO');
  });

  it('should create the books table with correct schema', async () => {
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'books'
      ORDER BY ordinal_position;
    `);

    // Check that the books table has the expected columns
    expect(result.rows).toHaveLength(8);
    
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

  it('should create indexes on commonly queried fields', async () => {
    const result = await pool.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename IN ('users', 'books')
      ORDER BY tablename, indexname;
    `);

    // Check that the expected indexes exist
    const indexNames = result.rows.map(row => row.indexname);
    
    // Check users indexes
    expect(indexNames).toContain('idx_users_email');
    expect(indexNames).toContain('idx_users_username');
    
    // Check books indexes
    expect(indexNames).toContain('idx_books_author');
    expect(indexNames).toContain('idx_books_genre');
    expect(indexNames).toContain('idx_books_title');
  });

  it('should create triggers for updating the updated_at timestamp', async () => {
    const result = await pool.query(`
      SELECT trigger_name, event_manipulation, action_statement
      FROM information_schema.triggers
      WHERE event_object_table IN ('users', 'books')
      ORDER BY event_object_table, trigger_name;
    `);

    // Check that the expected triggers exist
    const triggerNames = result.rows.map(row => row.trigger_name);
    
    expect(triggerNames).toContain('update_books_modtime');
    expect(triggerNames).toContain('update_users_modtime');
    
    // Check that the triggers are for UPDATE events
    const updateTriggers = result.rows.filter(row => row.event_manipulation === 'UPDATE');
    expect(updateTriggers).toHaveLength(2);
    
    // Check that the triggers call the update_modified_column function
    const updateModifiedTriggers = result.rows.filter(row => 
      row.action_statement.includes('update_modified_column')
    );
    expect(updateModifiedTriggers).toHaveLength(2);
  });
});