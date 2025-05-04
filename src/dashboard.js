/* eslint-disable no-unused-vars */
// src/dashboard.js
import 'bootstrap/dist/css/bootstrap.min.css';
import './dashboard.css';

document.addEventListener('DOMContentLoaded', async () => {
  // Log the current path for debugging
  const currentPath = window.location.pathname;
  console.log('Current path:', currentPath);

  // Normalize paths to handle trailing slashes
  const normalizedPath = currentPath.endsWith('/') ? currentPath.slice(0, -1) : currentPath;
  const validRoutes = ['/index.html', '/dashboard.html', '/404.html', '', '/']; // Include root routes

  // Check if the current path is valid
  if (!validRoutes.includes(normalizedPath)) {
    console.log('Redirecting to 404.html for invalid path:', normalizedPath);
    window.location.href = '/404.html';
    return;
  }

  // Redirect root routes to /index.html
  if (normalizedPath === '' || normalizedPath === '/') {
    console.log('Redirecting root path to /index.html');
    window.location.href = '/index.html';
    return;
  }

  // Session check only for dashboard.html
  if (normalizedPath === '/dashboard.html') {
    try {
      const response = await fetch('/api/check-session', {
        method: 'GET',
        credentials: 'include',
      });
      const result = await response.json();
      if (!response.ok || !result.authenticated) {
        window.location.href = '/index.html';
        return;
      }
      const welcomeMessage = document.getElementById('welcomeMessage');
      if (welcomeMessage) {
        welcomeMessage.textContent = `Welcome, ${result.username}!`;
      }

      // Random GIF selection
      const gifPaths = [
        '/public/pictures/pepe.gif',
        '/public/pictures/theresa.gif',
        '/public/pictures/viro.gif'
      ];
      const randomIndex = Math.floor(Math.random() * gifPaths.length);
      const gifImage = document.getElementById('gifImage');
      if (gifImage) {
        gifImage.src = gifPaths[randomIndex];
      }
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
      if (errorMessage) errorMessage.textContent = '';
      if (errorMessage) errorMessage.style.display = 'none';
      if (successMessage) successMessage.textContent = '';
      if (successMessage) successMessage.style.display = 'none';
    };

    if (signoutBtn) {
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
    }

    if (createPostForm) {
      createPostForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        resetMessages();

        const postText = document.getElementById('postText')?.value;
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
    }
  }
});