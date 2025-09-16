const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'change_me';
const SALT_ROUNDS = parseInt(process.env.SALT_ROUNDS || '10', 10);

// POST /api/register
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Bitte username, email und password angeben' });
  }

  const pool = req.app.locals.pgPool;
  try {
    const exists = await pool.query('SELECT id FROM users WHERE username = $1 OR email = $2 LIMIT 1', [username, email]);
    if (exists.rowCount > 0) {
      return res.status(409).json({ error: 'Benutzername oder E-Mail bereits vergeben' });
    }

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
    const insert = await pool.query(
      'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email, created_at',
      [username, email, password_hash]
    );

    const user = insert.rows[0];
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });

    res.json({ user: { id: user.id, username: user.username, email: user.email }, token });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Serverfehler bei Registrierung' });
  }
});

// POST /api/login
router.post('/login', async (req, res) => {
  const { usernameOrEmail, password } = req.body;
  if (!usernameOrEmail || !password) {
    return res.status(400).json({ error: 'Bitte username/email und password angeben' });
  }

  const pool = req.app.locals.pgPool;
  try {
    const q = await pool.query('SELECT id, username, email, password_hash FROM users WHERE username = $1 OR email = $1 LIMIT 1', [usernameOrEmail]);
    if (q.rowCount === 0) {
      return res.status(401).json({ error: 'Ungültige Anmeldedaten' });
    }
    const user = q.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Ungültige Anmeldedaten' });
    }

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ user: { id: user.id, username: user.username, email: user.email }, token });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Serverfehler bei Login' });
  }
});

module.exports = router;
