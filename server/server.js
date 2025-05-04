/* eslint-disable no-undef */
import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const app = express();
const port = process.env.PORT || 3000;

if (!process.env.SESSION_SECRET) throw new Error('SESSION_SECRET not set in .env');
if (!process.env.MONGO_URI) throw new Error('MONGO_URI not set in .env');

const __dirname = dirname(fileURLToPath(import.meta.url));

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
  if (req.session.user) {
    next();
  } else {
    res.status(401).json({ message: 'Not authenticated', authenticated: false });
  }
};

// Start the server with DB connection
(async () => {
  await initializeDatabase();

  app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
  }));

  app.use(express.json());
  app.use(cookieParser());
  app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
      collectionName: 'sessions',
    }),
    cookie: {
      secure: false,
      httpOnly: true,
      maxAge: 60 * 60,
    },
  }));

  // Session check endpoint
  app.get('/api/check-session', isAuthenticated, (req, res) => {
    res.status(200).json({
      message: 'Session is valid',
      authenticated: true,
      username: req.session.user.username,
      ID: req.session.user.ID,
    });
  });

  // Test DB connection endpoint
  app.get('/api/test-db', async (req, res) => {
    try {
      await mongoose.connection.db.admin().ping();
      res.status(200).json({ message: 'MongoDB connection is working' });
    } catch (error) {
      res.status(500).json({ message: 'MongoDB connection failed', error: error.message });
    }
  });

  // Login Endpoint
  app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }
    try {
      const user = await User.findOne({ user_name: username });
      if (user && await bcrypt.compare(password, user.password)) {
        req.session.user = { username: user.user_name, ID: user._id.toString() };
        res.status(200).json({ message: 'Login successful', redirect: '/dashboard.html' });
      } else {
        res.status(401).json({ message: 'Invalid username or password' });
      }
    } catch (error) {
      console.error('Database error:', error);
      res.status(500).json({ message: 'Server error during login' });
    }
  });

  // Create Account Endpoint
  app.post('/api/create', async (req, res) => {
    const { username, firstName, lastName, email, password } = req.body;
    if (!username || !firstName || !lastName || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
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
      res.status(201).json({ message: 'User created successfully' });
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
    }
  });

  // Create Post Endpoint
  app.post('/api/create-post', isAuthenticated, async (req, res) => {
    const { post_text } = req.body;
    if (!post_text || post_text.length > 100) {
      return res.status(400).json({ message: 'Post text is required and must be 100 characters or less' });
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
      res.status(201).json({ message: 'Post created successfully', post_id: result._id });
    } catch (error) {
      console.error('Error creating post:', error);
      res.status(500).json({ message: 'Server error during post creation' });
    }
  });

  // Signout Endpoint
  app.post('/api/signout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: 'Error signing out' });
      }
      res.clearCookie('connect.sid');
      res.status(200).json({ message: 'Signed out successfully', redirect: '/index.html' });
    });
  });



  app.use(express.static(join(__dirname, 'dist')));



  // Serve dashboard.html on port 3000 with protection
  app.get('', (req, res) => {
    res.sendFile(join(__dirname, 'dist', 'index'));
  });
  app.get('/',  (req, res) => {
    res.sendFile(join(__dirname, 'dist', 'index'));
  });

  app.get('/dashboard.html', isAuthenticated, (req, res) => {
    res.sendFile(join(__dirname, 'dist', 'dashboard.html'));
  });

  // Serve index.html on port 3000
  app.get('/index.html', (req, res) => {
    res.sendFile(join(__dirname, 'dist', 'index.html'));
  });

  app.get('*', (req, res) => {
    res.status(404).sendFile(join(__dirname, 'dist', '404.html'));
  });

  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
})();