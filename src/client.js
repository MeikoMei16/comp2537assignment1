// src/client.js
import 'bootstrap/dist/css/bootstrap.min.css';
import './client.css';

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const createForm = document.getElementById('createForm');
  const errorMessage = document.getElementById('errorMessage');
  const createMessage = document.getElementById('createMessage');

  const resetMessages = () => {
    errorMessage.textContent = '';
    errorMessage.style.display = 'none';
    createMessage.textContent = '';
    createMessage.style.display = 'none';
  };

  // Login Form Submission (unchanged)
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    resetMessages();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const loginData = { username, password };

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData),
        credentials: 'include',
      });

      const result = await response.json();

      if (response.ok) {
        console.log('Login successful:', result);
        window.location.href = result.redirect || '/dashboard.html';
      } else {
        errorMessage.textContent = result.message || 'Login failed';
        errorMessage.style.display = 'block';
      }
    } catch (error) {
      console.error('Error during login:', error);
      errorMessage.textContent = 'An error occurred. Please try again.';
      errorMessage.style.display = 'block';
    }
  });

  // Create Account Form Submission
  createForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    resetMessages();

    const username = document.getElementById('createUsername').value;
    const firstName = document.getElementById('createFirstName').value;
    const lastName = document.getElementById('createLastName').value;
    const email = document.getElementById('createEmail').value;
    const password = document.getElementById('createPassword').value;
    const createData = { username, firstName, lastName, email, password };

    try {
      const response = await fetch('/api/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createData),
        credentials: 'include',
      });

      const result = await response.json();

      if (response.ok) {
        createMessage.textContent = 'Account created successfully! Please log in.';
        createMessage.style.display = 'block';
        createForm.reset();
      } else {
        createMessage.style.color = 'red';
        createMessage.textContent = result.message || 'Account creation failed';
        createMessage.style.display = 'block';
      }
    } catch (error) {
      console.error('Error during account creation:', error);
      createMessage.style.color = 'red';
      createMessage.textContent = 'An error occurred. Please try again.';
      createMessage.style.display = 'block';
    }
  });
});