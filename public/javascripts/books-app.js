// BooksApp component - Main component that fetches and displays books
const BooksApp = () => {
  const [books, setBooks] = React.useState([]);
  const [pagination, setPagination] = React.useState({
    total: 0,
    page: 1,
    limit: 10,
    pages: 0
  });
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [currentSearch, setCurrentSearch] = React.useState('');

  // Fetch books from the API
  const fetchBooks = async (page = 1, limit = 10, search = '') => {
    setLoading(true);
    try {
      const url = `/books/api/books?page=${page}&limit=${limit}${search ? `&search=${encodeURIComponent(search)}` : ''}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setBooks(data.books);
      setPagination(data.pagination);
      setCurrentSearch(search);
      setError(null);
    } catch (e) {
      console.error("Error fetching books:", e);
      setError("Failed to load books. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  // Load books when the component mounts
  React.useEffect(() => {
    fetchBooks(pagination.page, pagination.limit);
  }, []);

  // Handle page change
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.pages) {
      fetchBooks(newPage, pagination.limit, currentSearch);
    }
  };

  // Handle limit change
  const handleLimitChange = (event) => {
    const newLimit = parseInt(event.target.value);
    fetchBooks(1, newLimit, currentSearch);
  };

  // Handle search input change
  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  // Handle search form submission
  const handleSearch = (event) => {
    event.preventDefault();
    fetchBooks(1, pagination.limit, searchTerm);
  };

  return (
    <div className="books-container">
      <h2>Library Books</h2>

      {/* Search form */}
      <form onSubmit={handleSearch} className="search-form">
        <input
          type="text"
          placeholder="Search by title, author, or genre"
          value={searchTerm}
          onChange={handleSearchChange}
          className="search-input"
        />
        <button type="submit" className="search-button">Search</button>
        {currentSearch && (
          <button 
            type="button" 
            className="clear-search" 
            onClick={() => {
              setSearchTerm('');
              fetchBooks(1, pagination.limit, '');
            }}
          >
            Clear Search
          </button>
        )}
      </form>

      {/* Error message */}
      {error && <div className="error-message">{error}</div>}

      {/* Loading indicator */}
      {loading ? (
        <div className="loading">Loading books...</div>
      ) : (
        <>
          {/* Search results info */}
          {currentSearch && (
            <div className="search-results-info">
              Search results for: <strong>{currentSearch}</strong>
            </div>
          )}

          {/* Books table */}
          <BooksTable books={books} />

          {/* Pagination controls */}
          <div className="pagination-controls">
            <div className="page-info">
              Showing {books.length} of {pagination.total} books
            </div>
            <div className="limit-selector">
              Books per page: 
              <select value={pagination.limit} onChange={handleLimitChange}>
                <option value="5">5</option>
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
              </select>
            </div>
            <Pagination 
              currentPage={pagination.page} 
              totalPages={pagination.pages} 
              onPageChange={handlePageChange} 
            />
          </div>
        </>
      )}
    </div>
  );
};

// BooksTable component - Displays the books in a table
const BooksTable = ({ books }) => {
  // Check if user is logged in
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);

  React.useEffect(() => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    setIsLoggedIn(!!(token && user));
  }, []);

  // Handle checkout button click
  const handleCheckout = (bookId) => {
    // Implement checkout functionality here
    console.log(`Checking out book with ID: ${bookId}`);
    // You would typically make an API call to create a transaction
  };

  if (books.length === 0) {
    return <div className="no-books">No books available</div>;
  }

  return (
    <table className="books-table">
      <thead>
        <tr>
          <th>Title</th>
          <th>Author</th>
          <th>Genre</th>
          <th>Published Year</th>
          <th>Copies Available</th>
          {isLoggedIn && <th>Actions</th>}
        </tr>
      </thead>
      <tbody>
        {books.map(book => (
          <tr key={book.id}>
            <td>{book.title}</td>
            <td>{book.author}</td>
            <td>{book.genre}</td>
            <td>{book.published_year}</td>
            <td>{book.available_copies}</td>
            {isLoggedIn && (
              <td>
                {book.available_copies > 0 && (
                  <button 
                    className="checkout-button"
                    onClick={() => handleCheckout(book.id)}
                  >
                    Checkout
                  </button>
                )}
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

// Pagination component - Displays pagination controls
const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages = [];
    const maxPagesToShow = 5;

    if (totalPages <= maxPagesToShow) {
      // If we have fewer pages than the max, show all pages
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always include first page
      pages.push(1);

      // Calculate start and end of page range around current page
      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);

      // Adjust if we're at the beginning or end
      if (currentPage <= 2) {
        end = Math.min(totalPages - 1, 4);
      } else if (currentPage >= totalPages - 1) {
        start = Math.max(2, totalPages - 3);
      }

      // Add ellipsis if needed
      if (start > 2) {
        pages.push('...');
      }

      // Add page numbers in the middle
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      // Add ellipsis if needed
      if (end < totalPages - 1) {
        pages.push('...');
      }

      // Always include last page
      if (totalPages > 1) {
        pages.push(totalPages);
      }
    }

    return pages;
  };

  return (
    <div className="pagination">
      <button 
        onClick={() => onPageChange(currentPage - 1)} 
        disabled={currentPage === 1}
      >
        Previous
      </button>

      {getPageNumbers().map((page, index) => (
        page === '...' ? (
          <span key={`ellipsis-${index}`} className="ellipsis">...</span>
        ) : (
          <button 
            key={page} 
            onClick={() => onPageChange(page)}
            className={currentPage === page ? 'active' : ''}
          >
            {page}
          </button>
        )
      ))}

      <button 
        onClick={() => onPageChange(currentPage + 1)} 
        disabled={currentPage === totalPages}
      >
        Next
      </button>
    </div>
  );
};

// Render the app
ReactDOM.render(<BooksApp />, document.getElementById('books-app'));
