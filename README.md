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
   DATABASE_URL=postgresql://your_postgres_user:your_postgres_password@localhost:5432/library

   # Redis Configuration
   REDIS_URL=redis://localhost:6379

   # JWT Configuration
   JWT_SECRET=your_jwt_secret
   ```

4. Initialize the PostgreSQL database using migrations:
   ```
   npm run migrate:up
   ```

   This will create all necessary tables, indexes, and seed data.

## Running the Application

Start the application:
```
npm start
```

The application will be available at http://localhost:3000

## API Endpoints

### Users

- `GET /users/register` - Render registration page
- `POST /users/register` - Register a new user
- `GET /users/login` - Render login page
- `POST /users/login` - Login a user
- `GET /users/me` - Get current user (protected route)
- `PUT /users/me` - Update current user (protected route)
- `GET /users` - Get all users

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

### Users Table

| Column         | Type      | Description                  |
|----------------|-----------|------------------------------|
| id             | SERIAL    | Primary key                  |
| username       | VARCHAR   | Username (unique)            |
| email          | VARCHAR   | Email address (unique)       |
| password       | VARCHAR   | Hashed password              |
| created_at     | TIMESTAMP | Creation timestamp           |
| updated_at     | TIMESTAMP | Last update timestamp        |

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

## Authentication

The application uses JWT (JSON Web Tokens) for authentication:

- Users can register with a username, email, and password
- Passwords are hashed using bcrypt before being stored in the database
- Upon successful login or registration, a JWT token is generated and returned to the client
- The client stores the token in localStorage and includes it in the Authorization header for protected routes
- Protected routes verify the token using the JWT_SECRET environment variable
- The token contains the user's ID and username, and expires after 24 hours

### Protected Routes

The following routes require authentication:

- `GET /users/me` - Get current user
- `PUT /users/me` - Update current user

To access these routes, include the JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

## Caching Strategy

The application uses Redis for caching:

- Book lists are cached with a key of `all_books`
- Individual books are cached with a key of `book_{id}`
- Paginated book lists are cached with keys of `api_books_page{page}_limit{limit}`
- Cache is invalidated when books are created, updated, or deleted

## Development and Testing

### Database Migrations

This project uses [node-pg-migrate](https://github.com/salsita/node-pg-migrate) for database migrations. Migrations allow you to version control your database schema and make incremental changes to it. The `DATABASE_URL` environment variable is required for node-pg-migrate to connect to the PostgreSQL database.

#### Creating a New Migration

To create a new migration:

```
npm run migrate:create name_of_migration
```

This will create a new migration file in the `migrations` directory with a timestamp prefix.

#### Running Migrations

Migrations are automatically run when the application starts if the database schema is not up to date. However, you can also run migrations manually:

To run all pending migrations:

```
npm run migrate:up
```

To run a specific number of pending migrations:

```
npm run migrate -- up 1
```

#### Rolling Back Migrations

To roll back the most recent migration:

```
npm run migrate:down
```

To roll back a specific number of migrations:

```
npm run migrate -- down 1
```

### Adding New Features

1. Create or update models in the `models` directory
2. Create or update routes in the `routes` directory
3. Create a new migration for any database schema changes
4. Update the caching strategy as appropriate

### Database Seeding

You can seed the database with 50 random books using the following command:

```
npm run seed
```

This will generate 50 books with random titles, authors, ISBNs, and between 1 and 5 copies each.

#### Running Migrations with Seed Data

If you want to run migrations and then seed the database in one command, you can use:

```
npm run migrate:with-seed
```

This will first run all pending migrations and then seed the database with 50 random books. This is useful for setting up a new development environment or resetting the database with fresh data.

### Database Management

#### Erasing Database Data

If you need to clear all data from the database while preserving the table structures and migration history, you can use:

```
npm run db:erase
```

This will truncate all application tables (users, books, etc.) but preserve the pgmigrations table to maintain migration history. This is useful during development when you want to start with a clean database without having to drop and recreate tables.

#### Resetting the Database

To completely reset the database (erase all data and then run migrations and seed data), you can use:

```
npm run db:reset
```

This command combines `db:erase`, `migrate:up`, and `seed` in one step. It's useful when you want to quickly reset your database to a clean state with sample data.

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

The `DATABASE_URL` environment variable is required for database migrations using node-pg-migrate. It should be in the format:
```
postgresql://username:password@host:port/database
```

For production, set the environment variables in your deployment environment.

.gitignore
app.js
bin/
package-lock.json
package.json
public/
routes/
views/
