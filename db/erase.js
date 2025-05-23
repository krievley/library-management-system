const { pool } = require('../config/database');

/**
 * Erases all data from the PostgreSQL database while preserving table structures
 * This function truncates all application tables but preserves the pgmigrations table
 * to maintain migration history
 * @returns {Promise<void>}
 */
async function eraseDatabase() {
  const client = await pool.connect();
  
  try {
    // Start a transaction
    await client.query('BEGIN');
    
    console.log('Starting database erasure...');
    
    // Get all tables in the public schema except pgmigrations
    const tablesResult = await client.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename != 'pgmigrations'
    `);
    
    const tables = tablesResult.rows.map(row => row.tablename);
    
    if (tables.length === 0) {
      console.log('No tables found to erase.');
      await client.query('COMMIT');
      return;
    }
    
    console.log(`Found ${tables.length} tables to erase: ${tables.join(', ')}`);
    
    // Disable foreign key constraints temporarily
    await client.query('SET CONSTRAINTS ALL DEFERRED');
    
    // Truncate all tables in a single command (faster and handles foreign keys)
    const truncateQuery = `TRUNCATE TABLE ${tables.join(', ')} CASCADE`;
    await client.query(truncateQuery);
    
    // Re-enable constraints
    await client.query('SET CONSTRAINTS ALL IMMEDIATE');
    
    // Commit the transaction
    await client.query('COMMIT');
    
    console.log('Database erasure completed successfully.');
  } catch (error) {
    // Rollback the transaction in case of error
    await client.query('ROLLBACK');
    console.error('Error erasing database:', error);
    throw error;
  } finally {
    // Release the client back to the pool
    client.release();
  }
}

// If this script is run directly (not imported)
if (require.main === module) {
  // Load environment variables if needed
  require('dotenv').config();
  
  eraseDatabase()
    .then(() => {
      console.log('Database erasure script completed.');
      process.exit(0);
    })
    .catch(error => {
      console.error('Database erasure script failed:', error);
      process.exit(1);
    });
}

module.exports = { eraseDatabase };