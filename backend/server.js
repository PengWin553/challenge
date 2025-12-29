import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Login endpoint
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const [users] = await pool.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];
    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: { id: user.id, email: user.email }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Middleware to verify JWT
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Protected route example
app.get('/api/user-info', authenticate, (req, res) => {
  res.json({ user: req.user });
});

// Proxy endpoint for IP geolocation (to avoid CORS issues)
app.get('/api/geo/:ip?', authenticate, async (req, res) => {
  try {
    const ip = req.params.ip || req.ip.split(':').pop();

    // Using IP-API.com
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,query`);
    const data = await response.json();

    if (data.status === 'fail') {
      return res.status(400).json({ error: 'Invalid IP address' });
    }

    // Save to search history if it's a specific IP search
    if (req.params.ip) {
      await pool.execute(
        'INSERT INTO search_history (user_id, ip_address, country, city, isp) VALUES (?, ?, ?, ?, ?)',
        [req.user.userId, ip, data.country, data.city, data.isp]
      );
    }

    res.json(data);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch geolocation' });
  }
});

// Get search history
app.get('/api/history', authenticate, async (req, res) => {
  try {
    const [history] = await pool.execute(
      'SELECT * FROM search_history WHERE user_id = ? ORDER BY searched_at DESC',
      [req.user.userId]
    );
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// Delete history items
app.delete('/api/history', authenticate, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({ error: 'Invalid request' });
    }

    await pool.execute(
      'DELETE FROM search_history WHERE id IN (?) AND user_id = ?',
      [ids, req.user.userId]
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete history' });
  }
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});