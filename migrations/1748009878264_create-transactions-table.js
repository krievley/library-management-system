const { PgLiteral } = require('node-pg-migrate');

exports.up = pgm => {
  // Create update_modified_transactions function if it doesn't exist
  pgm.createFunction(
    'update_modified_transactions',
    [],
    { returns: 'trigger', language: 'plpgsql', ifNotExists: true },
    `
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    `
  );

  // Create transactions table
  pgm.createTable('transactions', {
    id: 'id',
    user_id: {
      type: 'integer',
      notNull: true,
      references: 'users(id)',
      onDelete: 'CASCADE'
    },
    book_id: {
      type: 'integer',
      notNull: true,
      references: 'books(id)',
      onDelete: 'CASCADE'
    },
    checkout_date: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    },
    return_date: {
      type: 'timestamp'
    },
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

  // Create indexes on transactions table
  pgm.createIndex('transactions', 'checkout_date');
  pgm.createIndex('transactions', 'return_date');

  // Create trigger for updated_at
  pgm.createTrigger('transactions', 'update_transactions_modtime', {
    when: 'BEFORE',
    operation: 'UPDATE',
    level: 'ROW',
    function: 'update_modified_transactions'
  });
};

exports.down = pgm => {
  // Drop trigger
  pgm.dropTrigger('transactions', 'update_transactions_modtime');

  // Drop table
  pgm.dropTable('transactions');

  // Drop function
  pgm.dropFunction('update_modified_transactions', []);
};
