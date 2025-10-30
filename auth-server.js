import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool, query } from './src/integrations/neon/client.js';
import { CloudinaryService } from './src/integrations/cloudinary/service.js';
import cors from 'cors';
import multer from 'multer';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Auth endpoints
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, fullName } = req.body;

    if (!email || !password || !fullName) {
      return res.status(400).json({ error: 'Email, password, and full name are required' });
    }

    // Check if user already exists
    const existingUser = await query(
      'SELECT id FROM auth_users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const result = await query(
      `INSERT INTO auth_users (email, password_hash, full_name, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       RETURNING id, email, full_name`,
      [email, hashedPassword, fullName]
    );

    const user = result.rows[0];

    // Create profile
    await query(
      `INSERT INTO profiles (id, full_name, created_at, updated_at)
       VALUES ($1, $2, NOW(), NOW())`,
      [user.id, fullName]
    );

    // Assign default role
    await query(
      `INSERT INTO user_roles (user_id, role, created_at)
       VALUES ($1, 'reader', NOW())`,
      [user.id]
    );

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name
      },
      token
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/signin', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const result = await query(
      'SELECT id, email, password_hash, full_name FROM auth_users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name
      },
      token
    });
  } catch (error) {
    console.error('Signin error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/verify', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(401).json({ error: 'Token required' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    // Get user details
    const result = await query(
      `SELECT u.id, u.email, u.full_name, ur.role
       FROM auth_users u
       LEFT JOIN user_roles ur ON u.id = ur.user_id
       WHERE u.id = $1`,
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    res.json({
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role || 'reader'
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
});

// File upload endpoints
app.post('/api/upload/cover', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const timestamp = Date.now();
    const publicId = `${timestamp}-${req.file.originalname.split('.')[0]}`;
    const result = await CloudinaryService.uploadFile(req.file, 'book-covers', publicId);

    res.json({
      url: result.secure_url,
      publicId: result.public_id,
    });
  } catch (error) {
    console.error('Error uploading cover image:', error);
    res.status(500).json({ error: 'Failed to upload cover image' });
  }
});

app.post('/api/upload/pdf', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const timestamp = Date.now();
    const publicId = `${timestamp}-${req.file.originalname.split('.')[0]}`;
    const result = await CloudinaryService.uploadFile(req.file, 'books', publicId);

    res.json({
      url: result.secure_url,
      publicId: result.public_id,
    });
  } catch (error) {
    console.error('Error uploading PDF:', error);
    res.status(500).json({ error: 'Failed to upload PDF' });
  }
});

// Book management endpoints
app.get('/api/books', async (req, res) => {
  try {
    const result = await query('SELECT * FROM books ORDER BY created_at DESC');
    const books = result.rows.map(book => ({
      ...book,
      price: parseFloat(book.price)
    }));
    res.json(books);
  } catch (error) {
    console.error('Error fetching books:', error);
    res.status(500).json({ error: 'Failed to fetch books' });
  }
});

app.post('/api/books', async (req, res) => {
  try {
    const { title, author, description, price, category, coverImageUrl, pdfUrl } = req.body;

    if (!title || !author || !pdfUrl) {
      return res.status(400).json({ error: 'Title, author, and PDF URL are required' });
    }

    const result = await query(
      `INSERT INTO books (title, author, description, price, category, cover_image_url, pdf_url, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
       RETURNING *`,
      [title, author, description, price, category, coverImageUrl, pdfUrl]
    );

    const book = result.rows[0];
    res.status(201).json({
      ...book,
      price: parseFloat(book.price)
    });
  } catch (error) {
    console.error('Error creating book:', error);
    res.status(500).json({ error: 'Failed to create book' });
  }
});

app.put('/api/books/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, author, description, price, category, coverImageUrl, pdfUrl } = req.body;

    const result = await query(
      `UPDATE books
       SET title = $1, author = $2, description = $3, price = $4, category = $5,
           cover_image_url = $6, pdf_url = $7, updated_at = NOW()
       WHERE id = $8
       RETURNING *`,
      [title, author, description, price, category, coverImageUrl, pdfUrl, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }

    const book = result.rows[0];
    res.json({
      ...book,
      price: parseFloat(book.price)
    });
  } catch (error) {
    console.error('Error updating book:', error);
    res.status(500).json({ error: 'Failed to update book' });
  }
});

app.delete('/api/books/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // First get the book to potentially delete associated files
    const bookResult = await query('SELECT * FROM books WHERE id = $1', [id]);
    if (bookResult.rows.length === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }

    // Delete the book
    await query('DELETE FROM books WHERE id = $1', [id]);

    // Optionally delete associated files from Cloudinary
    const book = bookResult.rows[0];
    console.log('Deleting book:', book.id, 'Cover URL:', book.cover_image_url, 'PDF URL:', book.pdf_url);

    const deleteResults = { cover: null, pdf: null };

    if (book.cover_image_url) {
      try {
        const publicId = CloudinaryService.extractPublicId(book.cover_image_url);
        console.log('Extracted cover publicId:', publicId, 'from URL:', book.cover_image_url);
        if (publicId) {
          const deleteResult = await CloudinaryService.deleteFile(publicId);
          console.log('Cover delete result:', deleteResult);
          deleteResults.cover = deleteResult;
        } else {
          console.log('Could not extract publicId from cover URL');
        }
      } catch (error) {
        console.warn('Failed to delete cover image from Cloudinary:', error);
        deleteResults.cover = { error: error.message };
      }
    }

    if (book.pdf_url) {
      try {
        const publicId = CloudinaryService.extractPublicId(book.pdf_url);
        console.log('Extracted PDF publicId:', publicId, 'from URL:', book.pdf_url);
        if (publicId) {
          const deleteResult = await CloudinaryService.deleteFile(publicId);
          console.log('PDF delete result:', deleteResult);
          deleteResults.pdf = deleteResult;
        } else {
          console.log('Could not extract publicId from PDF URL');
        }
      } catch (error) {
        console.warn('Failed to delete PDF from Cloudinary:', error);
        deleteResults.pdf = { error: error.message };
      }
    }

    res.json({
      message: 'Book deleted successfully',
      cloudinaryCleanup: deleteResults
    });
  } catch (error) {
    console.error('Error deleting book:', error);
    res.status(500).json({ error: 'Failed to delete book' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Test endpoint for Cloudinary public ID extraction
app.get('/api/test-extract-public-id', (req, res) => {
  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ error: 'URL parameter required' });
  }

  const publicId = CloudinaryService.extractPublicId(url);
  res.json({ url, extractedPublicId: publicId });
});

// Endpoint to fix existing PDF URLs
app.post('/api/fix-pdf-urls', async (req, res) => {
  try {
    const result = await query('SELECT id, pdf_url FROM books WHERE pdf_url IS NOT NULL');
    console.log('Found books with PDFs:', result.rows.length);
    result.rows.forEach(book => console.log(`Book ${book.id}: ${book.pdf_url}`));

    const updates = [];

    for (const book of result.rows) {
      if (book.pdf_url && book.pdf_url.includes('/image/upload/')) {
        const fixedUrl = book.pdf_url.replace('/image/upload/', '/raw/upload/');
        updates.push({ id: book.id, oldUrl: book.pdf_url, newUrl: fixedUrl });
      }
    }

    if (updates.length === 0) {
      return res.json({ message: 'No PDF URLs need fixing', booksChecked: result.rows.length });
    }

    // Update the URLs in database
    for (const update of updates) {
      await query('UPDATE books SET pdf_url = $1 WHERE id = $2', [update.newUrl, update.id]);
    }

    res.json({
      message: `Fixed ${updates.length} PDF URLs`,
      updates
    });
  } catch (error) {
    console.error('Error fixing PDF URLs:', error);
    res.status(500).json({ error: 'Failed to fix PDF URLs' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Auth API server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});