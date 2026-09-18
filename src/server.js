const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');

require('dotenv').config();

const { initDb } = require('./config/initDb');
const { ROOT } = require('./config/paths');

initDb();

const app = express();

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

const PUBLIC_DIR = path.join(ROOT, 'public');
const CLIENT_DIR = path.join(PUBLIC_DIR, 'client');
const ASSETS_DIR = path.join(PUBLIC_DIR, 'assets');
const ADMIN_DIR = path.join(PUBLIC_DIR, 'admin');
const { getUploadsDir } = require('./config/paths');

app.use('/uploads', express.static(getUploadsDir(), { maxAge: '7d', fallthrough: true }));
app.use('/assets', express.static(ASSETS_DIR, { maxAge: '1h' }));
app.use('/admin', express.static(ADMIN_DIR, { maxAge: '1h' }));

app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/admin', require('./routes/admin.routes'));
app.use('/api', require('./routes/public.routes'));

const PAGE_ROUTES = {
  '/': 'index.html',
  '/index.html': 'index.html',
  '/home': 'index.html',
  '/about': 'about.html',
  '/about.html': 'about.html',
  '/portfolio': 'portfolio.html',
  '/portfolio.html': 'portfolio.html',
  '/services': 'services.html',
  '/services.html': 'services.html',
  '/contact': 'contact.html',
  '/contact.html': 'contact.html',
  '/gallery': 'portfolio.html'
};

app.get('*', (req, res, next) => {
  let urlPath = req.path;
  if (urlPath !== '/' && urlPath.endsWith('/')) urlPath = urlPath.slice(0, -1);

  // Admin pages
  if (urlPath.startsWith('/admin')) {
    const rel = urlPath === '/admin' ? 'index.html' : urlPath.slice('/admin/'.length);
    const file = path.join(ADMIN_DIR, rel.includes('.html') ? rel : rel + '.html');
    if (fs.existsSync(file)) return res.sendFile(file);
    return res.redirect('/admin/login');
  }

  const page = PAGE_ROUTES[urlPath];
  if (page) {
    return res.sendFile(path.join(CLIENT_DIR, page));
  }

  if (urlPath === '/health') {
    return res.json({ status: 'ok', time: new Date().toISOString() });
  }

  next();
});

app.use((req, res) => {
  res.status(404).sendFile(path.join(CLIENT_DIR, '404.html'));
});

app.use((err, req, res, next) => {
  console.error('Server error:', err.message);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = parseInt(process.env.PORT || '3000', 10);

app.listen(PORT, () => {
  console.log(`JLS Photography running at http://localhost:${PORT}`);
  console.log(`Admin dashboard:    http://localhost:${PORT}/admin`);
  console.log(`Admin login:        http://localhost:${PORT}/admin/login`);
});

module.exports = app;