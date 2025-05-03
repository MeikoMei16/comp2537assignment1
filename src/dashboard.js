/* eslint-disable no-unused-vars */
// src/dashboard.js
import 'bootstrap/dist/css/bootstrap.min.css';
import './dashboard.css';

document.addEventListener('DOMContentLoaded', async () => {
  // Check if user is logged in
  try {
    const response = await fetch('/api/check-session', {
      method: 'GET',
      credentials: 'include', // Include session cookie
    });
    const result = await response.json();
    if (!response.ok || !result.authenticated) {
      window.location.href = '/index.html'; // Redirect if not logged in
      return;
    }
    // If authenticated, display welcome message with username
    const welcomeMessage = document.getElementById('welcomeMessage');
    welcomeMessage.textContent = `Welcome, ${result.username}!`;
  } catch (error) {
    console.error('Session check failed:', error);
    window.location.href = '/index.html';
    return;
  }

  const signoutBtn = document.getElementById('signoutBtn');
  const errorMessage = document.getElementById('errorMessage');
  const successMessage = document.getElementById('successMessage');
  const createPostForm = document.getElementById('createPostForm');

  const resetMessages = () => {
    errorMessage.textContent = '';
    errorMessage.style.display = 'none';
    successMessage.textContent = '';
    successMessage.style.display = 'none';
  };

  signoutBtn.addEventListener('click', async () => {
    resetMessages();
    try {
      const response = await fetch('/api/signout', {
        method: 'POST',
        credentials: 'include',
      });
      const result = await response.json();
      if (response.ok) {
        window.location.href = result.redirect || '/index.html';
      } else {
        errorMessage.textContent = result.message || 'Signout failed';
        errorMessage.style.display = 'block';
      }
    } catch (error) {
      console.error('Error during signout:', error);
      errorMessage.textContent = 'An error occurred during signout.';
      errorMessage.style.display = 'block';
    }
  });

  // Create Post handler
  createPostForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    resetMessages();

    const postText = document.getElementById('postText').value;
    const postData = { post_text: postText };

    try {
      const response = await fetch('/api/create-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postData),
        credentials: 'include',
      });
      const result = await response.json();

      if (response.ok) {
        successMessage.textContent = 'Post created successfully!';
        successMessage.style.display = 'block';
        createPostForm.reset();
      } else {
        errorMessage.textContent = result.message || 'Failed to create post';
        errorMessage.style.display = 'block';
      }
    } catch (error) {
      console.error('Error creating post:', error);
      errorMessage.textContent = 'An error occurred while creating the post.';
      errorMessage.style.display = 'block';
    }
  });
});