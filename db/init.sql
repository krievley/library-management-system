-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on commonly queried user fields
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Create books table
CREATE TABLE IF NOT EXISTS books (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  author VARCHAR(255) NOT NULL,
  isbn VARCHAR(20) UNIQUE,
  published_year INTEGER,
  genre VARCHAR(100),
  copies INTEGER NOT NULL DEFAULT 1 CHECK (copies >= 0),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on commonly queried fields
CREATE INDEX IF NOT EXISTS idx_books_title ON books(title);
CREATE INDEX IF NOT EXISTS idx_books_author ON books(author);
CREATE INDEX IF NOT EXISTS idx_books_genre ON books(genre);

-- Insert some sample data
INSERT INTO books (title, author, isbn, published_year, genre, copies)
VALUES 
  ('To Kill a Mockingbird', 'Harper Lee', '9780061120084', 1960, 'Fiction', 5),
  ('1984', 'George Orwell', '9780451524935', 1949, 'Dystopian', 3),
  ('The Great Gatsby', 'F. Scott Fitzgerald', '9780743273565', 1925, 'Classic', 2),
  ('Pride and Prejudice', 'Jane Austen', '9780141439518', 1813, 'Romance', 4),
  ('The Hobbit', 'J.R.R. Tolkien', '9780547928227', 1937, 'Fantasy', 6)
ON CONFLICT (isbn) DO NOTHING;

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to automatically update the updated_at timestamp
CREATE TRIGGER update_books_modtime
BEFORE UPDATE ON books
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_users_modtime
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();
