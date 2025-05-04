import 'bootstrap/dist/css/bootstrap.min.css';
import './client.css';

// Utility function for making API requests
const makeApiRequest = async (url, options) => {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL}${url}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include',
    });
    const result = await response.json();
    return { response, result };
  } catch (error) {
    console.error(`API request failed for ${url}:`, error);
    throw error;
  }
};

// Utility function to reset messages
const resetMessages = (elements) => {
  elements.forEach((el) => {
    if (el) {
      el.textContent = '';
      el.style.display = 'none';
      el.style.color = ''; // Reset color for success messages
    }
  });
};

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const createForm = document.getElementById('createForm');
  const errorMessage = document.getElementById('errorMessage');
  const createMessage = document.getElementById('createMessage');

  // Login Form Submission
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      resetMessages([errorMessage, createMessage]);

      const username = document.getElementById('username')?.value;
      const password = document.getElementById('password')?.value;

      if (!username || !password) {
        errorMessage.textContent = 'Username and password are required';
        errorMessage.style.display = 'block';
        return;
      }

      try {
        const { response, result } = await makeApiRequest('/api/login', {
          method: 'POST',
          body: JSON.stringify({ username, password }),
        });

        if (response.ok) {
          console.log('Login successful:', result);
          window.location.href = result.redirect || '/dashboard.html';
        } else {
          errorMessage.textContent = result.message || 'Login failed';
          errorMessage.style.display = 'block';
        }
      } catch (error) {
        errorMessage.textContent = 'An error occurred. Please try again.';
        errorMessage.style.display = 'block';
      }
    });
  }

  // Create Account Form Submission
  if (createForm) {
    createForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      resetMessages([errorMessage, createMessage]);

      const username = document.getElementById('createUsername')?.value;
      const firstName = document.getElementById('createFirstName')?.value;
      const lastName = document.getElementById('createLastName')?.value;
      const email = document.getElementById('createEmail')?.value;
      const password = document.getElementById('createPassword')?.value;

      if (!username || !firstName || !lastName || !email || !password) {
        createMessage.textContent = 'All fields are required';
        createMessage.style.color = 'red';
        createMessage.style.display = 'block';
        return;
      }

      try {
        const { response, result } = await makeApiRequest('/api/create', {
          method: 'POST',
          body: JSON.stringify({ username, firstName, lastName, email, password }),
        });

        if (response.ok) {
          createMessage.textContent = 'Account created successfully! Please log in.';
          createMessage.style.display = 'block';
          createForm.reset();
        } else {
          createMessage.textContent = result.message || 'Account creation failed';
          createMessage.style.color = 'red';
          createMessage.style.display = 'block';
        }
      } catch (error) {
        createMessage.textContent = 'An error occurred. Please try again.';
        createMessage.style.color = 'red';
        createMessage.style.display = 'block';
      }
    });
  }
});