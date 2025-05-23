const { faker } = require('@faker-js/faker');
const db = require('../config/database');

async function seedBooks() {
  try {
    console.log('Starting to seed books...');
    
    // Generate 50 books with random copies between 1 and 5
    const books = [];
    for (let i = 0; i < 50; i++) {
      const title = faker.commerce.productName();
      const author = faker.person.fullName();
      const isbn = faker.string.numeric(13);
      const published_year = faker.number.int({ min: 1900, max: 2023 });
      const genre = faker.helpers.arrayElement([
        'Fiction', 'Non-Fiction', 'Science Fiction', 'Fantasy', 
        'Mystery', 'Thriller', 'Romance', 'Horror', 'Biography', 
        'History', 'Self-Help', 'Business', 'Children', 'Poetry'
      ]);
      const copies = faker.number.int({ min: 1, max: 5 });
      
      books.push({
        title,
        author,
        isbn,
        published_year,
        genre,
        copies
      });
    }
    
    // Insert books into the database
    for (const book of books) {
      await db.query(
        'INSERT INTO books (title, author, isbn, published_year, genre, copies) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (isbn) DO NOTHING',
        [book.title, book.author, book.isbn, book.published_year, book.genre, book.copies]
      );
    }
    
    console.log('Successfully seeded 50 books!');
    
    // Close the database connection
    await db.pool.end();
  } catch (error) {
    console.error('Error seeding books:', error);
    process.exit(1);
  }
}

// Run the seed function
seedBooks();