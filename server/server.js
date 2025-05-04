/* eslint-disable no-undef */
import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { join } from 'path';
import { existsSync } from 'fs';

const app = express();
const port = process.env.PORT || 10000;

if (!process.env.SESSION_SECRET) throw new Error('SESSION_SECRET not set in .env');
if (!process.env.MONGO_URI) throw new Error('MONGO_URI not set in .env');

// Use process.cwd() for project root
const projectRoot = process.cwd();
const distPath = join(projectRoot, 'dist');
console.log('Project root:', projectRoot);
console.log('Dist path:', distPath);
console.log('Dist exists:', existsSync(distPath));

// MongoDB connection
async function initializeDatabase() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB connected successfully to database: ${mongoose.connection.db.databaseName}`);
    return mongoose.connection;
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    throw error;
  }
}

// Define Mongoose Schemas
const userSchema = new mongoose.Schema({
  user_name: { type: String, required: true, unique: true },
  first_name: { type: String, required: true },
  last_name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});
const User = mongoose.model('User', userSchema);

const postSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true },
  posted_text: { type: String, required: true },
  view: { type: Number, required: true },
});
const Post = mongoose.model('Post', postSchema);

const isAuthenticated = (req, res, next) => {
  console.log('Checking authentication for:', req.url, 'Session user:', req.session.user);
  if (req.session.user) {
    next();
  } else {
    res.status(401).json({ message: 'Not authenticated', authenticated: false });
    res.end();
  }
};

// Log all incoming requests and MongoDB status
app.use(async (req, res, next) => {
  console.log(`Processing request: ${req.method} ${req.url}`);
  try {
    await mongoose.connection.db.admin().ping();
    console.log('MongoDB connection is active');
    next();
  } catch (error) {
    console.error('MongoDB ping failed:', error.message);
    res.status(500).json({ message: 'Database connection error' });
    res.end();
  }
});

// CORS configuration
const allowedOrigins = [
  'http://localhost:5173',
  process.env.FRONTEND_URL || 'https://comp2537assignment1-jx73.onrender.com',
].filter(Boolean);

app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) callback(null, origin);
        else callback(new Error('Blocked by CORS'));
      },
      credentials: true
    })
);

app.options('*', cors());

app.use(express.json());
app.use(cookieParser());
app.set('trust proxy', 1); // Trust first proxy (Render, Heroku, etc.)



// Session configuration
const sessionStore = MongoStore.create({
  mongoUrl: process.env.MONGO_URI,
  collectionName: 'sessions',
});
sessionStore.on('error', (error) => {
  console.error('Session store error:', error);
});

app.use(
    session({
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      store: sessionStore,
      cookie: {
        secure: true,
        httpOnly: true,
        maxAge: 60 * 60 * 1000,
        sameSite: 'none',
      },
    })
);

// Log response completion and cookies
app.use((req, res, next) => {
  const originalEnd = res.end;
  res.end = function (...args) {
    console.log(`Response sent for ${req.method} ${req.url}: Status ${res.statusCode}, Cookies:`, res.get('Set-Cookie'));
    return originalEnd.apply(this, args);
  };
  next();
});

// Serve static files
console.log('Serving static files from:', distPath);
app.use(express.static(distPath));

// Debug endpoint to list dist files
app.get('/api/debug-files', (req, res) => {
  const fs = require('fs');
  try {
    const files = fs.readdirSync(distPath);
    console.log('Dist folder contents:', files);
    res.status(200).json({ distFiles: files });
    res.end();
  } catch (error) {
    console.error('Error reading dist folder:', error.message);
    res.status(500).json({ message: 'Cannot read dist folder', error: error.message });
    res.end();
  }
});

// API endpoints
app.get('/api/check-session', isAuthenticated, (req, res) => {
  console.log('Handling /api/check-session for user:', req.session.user.username);
  res.status(200).json({
    message: 'Session is valid',
    authenticated: true,
    username: req.session.user.username,
    ID: req.session.user.ID,
  });
  res.end();
});

app.get('/api/test-db', async (req, res) => {
  console.log('Handling /api/test-db');
  try {
    await mongoose.connection.db.admin().ping();
    res.status(200).json({ message: 'MongoDB connection is working' });
    res.end();
  } catch (error) {
    console.error('MongoDB ping error:', error.message);
    res.status(500).json({ message: 'MongoDB connection failed', error: error.message });
    res.end();
  }
});

app.post('/api/login', async (req, res) => {
  console.log('Received POST /api/login:', req.body);
  const { username, password } = req.body;
  if (!username || !password) {
    console.log('Missing username or password');
    res.status(400).json({ message: 'Username and password are required' });
    return res.end();
  }
  try {
    console.log('Querying user:', username);
    const user = await User.findOne({ user_name: { $regex: new RegExp(`^${username}$`, 'i') } });
    console.log('User lookup result:', user ? 'Found' : 'Not found');
    if (user && await bcrypt.compare(password, user.password)) {
      console.log('Password matched, setting session for:', username);
      req.session.user = { username: user.user_name, ID: user._id.toString() };
      await new Promise((resolve, reject) => {
        req.session.save((err) => {
          if (err) {
            console.error('Session save error:', err);
            reject(err);
          } else {
            console.log('Session saved successfully');
            resolve();
          }
        });
      });
      console.log('Sending 200 response for:', username);
      res.status(200).json({ message: 'Login successful', redirect: '/dashboard.html' });
      res.end();
    } else {
      console.log('Invalid credentials for:', username);
      res.status(401).json({ message: 'Invalid username or password' });
      res.end();
    }
  } catch (error) {
    console.error('Error in /api/login:', error.message);
    res.status(500).json({ message: 'Server error during login', error: error.message });
    res.end();
  }
});

app.post('/api/create', async (req, res) => {
  console.log('Received POST /api/create:', req.body);
  const { username, firstName, lastName, email, password } = req.body;
  if (!username || !firstName || !lastName || !email || !password) {
    console.log('Missing required fields');
    res.status(400).json({ message: 'All fields are required' });
    return res.end();
  }
  try {
    const hashedPassword = await bcrypt.hash(password, 12);
    const newUser = new User({
      user_name: username,
      first_name: firstName,
      last_name: lastName,
      email,
      password: hashedPassword,
    });
    await newUser.save();
    console.log('User created:', username);
    res.status(201).json({ message: 'User created successfully' });
    res.end();
  } catch (error) {
    console.error('Error creating user:', error);
    if (error.code === 11000) {
      if (error.keyPattern.user_name) {
        res.status(409).json({ message: 'Username already exists' });
      } else if (error.keyPattern.email) {
        res.status(409).json({ message: 'Email already exists' });
      } else {
        res.status(409).json({ message: 'Duplicate entry' });
      }
    } else {
      res.status(500).json({ message: 'Server error during user creation' });
    }
    res.end();
  }
});

app.post('/api/create-post', isAuthenticated, async (req, res) => {
  console.log('Received POST /api/create-post:', req.body);
  const { post_text } = req.body;
  if (!post_text || post_text.length > 100) {
    console.log('Invalid post text');
    res.status(400).json({ message: 'Post text is required and must be 100 characters or less' });
    return res.end();
  }
  try {
    const user_id = req.session.user.ID;
    const date = new Date().toISOString().split('T')[0];
    const view = Math.floor(Math.random() * 1000);
    const newPost = new Post({
      user_id,
      date,
      posted_text: post_text,
      view,
    });
    const result = await newPost.save();
    console.log('Post created for user:', req.session.user.username);
    res.status(201).json({ message: 'Post created successfully', post_id: result._id });
    res.end();
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ message: 'Server error during post creation' });
    res.end();
  }
});

app.post('/api/signout', (req, res) => {
  console.log('Received POST /api/signout');
  req.session.destroy((err) => {
    if (err) {
      console.error('Error signing out:', err);
      res.status(500).json({ message: 'Error signing out' });
      return res.end();
    }
    res.clearCookie('connect.sid');
    console.log('Session destroyed, sending 200 response');
    res.status(200).json({ message: 'Signed out successfully', redirect: '/index.html' });
    res.end();
  });
});

// Static file routes with error handling
const sendFileWithErrorHandling = (res, filePath, route) => {
  console.log(`Attempting to serve: ${filePath} for route: ${route}`);
  if (!existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    res.status(404).json({ message: `File not found: ${filePath}` });
    return res.end();
  }
  res.sendFile(filePath, (err) => {
    if (err) {
      console.error(`Error sending file ${filePath}:`, err.message);
      res.status(500).json({ message: 'Error serving file' });
      res.end();
    }
  });
};

app.get('', (req, res) => {
  sendFileWithErrorHandling(res, join(distPath, 'index.html'), '/');
});

app.get('/', (req, res) => {
  sendFileWithErrorHandling(res, join(distPath, 'index.html'), '/');
});

app.get('/dashboard.html', isAuthenticated, (req, res) => {
  sendFileWithErrorHandling(res, join(distPath, 'dashboard.html'), '/dashboard.html');
});

app.get('/index.html', (req, res) => {
  sendFileWithErrorHandling(res, join(distPath, 'index.html'), '/index.html');
});

// Catch-all route for 404
app.get('*', (req, res) => {
  console.log('Serving 404 for:', req.url);
  sendFileWithErrorHandling(res, join(distPath, '404.html'), req.url);
});

// Catch-all error middleware
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err.message);
  res.status(500).json({ message: 'Internal server error', error: err.message });
  res.end();
});

(async () => {
  await initializeDatabase();
  app.listen(port, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${port}`);
  });
})();