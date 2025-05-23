import { useState } from 'react'
import BooksApp from "./Books";
import LoginApp from "./Login";
import RegisterApp from "./Register";


function App() {
    const [window, setWindow] = useState('book');

    return (
        <>
            <nav>
                <ul>
                    <li onClick={() => setWindow('book')}>Books</li>
                    <li onClick={() => setWindow('login')}>Login</li>
                    <li onClick={() => setWindow('register')}>Register</li>
                </ul>
            </nav>
            {window == 'book' ? <BooksApp /> : null}
            {window == 'login' ? <LoginApp /> : null}
            {window == 'register' ? <RegisterApp /> : null}
        </>
    );
}

export default App;
