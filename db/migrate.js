const path = require('path');
const { promises: fs } = require('fs');
const { exec } = require('child_process');
const { pool } = require('../config/database');

/**
 * Run database migrations programmatically using npm scripts
 * @param {Object} options - Migration options
 * @param {string} options.direction - Migration direction ('up' or 'down')
 * @param {number} options.count - Number of migrations to run
 * @returns {Promise<void>}
 */
async function runMigrations(options = { direction: 'up', count: Infinity }) {
  const { direction, count } = options;

  console.log(`Running migrations ${direction}${count !== Infinity ? ` (${count})` : ''}...`);

  try {
    // Determine the command to run
    let command = `npm run migrate:${direction}`;
    if (count !== Infinity) {
      command += ` -- ${count}`;
    }

    // Execute the command
    await new Promise((resolve, reject) => {
      exec(command, { cwd: path.resolve(__dirname, '..') }, (error, stdout, stderr) => {
        if (error) {
          console.error(`Error executing command: ${command}`);
          console.error(stderr);
          reject(error);
          return;
        }

        console.log(stdout);
        resolve();
      });
    });

    console.log('Migrations completed successfully.');
  } catch (error) {
    console.error('Error running migrations:', error);
    throw error;
  }
}

/**
 * Check if migrations are needed
 * @returns {Promise<boolean>} - True if migrations are needed, false otherwise
 */
async function checkMigrationsNeeded() {
  try {
    // Check if pgmigrations table exists
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'pgmigrations'
      );
    `);

    if (!tableExists.rows[0].exists) {
      return true;
    }

    // Check if there are pending migrations
    const migrationsDir = path.resolve(__dirname, '../migrations');
    const files = await fs.readdir(migrationsDir);
    const migrationFiles = files.filter(file => file.endsWith('.js'));

    const appliedMigrations = await pool.query('SELECT name FROM pgmigrations');
    const appliedMigrationNames = appliedMigrations.rows.map(row => row.name);

    const pendingMigrations = migrationFiles.filter(file => {
      const migrationName = path.basename(file, '.js');
      return !appliedMigrationNames.includes(migrationName);
    });

    return pendingMigrations.length > 0;
  } catch (error) {
    console.error('Error checking migrations:', error);
    // If there's an error, assume migrations are needed
    return true;
  }
}

module.exports = {
  runMigrations,
  checkMigrationsNeeded
};
