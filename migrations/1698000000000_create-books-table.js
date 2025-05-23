const { PgLiteral } = require('node-pg-migrate');

exports.up = pgm => {
  // Create update_modified_column function
  // Note: This function might already exist if the users migration has run
  pgm.createFunction(
    'update_modified_column',
    [],
    { returns: 'trigger', language: 'plpgsql', ifNotExists: true },
    `
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    `
  );

  // Create books table
  pgm.createTable('books', {
    id: 'id',
    title: { type: 'varchar(255)', notNull: true },
    author: { type: 'varchar(255)', notNull: true },
    isbn: { type: 'varchar(20)', unique: true },
    published_year: { type: 'integer' },
    genre: { type: 'varchar(100)' },
    copies: { 
      type: 'integer', 
      notNull: true, 
      default: 1,
      check: 'copies >= 0'
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

  // Create indexes on books table
  pgm.createIndex('books', 'title');
  pgm.createIndex('books', 'author');
  pgm.createIndex('books', 'genre');

  // Create trigger for updated_at
  pgm.createTrigger('books', 'update_books_modtime', {
    when: 'BEFORE',
    operation: 'UPDATE',
    level: 'ROW',
    function: 'update_modified_column'
  });

  // Insert sample books data
  pgm.sql(`
    INSERT INTO books (title, author, isbn, published_year, genre, copies)
    VALUES 
      ('To Kill a Mockingbird', 'Harper Lee', '9780061120084', 1960, 'Fiction', 5),
      ('1984', 'George Orwell', '9780451524935', 1949, 'Dystopian', 3),
      ('The Great Gatsby', 'F. Scott Fitzgerald', '9780743273565', 1925, 'Classic', 2),
      ('Pride and Prejudice', 'Jane Austen', '9780141439518', 1813, 'Romance', 4),
      ('The Hobbit', 'J.R.R. Tolkien', '9780547928227', 1937, 'Fantasy', 6)
    ON CONFLICT (isbn) DO NOTHING;
  `);
};

exports.down = pgm => {
  // Drop trigger
  pgm.dropTrigger('books', 'update_books_modtime');

  // Drop table
  pgm.dropTable('books');

  // Note: We don't drop the function here as it might be used by other tables
  // The function will be dropped in the users migration's down method if needed
};
