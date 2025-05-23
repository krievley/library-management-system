const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

describe('migrate:with-seed script', () => {
  it('should exist in package.json', () => {
    // Read package.json
    const packageJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf8'));
    
    // Check if the script exists
    expect(packageJson.scripts).toHaveProperty('migrate:with-seed');
    
    // Check if the script does what it's supposed to do
    expect(packageJson.scripts['migrate:with-seed']).toBe('npm run migrate:up && npm run seed');
  });
  
  // Note: We can't actually run the script in tests as it would modify the database
  // This is just a simple test to verify the script exists and is correctly defined
  
  it('should have the correct components', () => {
    // Check if the migrate:up script exists
    const packageJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf8'));
    expect(packageJson.scripts).toHaveProperty('migrate:up');
    
    // Check if the seed script exists
    expect(packageJson.scripts).toHaveProperty('seed');
    
    // Check if node-pg-migrate is installed
    expect(packageJson.dependencies).toHaveProperty('node-pg-migrate');
    
    // Check if the seed.js file exists
    expect(fs.existsSync(path.resolve(__dirname, '../db/seed.js'))).toBe(true);
  });
});