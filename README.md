# Library Management System

A Node.js Express application for managing a library, using PostgreSQL for data storage and Redis for caching.

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)
- PostgreSQL (v12 or higher)
- Redis (v6 or higher)

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/library-management-system.git
   cd library-management-system
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file in the root directory with the following variables:
   ```
   # PostgreSQL Configuration
   POSTGRES_USER=your_postgres_user
   POSTGRES_PASSWORD=your_postgres_password
   POSTGRES_HOST=localhost
   POSTGRES_PORT=5432
   POSTGRES_DB=library

   # Redis Configuration
   REDIS_URL=redis://localhost:6379
   ```

4. Initialize the PostgreSQL database:
   ```
   psql -U your_postgres_user -d library -f db/init.sql
   ```

## Running the Application

Start the application:
```
npm start
```

The application will be available at http://localhost:3000

## API Endpoints

### Books

- `GET /books` - Get all books
- `GET /books/:id` - Get a book by ID
- `POST /books` - Create a new book
- `PUT /books/:id` - Update a book
- `DELETE /books/:id` - Delete a book
- `GET /books/api/books` - Get paginated books with caching
  - Query parameters:
    - `page` (default: 1) - Page number
    - `limit` (default: 10) - Number of books per page
  - Response format:
    ```json
    {
      "books": [...],
      "pagination": {
        "total": 100,
        "page": 1,
        "limit": 10,
        "pages": 10
      }
    }
    ```

## Database Schema

### Books Table

| Column         | Type      | Description                  |
|----------------|-----------|------------------------------|
| id             | SERIAL    | Primary key                  |
| title          | VARCHAR   | Book title                   |
| author         | VARCHAR   | Book author                  |
| isbn           | VARCHAR   | ISBN (unique)                |
| published_year | INTEGER   | Year of publication          |
| genre          | VARCHAR   | Book genre                   |
| copies         | INTEGER   | Number of copies available   |
| created_at     | TIMESTAMP | Creation timestamp           |
| updated_at     | TIMESTAMP | Last update timestamp        |

## Caching Strategy

The application uses Redis for caching:

- Book lists are cached with a key of `all_books`
- Individual books are cached with a key of `book_{id}`
- Paginated book lists are cached with keys of `api_books_page{page}_limit{limit}`
- Cache is invalidated when books are created, updated, or deleted

## Development and Testing

### Adding New Features

1. Create or update models in the `models` directory
2. Create or update routes in the `routes` directory
3. Update the database schema in `db/init.sql` if needed
4. Update the caching strategy as appropriate

### Database Seeding

You can seed the database with 50 random books using the following command:

```
npm run seed
```

This will generate 50 books with random titles, authors, ISBNs, and between 1 and 5 copies each.

### Testing

The application uses Jest for testing. To run the tests:

```
npm test
```

To seed the database and then run the tests:

```
npm run test:with-seed
```

The tests verify that:
- The `/books/api/books` endpoint returns a list of books with pagination
- The endpoint returns the correct number of books per page
- The endpoint returns the correct page of books
- Each book has a copies field with a value between 1 and 5

### Environment Variables

For development, you can use the default values in the configuration files:

- PostgreSQL: `config/database.js`
- Redis: `config/redis.js`

For production, set the environment variables in your deployment environment.

.gitignore
app.js
bin/
package-lock.json
package.json
public/
routes/
views/
