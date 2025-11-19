const express = require('express');
const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');
const router = express.Router();

const API_URL = process.env.API_URL;
let cache = { ts: 0, users: [] };

async function fetchUsersFromApi() {
  // Cache for 60 seconds
  const now = Date.now();
  if (cache.users.length && now - cache.ts < 60_000) return cache.users;
  if (!API_URL) return [];
  try {
    const r = await fetch(API_URL, { timeout: 8000 });
    const data = await r.json();
    const array = Array.isArray(data) ? data : (Array.isArray(data?.items) ? data.items : (Array.isArray(data?.data) ? data.data : []));
    const users = array.map((row) => {
      const username = row.username || row.user || row.name || row.email || row.Username || row.User;
      const password = row.password || row.pass || row.Password || row.Pass;
      const role = row.role || row.Role || row.type || row.Type;
      return { username, password, role };
    }).filter(u => u.username && (u.password!==undefined) && u.role);
    cache = { ts: now, users };
    return users;
  } catch (e) {
    return [];
  }
}

function sign(user) {
  return jwt.sign({ username: user.username, role: user.role }, process.env.JWT_SECRET || 'dev', { expiresIn: '7d' });
}

router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'username and password required' });
  const users = await fetchUsersFromApi();
  const u = users.find(x => String(x.username).trim() === String(username).trim());
  if (!u || String(u.password) !== String(password)) return res.status(401).json({ error: 'Invalid credentials' });
  const token = sign(u);
  res.json({ token, role: u.role, user: { username: u.username, role: u.role } });
});

const { requireAuth } = require('../util');
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: { username: req.user.username, role: req.user.role } });
});

module.exports = { authRouter: router, fetchUsersFromApi };
