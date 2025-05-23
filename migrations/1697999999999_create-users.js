const { PgLiteral } = require('node-pg-migrate');

exports.up = pgm => {
  // Create update_modified_column function
  pgm.createFunction(
    'update_modified_column',
    [],
    { returns: 'trigger', language: 'plpgsql' },
    `
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    `
  );

  // Create users table
  pgm.createTable('users', {
    id: 'id',
    email: { type: 'varchar(100)', notNull: true, unique: true },
    password: { type: 'varchar(255)', notNull: true },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    },
    updated_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    }
  });

  // Create indexes on users table
  pgm.createIndex('users', 'email');

  // Create trigger for updated_at
  pgm.createTrigger('users', 'update_users_modtime', {
    when: 'BEFORE',
    operation: 'UPDATE',
    level: 'ROW',
    function: 'update_modified_column'
  });
};

exports.down = pgm => {
  // Drop trigger
  pgm.dropTrigger('users', 'update_users_modtime');

  // Drop table
  pgm.dropTable('users');

  // Drop function
  pgm.dropFunction('update_modified_column', []);
};
