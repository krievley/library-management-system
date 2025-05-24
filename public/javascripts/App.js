const App = () => {
    const [window, setWindow] = React.useState('book');
    // Check if user is logged in
    const [isLoggedIn, setIsLoggedIn] = React.useState(false);
    const [user, setUser] = React.useState({});

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setIsLoggedIn(false);
        setUser({});
    }

    React.useEffect(() => {
        const token = localStorage.getItem('token');
        const userData = JSON.parse(localStorage.getItem('user') || '{}');
        const isUserLoggedIn = !!(token && userData);
        setIsLoggedIn(isUserLoggedIn);
        setUser(userData);
    }, []);

    return (
        <>
            <div className="auth-links">
                <button onClick={() => setWindow('book')}>Books</button>
                {!isLoggedIn ? (
                        <>
                            <button onClick={() => setWindow('login')}>Login</button>
                            <button onClick={() => setWindow('register')}>Register</button>
                        </>
                    ) : (
                        <button onClick={logout}>Logout</button>
                    )}
            </div>
            {window == 'book' ? <BooksApp user={user} isLoggedIn={isLoggedIn} /> : null}
            {window == 'login' ? <LoginApp /> : null}
            {window == 'register' ? <RegisterApp /> : null}
        </>
    );
}

// BooksApp component - Main component that fetches and displays books
const BooksApp = ({user, isLoggedIn}) => {
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
            const url = `/api/books?page=${page}&limit=${limit}${search ? `&search=${encodeURIComponent(search)}` : ''}`;
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

    // Handle book checkout
    const handleBookCheckout = async (bookId) => {
        try {
            // Get user from localStorage
            const user = JSON.parse(localStorage.getItem('user') || '{}');

            if (!user.id) {
                console.error('User ID not found');
                return { success: false, error: 'User ID not found' };
            }

            // Make API call to create a transaction
            const response = await fetch('/api/checkout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    user_id: user.id,
                    book_id: bookId
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to checkout book');
            }

            const data = await response.json();
            console.log('Checkout successful:', data);

            // Update the book in the list to reflect the new availability
            setBooks(books.map(book => {
                if (book.id === bookId) {
                    return {
                        ...book,
                        available_copies: book.available_copies - 1
                    };
                }
                return book;
            }));

            return { success: true };
        } catch (error) {
            console.error('Error checking out book:', error);
            return { success: false, error: error.message };
        }
    };

    // Handle book return
    const handleBookReturn = async (transactionId, bookId) => {
        try {
            // Make API call to return the book
            const response = await fetch(`/api/return`, {
                method: 'POST',
                body: JSON.stringify({
                    id: transactionId
                }),
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to return book');
            }

            const data = await response.json();
            console.log('Return successful:', data);

            // Update the book in the list to reflect the new availability
            setBooks(books.map(book => {
                if (book.id === bookId) {
                    return {
                        ...book,
                        available_copies: book.available_copies + 1
                    };
                }
                return book;
            }));

            return { success: true };
        } catch (error) {
            console.error('Error returning book:', error);
            return { success: false, error: error.message };
        }
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
                    <BooksTable
                        user={user}
                        isLoggedIn={isLoggedIn}
                        books={books}
                        onCheckout={handleBookCheckout}
                        onReturn={handleBookReturn}
                    />

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
const BooksTable = ({user, isLoggedIn, books, onCheckout, onReturn }) => {
    // Check if user is logged in
    const [userTransactions, setUserTransactions] = React.useState([]);
    const [loadingTransactions, setLoadingTransactions] = React.useState(false);

    React.useEffect(() => {
        // Fetch user's active transactions if logged in
        if (isLoggedIn && user.id) {
            fetchUserTransactions(user.id);
        }
    }, []);

    // Fetch user's transactions
    const fetchUserTransactions = async (userId) => {
        setLoadingTransactions(true);
        try {
            const response = await fetch(`/transactions/user/${userId}`, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            // Filter for active transactions (return_date is null)
            const activeTransactions = data.filter(t => t.return_date === null);
            setUserTransactions(activeTransactions);
        } catch (error) {
            console.error("Error fetching user transactions:", error);
        } finally {
            setLoadingTransactions(false);
        }
    };

    // State for tracking checkout status
    const [checkoutStatus, setCheckoutStatus] = React.useState({
        loading: false,
        error: null,
        success: false,
        bookId: null
    });

    // Handle checkout button click
    const handleCheckout = async (bookId) => {
        setCheckoutStatus({
            loading: true,
            error: null,
            success: false,
            bookId
        });

        try {
            // Call the onCheckout function passed from parent
            const result = await onCheckout(bookId);

            if (result.success) {
                setCheckoutStatus({
                    loading: false,
                    error: null,
                    success: true,
                    bookId
                });

                // Refresh user transactions to update the UI
                if (user.id) {
                    fetchUserTransactions(user.id);
                }
            } else {
                throw new Error(result.error || 'Failed to checkout book');
            }
        } catch (error) {
            console.error('Error checking out book:', error);
            setCheckoutStatus({
                loading: false,
                error: error.message,
                success: false,
                bookId
            });
        }
    };

    // State for tracking return status
    const [returnStatus, setReturnStatus] = React.useState({
        loading: false,
        error: null,
        success: false,
        transactionId: null
    });

    // Handle return button click
    const handleReturn = async (transactionId, bookId) => {
        setReturnStatus({
            loading: true,
            error: null,
            success: false,
            transactionId
        });

        try {
            // Call the onReturn function passed from parent
            const result = await onReturn(transactionId, bookId);

            if (result.success) {
                setReturnStatus({
                    loading: false,
                    error: null,
                    success: true,
                    transactionId
                });

                // Refresh user transactions to update the UI
                if (user.id) {
                    fetchUserTransactions(user.id);
                }
            } else {
                throw new Error(result.error || 'Failed to return book');
            }
        } catch (error) {
            console.error('Error returning book:', error);
            setReturnStatus({
                loading: false,
                error: error.message,
                success: false,
                transactionId
            });
        }
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
                            {/* Find if user has an active transaction for this book */}
                            {(() => {
                                const activeTransaction = userTransactions.find(t => t.book_id === book.id);

                                if (activeTransaction) {
                                    // User has an active transaction for this book, show Return button
                                    if (returnStatus.transactionId === activeTransaction.id) {
                                        if (returnStatus.loading) {
                                            return (
                                                <button className="return-button loading" disabled>
                                                    Processing...
                                                </button>
                                            );
                                        } else if (returnStatus.success) {
                                            return (
                                                <button className="return-button success" disabled>
                                                    Returned ✓
                                                </button>
                                            );
                                        } else if (returnStatus.error) {
                                            return (
                                                <button
                                                    className="return-button error"
                                                    onClick={() => handleReturn(activeTransaction.id, book.id)}
                                                    title={returnStatus.error}
                                                >
                                                    Try Again
                                                </button>
                                            );
                                        }
                                    }

                                    return (
                                        <button
                                            className="return-button"
                                            onClick={() => handleReturn(activeTransaction.id, book.id)}
                                        >
                                            Return
                                        </button>
                                    );
                                } else {
                                    // User doesn't have an active transaction, show Checkout button if copies available
                                    if (book.available_copies > 0) {
                                        if (checkoutStatus.bookId === book.id) {
                                            if (checkoutStatus.loading) {
                                                return (
                                                    <button className="checkout-button loading" disabled>
                                                        Processing...
                                                    </button>
                                                );
                                            } else if (checkoutStatus.error) {
                                                return (
                                                    <button
                                                        className="checkout-button error"
                                                        onClick={() => handleCheckout(book.id)}
                                                        title={checkoutStatus.error}
                                                    >
                                                        Try Again
                                                    </button>
                                                );
                                            }
                                        }

                                        return (
                                            <button
                                                className="checkout-button"
                                                onClick={() => handleCheckout(book.id)}
                                            >
                                                Checkout
                                            </button>
                                        );
                                    } else {
                                        return <span className="no-copies">No Copies Available</span>;
                                    }
                                }
                            })()}
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

// LoginApp component - Main component for the login form
const LoginApp = () => {
    const [formData, setFormData] = React.useState({
        email: '',
        password: ''
    });
    const [error, setError] = React.useState('');
    const [loading, setLoading] = React.useState(false);

    // Handle form input changes
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prevData => ({
            ...prevData,
            [name]: value
        }));
    };

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();

        // Clear previous error messages
        setError('');

        setLoading(true);

        try {
            // Send login request
            const response = await fetch('/users/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    email: formData.email,
                    password: formData.password
                })
            });

            const data = await response.json();

            if (!response.ok) {
                // Display error message
                setError(data.message || 'Login failed');
                return;
            }

            // Store token in localStorage
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));

            // Redirect to home page
            window.location.href = '/';
        } catch (error) {
            console.error('Login error:', error);
            setError('An error occurred during login. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="form-container">
            <h1>Login</h1>

            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label htmlFor="email">Email</label>
                    <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="password">Password</label>
                    <input
                        type="password"
                        id="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                    />
                </div>

                <div className="form-group">
                    <button type="submit" disabled={loading}>
                        {loading ? 'Logging in...' : 'Login'}
                    </button>
                </div>

                <div className="form-links">
                    <p>Don't have an account? <a href="/users/register">Register here</a></p>
                </div>
            </form>

            {error && <div className="error-message">{error}</div>}
        </div>
    );
};

// RegisterApp component - Main component for the registration form
const RegisterApp = () => {
    const [formData, setFormData] = React.useState({
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [error, setError] = React.useState('');
    const [loading, setLoading] = React.useState(false);

    // Handle form input changes
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prevData => ({
            ...prevData,
            [name]: value
        }));
    };

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();

        // Clear previous error messages
        setError('');

        // Validate passwords match
        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);

        try {
            // Send registration request
            const response = await fetch('/users/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    email: formData.email,
                    password: formData.password
                })
            });

            const data = await response.json();

            if (!response.ok) {
                // Display error message
                setError(data.message || 'Registration failed');
                return;
            }

            // Store token in localStorage
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));

            // Redirect to home page
            window.location.href = '/';
        } catch (error) {
            console.error('Registration error:', error);
            setError('An error occurred during registration. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="form-container">
            <h1>Register</h1>

            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label htmlFor="email">Email</label>
                    <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="password">Password</label>
                    <input
                        type="password"
                        id="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="confirmPassword">Confirm Password</label>
                    <input
                        type="password"
                        id="confirmPassword"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        required
                    />
                </div>

                <div className="form-group">
                    <button type="submit" disabled={loading}>
                        {loading ? 'Registering...' : 'Register'}
                    </button>
                </div>

                <div className="form-links">
                    <p>Already have an account? <a href="/users/login">Login here</a></p>
                </div>
            </form>

            {error && <div className="error-message">{error}</div>}
        </div>
    );
};

// Change to this export syntax for browser modules
export { App };