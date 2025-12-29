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
    let ip = req.params.ip;

    if (!ip) {
      ip = req.headers['x-forwarded-for']?.split(',')[0] ||
        req.socket.remoteAddress ||
        req.ip;

      if (ip === '::1' || ip === '::ffff:127.0.0.1' || ip.startsWith('::ffff:')) {
        ip = ip.replace('::ffff:', '');
      }

      if (ip === '127.0.0.1' || ip === 'localhost' || ip === '::1') {
        ip = ''; // ip-api.com will use its own IP detection
      }
    }

    console.log('Fetching geo data for IP:', ip || 'auto-detect');

    // Using IP-API.com
    const apiUrl = ip
      ? `http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,query`
      : `http://ip-api.com/json?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,query`;

    const response = await fetch(apiUrl);
    const data = await response.json();

    if (data.status === 'fail') {
      return res.status(400).json({ error: data.message || 'Invalid IP address' });
    }

    // Save to search history only if it's a specific IP search (not auto-detect)
    if (req.params.ip && req.params.ip.trim() !== '') {
      try {
        await pool.execute(
          'INSERT INTO search_history (user_id, ip_address, country, city, isp) VALUES (?, ?, ?, ?, ?)',
          [req.user.userId, data.query, data.country || 'Unknown', data.city || 'Unknown', data.isp || 'Unknown']
        );
      } catch (dbError) {
        console.error('Failed to save search history:', dbError);
      }
    }

    res.json(data);

  } catch (error) {
    console.error('Geolocation error:', error);
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
    console.error('History fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// Delete history items
app.delete('/api/history', authenticate, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Invalid request' });
    }

    const placeholders = ids.map(() => '?').join(',');
    await pool.execute(
      `DELETE FROM search_history WHERE id IN (${placeholders}) AND user_id = ?`,
      [...ids, req.user.userId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('History delete error:', error);
    res.status(500).json({ error: 'Failed to delete history' });
  }
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});