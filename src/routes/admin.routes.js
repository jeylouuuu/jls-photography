const express = require('express');
const bcrypt = require('bcryptjs');
const { getDb } = require('../config/db');
const { getAllSettings, updateSettings } = require('../config/settings');
const { requireAuth } = require('../middleware/auth');
const { makeUpload, handleUploadErrors } = require('../middleware/upload');
const { safeDelete } = require('../utils/upload');

const router = express.Router();
router.use(requireAuth);

const galleryUpload = makeUpload({
  fieldName: 'files',
  maxSize: 25 * 1024 * 1024,
  allowVideo: true,
  max: 24
});

const singleImageUpload = makeUpload({
  fieldName: 'image',
  maxSize: 8 * 1024 * 1024,
  allowVideo: false,
  max: 1
});

const extract = (b) => b || {};

router.get('/dashboard', (req, res) => {
  const db = getDb();
  const c = (sql, ...p) => db.prepare(sql).get(...p).c;
  const recentPhotos = db
    .prepare('SELECT id, title, image_url, is_featured, is_published, created_at FROM photos ORDER BY created_at DESC, id DESC LIMIT 6')
    .all();
  const recentReviews = db
    .prepare('SELECT id, client_name, rating, status, created_at FROM testimonials ORDER BY created_at DESC, id DESC LIMIT 6')
    .all();
  const recentMessages = db
    .prepare('SELECT id, name, email, subject, service, is_read, created_at FROM messages ORDER BY created_at DESC, id DESC LIMIT 6')
    .all();
  res.json({
    stats: {
      totalPhotos: c('SELECT COUNT(*) c FROM photos'),
      publishedPhotos: c('SELECT COUNT(*) c FROM photos WHERE is_published = 1'),
      featuredPhotos: c('SELECT COUNT(*) c FROM photos WHERE is_featured = 1'),
      pendingReviews: c("SELECT COUNT(*) c FROM testimonials WHERE status = 'pending'"),
      approvedReviews: c("SELECT COUNT(*) c FROM testimonials WHERE status = 'approved'"),
      rejectedReviews: c("SELECT COUNT(*) c FROM testimonials WHERE status = 'rejected'"),
      totalMessages: c('SELECT COUNT(*) c FROM messages'),
      unreadMessages: c('SELECT COUNT(*) c FROM messages WHERE is_read = 0'),
      totalServices: c('SELECT COUNT(*) c FROM services'),
      totalBookings: c('SELECT COUNT(*) c FROM bookings'),
      totalCustomers: c('SELECT COUNT(*) c FROM customers'),
      bookingsPending: c("SELECT COUNT(*) c FROM bookings WHERE status = 'pending'")
    },
    recent: {
      photos: recentPhotos,
      reviews: recentReviews,
      messages: recentMessages
    }
  });
});

// ---------- Photos ----------
router.get('/photos', (req, res) => {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT p.*, c.name AS category_name, c.slug AS category_slug
       FROM photos p LEFT JOIN categories c ON p.category_id = c.id
       ORDER BY p.created_at DESC, p.id DESC`
    )
    .all();
  res.json(rows);
});

router.post('/photos', galleryUpload.array('files'), (req, res) => {
  const db = getDb();
  const { category_id, title: rawTitle, description: rawDesc, is_featured, is_published } = extract(req.body);
  const files = req.files || [];
  if (!files.length) return res.status(400).json({ error: 'No files were uploaded' });
  const catId = category_id ? parseInt(category_id, 10) || null : null;
  const title = String(rawTitle || '').trim();
  const description = String(rawDesc || '').trim();
  const featured = is_featured ? 1 : 0;
  const published = is_published == null ? 1 : is_published === '0' || is_published === 0 ? 0 : 1;

  let baseTitle = title;
  const insert = db.prepare(
    `INSERT INTO photos (title, description, image_url, category_id, is_featured, is_published, media_type, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`
  );
  const created = [];
  try {
    files.forEach((f, i) => {
      const isVideo = f.mimetype.startsWith('video');
      const t = files.length > 1 ? (baseTitle ? baseTitle + ' ' + (i + 1) : (f.originalname || '').replace(/\.[^.]+$/, '') || 'Untitled') : baseTitle || (f.originalname || '').replace(/\.[^.]+$/, '') || 'Untitled';
      const info = insert.run(t, description, '/uploads/' + f.filename, catId, featured, published, isVideo ? 'video' : 'image');
      created.push({ id: Number(info.lastInsertRowid), title: t, image_url: '/uploads/' + f.filename });
    });
  } catch (e) {
    for (const f of files) safeDelete('/uploads/' + f.filename);
    console.error('Photo insert error:', e.message);
    return res.status(500).json({ error: 'Could not save photos' });
  }
  res.status(201).json({ ok: true, created });
});

router.put('/photos/:id', (req, res) => {
  const db = getDb();
  const b = extract(req.body);
  const id = req.params.id;
  const existing = db.prepare('SELECT * FROM photos WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Photo not found' });
  const title = b.title != null ? String(b.title).trim() : existing.title;
  const description = b.description != null ? String(b.description).trim() : existing.description;
  const category_id = b.category_id !== undefined && b.category_id !== '' ? parseInt(b.category_id, 10) || null : existing.category_id;
  const is_featured = b.is_featured !== undefined ? (b.is_featured === '1' || b.is_featured === 1 ? 1 : 0) : existing.is_featured;
  const is_published = b.is_published !== undefined ? (b.is_published === '1' || b.is_published === 1 ? 1 : 0) : existing.is_published;
  db.prepare(
    'UPDATE photos SET title = ?, description = ?, category_id = ?, is_featured = ?, is_published = ? WHERE id = ?'
  ).run(title, description, category_id, is_featured, is_published, id);
  res.json({ ok: true });
});

router.delete('/photos/:id', (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM photos WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Photo not found' });
  db.prepare('DELETE FROM photos WHERE id = ?').run(req.params.id);
  safeDelete(existing.image_url);
  res.json({ ok: true });
});

// ---------- Categories ----------
router.get('/categories', (req, res) => {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT c.*, (SELECT COUNT(*) FROM photos p WHERE p.category_id = c.id) AS photo_count
       FROM categories c ORDER BY c.id`
    )
    .all();
  res.json(rows);
});

router.post('/categories', (req, res) => {
  const db = getDb();
  const { name } = extract(req.body);
  if (!name || !String(name).trim()) return res.status(400).json({ error: 'Category name is required' });
  const clean = String(name).trim();
  const slug = clean.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'category';
  try {
    const info = db.prepare('INSERT OR IGNORE INTO categories (name, slug) VALUES (?, ?)').run(clean, slug);
    if (!info.changes) return res.status(409).json({ error: 'Category already exists' });
    res.status(201).json({ ok: true, id: Number(info.lastInsertRowid) });
  } catch (e) {
    res.status(400).json({ error: 'Could not create category' });
  }
});

router.delete('/categories/:id', (req, res) => {
  const db = getDb();
  const id = req.params.id;
  db.prepare('UPDATE photos SET category_id = NULL WHERE category_id = ?').run(id);
  db.prepare('DELETE FROM categories WHERE id = ?').run(id);
  res.json({ ok: true });
});

// ---------- Reviews (testimonials) ----------
router.get('/reviews', (req, res) => {
  const db = getDb();
  const { status } = req.query;
  let sql = `SELECT * FROM testimonials`;
  const params = [];
  if (status) {
    sql += ' WHERE status = ?';
    params.push(status);
  }
  sql += ' ORDER BY created_at DESC, id DESC';
  res.json(db.prepare(sql).all(...params));
});

router.post('/reviews', (req, res) => {
  const db = getDb();
  const b = extract(req.body);
  if (!b.client_name || !b.content) return res.status(400).json({ error: 'Name and review content required' });
  const status = ['approved', 'rejected'].includes(b.status) ? b.status : 'pending';
  const info = db
    .prepare(
      `INSERT INTO testimonials (client_name, client_email, role, photo, rating, content, status, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)`
    )
    .run(b.client_name.trim(), b.client_email || '', b.role || '', b.photo || '', Math.min(Math.max(parseInt(b.rating, 10) || 5, 1), 5), b.content.trim(), status);
  res.status(201).json({ ok: true, id: Number(info.lastInsertRowid) });
});

router.put('/reviews/:id/status', (req, res) => {
  const db = getDb();
  const { status } = extract(req.body);
  if (!['approved', 'rejected', 'pending'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
  const existing = db.prepare('SELECT * FROM testimonials WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Review not found' });
  db.prepare(
    `UPDATE testimonials SET status = ?, is_active = ?, updated_at = datetime('now') WHERE id = ?`
  ).run(status, status === 'approved' ? 1 : 0, req.params.id);
  res.json({ ok: true, status });
});

router.put('/reviews/:id', (req, res) => {
  const db = getDb();
  const b = extract(req.body);
  const existing = db.prepare('SELECT * FROM testimonials WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Review not found' });
  db.prepare(
    `UPDATE testimonials SET client_name = ?, client_email = ?, role = ?, rating = ?, content = ?, admin_reply = ?, photo = ?, updated_at = datetime('now') WHERE id = ?`
  ).run(
    b.client_name != null ? b.client_name.trim() : existing.client_name,
    b.client_email !== undefined ? b.client_email : existing.client_email,
    b.role !== undefined ? b.role : existing.role,
    b.rating !== undefined ? Math.min(Math.max(parseInt(b.rating, 10) || 5, 1), 5) : existing.rating,
    b.content != null ? b.content.trim() : existing.content,
    b.admin_reply !== undefined ? b.admin_reply : existing.admin_reply,
    b.photo !== undefined ? b.photo : existing.photo,
    req.params.id
  );
  res.json({ ok: true });
});

router.delete('/reviews/:id', (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM testimonials WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Review not found' });
  db.prepare('DELETE FROM testimonials WHERE id = ?').run(req.params.id);
  if (existing.photo) safeDelete(existing.photo);
  res.json({ ok: true });
});

// ---------- Messages ----------
router.get('/messages', (req, res) => {
  const db = getDb();
  res.json(db.prepare('SELECT * FROM messages ORDER BY created_at DESC, id DESC').all());
});

router.put('/messages/:id/read', (req, res) => {
  const db = getDb();
  const { is_read } = extract(req.body);
  db.prepare('UPDATE messages SET is_read = ? WHERE id = ?').run(is_read ? 1 : 0, req.params.id);
  res.json({ ok: true });
});

router.delete('/messages/:id', (req, res) => {
  getDb().prepare('DELETE FROM messages WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ---------- Services ----------
router.get('/services', (req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM services ORDER BY id').all();
  for (const r of rows) {
    try {
      r.features = JSON.parse(r.features || '[]');
    } catch (e) {
      r.features = [];
    }
  }
  res.json(rows);
});

router.post('/services', (req, res) => {
  const db = getDb();
  const b = extract(req.body);
  if (!b.name) return res.status(400).json({ error: 'Service name is required' });
  const features = Array.isArray(b.features) ? b.features : [];
  const info = db
    .prepare(
      `INSERT INTO services (name, price, duration, description, features, image_url, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      b.name.trim(),
      parseFloat(b.price) || 0,
      b.duration || '',
      b.description || '',
      JSON.stringify(features),
      b.image_url || '',
      b.is_active == null ? 1 : b.is_active ? 1 : 0
    );
  res.status(201).json({ ok: true, id: Number(info.lastInsertRowid) });
});

router.put('/services/:id', (req, res) => {
  const db = getDb();
  const b = extract(req.body);
  const existing = db.prepare('SELECT * FROM services WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Service not found' });
  const features = Array.isArray(b.features) ? b.features : JSON.parse(existing.features || '[]');
  db.prepare(
    `UPDATE services SET name = ?, price = ?, duration = ?, description = ?, features = ?, image_url = ?, is_active = ? WHERE id = ?`
  ).run(
    b.name != null ? b.name.trim() : existing.name,
    b.price !== undefined ? parseFloat(b.price) || 0 : existing.price,
    b.duration !== undefined ? b.duration : existing.duration,
    b.description !== undefined ? b.description : existing.description,
    JSON.stringify(features),
    b.image_url !== undefined ? b.image_url : existing.image_url,
    b.is_active === undefined ? existing.is_active : b.is_active ? 1 : 0,
    req.params.id
  );
  res.json({ ok: true });
});

router.delete('/services/:id', (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM services WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Service not found' });
  db.prepare('DELETE FROM services WHERE id = ?').run(req.params.id);
  if (existing.image_url && /^\/uploads\//.test(existing.image_url)) safeDelete(existing.image_url);
  res.json({ ok: true });
});

// ---------- About ----------
router.get('/about', (req, res) => {
  const db = getDb();
  const keys = [
    'photographer_name', 'brand_name', 'tagline', 'about_image', 'bio_short', 'bio_full',
    'experience_years', 'projects_count', 'clients_count', 'about_specialties', 'about_skills', 'about_equipment', 'location_label'
  ];
  const all = getAllSettings();
  const out = {};
  for (const k of keys) if (k in all) out[k] = all[k];
  for (const k of ['about_specialties', 'about_skills', 'about_equipment']) {
    try {
      out[k] = JSON.parse(out[k] || '[]');
    } catch (e) {
      out[k] = [];
    }
  }
  res.json(out);
});

router.put('/about', (req, res) => {
  const b = extract(req.body);
  const allowed = ['photographer_name', 'brand_name', 'tagline', 'about_image', 'bio_short', 'bio_full', 'experience_years', 'projects_count', 'clients_count', 'about_specialties', 'about_skills', 'about_equipment', 'location_label'];
  const entries = {};
  for (const k of allowed) {
    if (b[k] !== undefined) entries[k] = typeof b[k] === 'object' ? JSON.stringify(b[k]) : b[k];
  }
  if (Object.keys(entries).length) updateSettings(entries);
  res.json({ ok: true });
});

// ---------- Settings ----------
router.get('/settings', (req, res) => {
  res.json(getAllSettings());
});

router.put('/settings', (req, res) => {
  const b = extract(req.body);
  const entries = {};
  for (const [k, v] of Object.entries(b)) {
    if (k.startsWith('_')) continue;
    entries[k] = typeof v === 'object' ? JSON.stringify(v) : v;
  }
  updateSettings(entries);
  res.json({ ok: true });
});

// ---------- Admins ----------
router.get('/admins', (req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT id, username, email, full_name, created_at FROM admins').all();
  res.json(rows);
});

router.put('/admins/:id', (req, res) => {
  const db = getDb();
  const b = extract(req.body);
  const existing = db.prepare('SELECT * FROM admins WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Admin not found' });
  const email = b.email !== undefined ? b.email.trim() : existing.email;
  const full_name = b.full_name !== undefined ? b.full_name.trim() : existing.full_name;
  if (!email) return res.status(400).json({ error: 'Email is required' });
  try {
    db.prepare('UPDATE admins SET email = ?, full_name = ? WHERE id = ?').run(email, full_name, req.params.id);
  } catch (e) {
    return res.status(409).json({ error: 'Email already in use' });
  }
  res.json({ ok: true });
});

router.post('/admins/:id/password', (req, res) => {
  const db = getDb();
  const { password } = extract(req.body);
  if (!password || String(password).length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }
  db.prepare('UPDATE admins SET password_hash = ? WHERE id = ?').run(bcrypt.hashSync(String(password), 12), req.params.id);
  res.json({ ok: true });
});

// ---------- Single image upload ----------
router.post('/upload', singleImageUpload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
  res.status(201).json({ url: '/uploads/' + req.file.filename });
});

router.use('/photos', (err, req, res, next) => {
  if (req.path && req.method === 'POST') return handleUploadErrors(err, req, res, next);
  next(err);
});

router.use('/upload', (err, req, res, next) => handleUploadErrors(err, req, res, next));

module.exports = router;