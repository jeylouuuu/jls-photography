const express = require('express');
const { getDb } = require('../config/db');
const { getAllSettings } = require('../config/settings');
const { makeUpload } = require('../middleware/upload');
const { safeDelete } = require('../utils/upload');
const { sendMail } = require('../utils/mailer');

const esc = (s) =>
  String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function notifyTarget() {
  const cfg = getAllSettings();
  const to = String(cfg.notify_email || cfg.email || cfg.smtp_user || '').trim();
  return to || null;
}

function baseUrl() {
  const cfg = getAllSettings();
  return String(cfg.site_url || process.env.SITE_URL || '').replace(/\/+$/, '');
}

function adminUrl(path) {
  const base = baseUrl();
  return base ? base + '/admin/' + path : '/admin/' + path;
}

function sendNotification(subject, html) {
  const to = notifyTarget();
  if (!to) return Promise.resolve({ skipped: true, reason: 'No recipient configured' });
  return sendMail(to, subject, html).then((r) => {
    if (!r.ok && !r.skipped) console.error('Notification email failed:', r.error);
    return r;
  });
}

function notifyNewMessage(data) {
  if (!notifyTarget()) return;
  sendNotification(
    'New message from ' + data.name + ' — JLS Photography',
    `<div style="font-family:Arial,sans-serif;max-width:560px">
      <h2 style="color:#c9a961;margin:0 0 16px">New contact message</h2>
      <p>Someone sent a message through your website contact form.</p>
      <table cellpadding="8" style="border-collapse:collapse;width:100%;font-size:14px">
        <tr><td style="border-bottom:1px solid #eee"><b>Name</b></td><td>${esc(data.name)}</td></tr>
        <tr><td style="border-bottom:1px solid #eee"><b>Email</b></td><td>${esc(data.email)}</td></tr>
        ${data.phone ? `<tr><td style="border-bottom:1px solid #eee"><b>Phone</b></td><td>${esc(data.phone)}</td></tr>` : ''}
        ${data.service ? `<tr><td style="border-bottom:1px solid #eee"><b>Service</b></td><td>${esc(data.service)}</td></tr>` : ''}
        ${data.preferred_date ? `<tr><td style="border-bottom:1px solid #eee"><b>Preferred date</b></td><td>${esc(data.preferred_date)}</td></tr>` : ''}
        <tr><td style="border-bottom:1px solid #eee"><b>Message</b></td><td>${esc(data.message)}</td></tr>
      </table>
      <p style="margin-top:20px"><a href="${adminUrl('messages')}" style="background:#c9a961;color:#14140f;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:bold">Manage in admin panel</a></p>
    </div>`
  ).catch((e) => console.error('Contact notify error:', e.message));
}

function notifyNewReview(data) {
  if (!notifyTarget()) return;
  sendNotification(
    'New review from ' + data.client_name + ' — JLS Photography',
    `<div style="font-family:Arial,sans-serif;max-width:560px">
      <h2 style="color:#c9a961;margin:0 0 16px">New review awaiting approval</h2>
      <p><b>${esc(data.client_name)}</b> (${esc(data.role || 'client')}) left a ${data.rating}-star review.</p>
      <p style="font-style:italic;color:#555">"${esc(data.content)}"</p>
      <p style="margin-top:20px"><a href="${adminUrl('reviews')}" style="background:#c9a961;color:#14140f;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:bold">Review in admin panel</a></p>
    </div>`
  ).catch((e) => console.error('Review notify error:', e.message));
}

const router = express.Router();

const reviewUpload = makeUpload({
  fieldName: 'photo',
  maxSize: 5 * 1024 * 1024,
  allowVideo: false,
  max: 1
});

router.get('/settings', (req, res) => {
  res.json(getAllSettings());
});

router.get('/categories', (req, res) => {
  const db = getDb();
  res.json(db.prepare('SELECT id, name, slug FROM categories ORDER BY id').all());
});

router.get('/photos', (req, res) => {
  const db = getDb();
  const { category, featured } = req.query;
  let sql = `SELECT p.*, c.name AS category_name, c.slug AS category_slug
             FROM photos p LEFT JOIN categories c ON p.category_id = c.id
             WHERE p.is_published = 1`;
  const params = [];
  if (category) {
    sql += ' AND c.slug = ?';
    params.push(category);
  }
  if (featured === '1') {
    sql += ' AND p.is_featured = 1';
  }
  sql += ' AND p.media_type = \'image\' ORDER BY p.created_at DESC, p.id DESC';
  res.json(db.prepare(sql).all(...params));
});

router.get('/photos/featured', (req, res) => {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT p.*, c.name AS category_name, c.slug AS category_slug
       FROM photos p LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.is_published = 1 AND p.is_featured = 1 AND p.media_type = 'image'
       ORDER BY p.created_at DESC, p.id DESC`
    )
    .all();
  res.json(rows);
});

router.get('/photos/recent', (req, res) => {
  const db = getDb();
  const limit = Math.min(parseInt(req.query.limit || '6', 10) || 6, 20);
  const rows = db
    .prepare(
      `SELECT p.*, c.name AS category_name, c.slug AS category_slug
       FROM photos p LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.is_published = 1 AND p.media_type = 'image'
       ORDER BY p.created_at DESC, p.id DESC LIMIT ?`
    )
    .all(limit);
  res.json(rows);
});

router.get('/photos/:id', (req, res) => {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT p.*, c.name AS category_name, c.slug AS category_slug
       FROM photos p LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.id = ? AND p.is_published = 1`
    )
    .get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Photo not found' });
  res.json(row);
});

router.get('/services', (req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM services WHERE is_active = 1 ORDER BY id').all();
  for (const r of rows) {
    try {
      r.features = JSON.parse(r.features || '[]');
    } catch (e) {
      r.features = [];
    }
  }
  res.json(rows);
});

router.get('/testimonials', (req, res) => {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, client_name, role, photo, rating, content, client_email, admin_reply, created_at
       FROM testimonials WHERE status = 'approved' AND is_active = 1
       ORDER BY created_at DESC`
    )
    .all();
  res.json(rows);
});

router.post('/testimonials', reviewUpload.single('photo'), (req, res) => {
  const db = getDb();
  const { client_name, rating, content, client_email, role } = req.body || {};
  if (!client_name || !content) {
    return res.status(400).json({ error: 'Name and review message are required' });
  }
  const stars = Math.min(Math.max(parseInt(rating, 10) || 5, 1), 5);
  const photo = req.file ? '/uploads/' + req.file.filename : '';
  try {
    const info = db
      .prepare(
        `INSERT INTO testimonials (client_name, client_email, role, photo, rating, content, status, is_active)
         VALUES (?, ?, ?, ?, ?, ?, 'pending', 1)`
      )
      .run(String(client_name).trim().slice(0, 120), String(client_email || '').trim(), String(role || '').trim(), photo, stars, String(content).trim().slice(0, 2000));
    notifyNewReview({
      client_name: String(client_name).trim(),
      role: String(role || '').trim(),
      rating: stars,
      content: String(content).trim()
    });
    res.status(201).json({ ok: true, id: Number(info.lastInsertRowid), status: 'pending' });
  } catch (e) {
    if (photo) safeDelete(photo);
    console.error('Review save error:', e.message);
    res.status(500).json({ error: 'Could not save review. Please try again.' });
  }
});

router.post('/contact', (req, res) => {
  const db = getDb();
  const { name, email, phone, subject, message, service, preferred_date } = req.body || {};
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email and message are required' });
  }
  try {
    db.prepare(
      `INSERT INTO messages (name, email, phone, subject, message, service, preferred_date, is_read)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0)`
    ).run(
      String(name).trim().slice(0, 120),
      String(email).trim(),
      String(phone || '').trim(),
      String(subject || '').trim().slice(0, 200),
      String(message).trim(),
      String(service || '').trim().slice(0, 120),
      String(preferred_date || '').trim()
    );
    notifyNewMessage({
      name: String(name).trim(),
      email: String(email).trim(),
      phone: String(phone || '').trim(),
      service: String(service || '').trim(),
      preferred_date: String(preferred_date || '').trim(),
      message: String(message).trim()
    });
    res.status(201).json({ ok: true, message: 'Message sent successfully' });
  } catch (e) {
    console.error('Contact save error:', e.message);
    res.status(500).json({ error: 'Could not save your message. Please try again.' });
  }
});

router.post('/booking', (req, res) => {
  const db = getDb();
  const { name, email, phone, service_id, event_date, event_time, location, message } = req.body || {};
  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }
  db.exec('BEGIN');
  try {
    const cust = db
      .prepare('INSERT INTO customers (name, email, phone) VALUES (?, ?, ?)')
      .run(String(name), String(email), String(phone || ''));
    const customerId = Number(cust.lastInsertRowid);
    db.prepare(
      `INSERT INTO bookings (customer_id, service_id, customer_name, customer_email, customer_phone, event_date, event_time, location, message, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', datetime('now'))`
    ).run(
      customerId,
      service_id ? parseInt(service_id, 10) || null : null,
      String(name),
      String(email),
      String(phone || ''),
      String(event_date || ''),
      String(event_time || ''),
      String(location || ''),
      String(message || '')
    );
    db.exec('COMMIT');
    res.status(201).json({ ok: true, message: 'Booking request received' });
  } catch (e) {
    db.exec('ROLLBACK');
    console.error('Booking error:', e.message);
    res.status(500).json({ error: 'Could not save booking. Please try again.' });
  }
});

router.get('/stats', (req, res) => {
  const db = getDb();
  const c = (sql) => db.prepare(sql).get().c;
  res.json({
    photos: c('SELECT COUNT(*) c FROM photos WHERE is_published = 1'),
    portfolio: c('SELECT COUNT(*) c FROM photos WHERE is_published = 1'),
    projects: c('SELECT COUNT(*) c FROM photos'),
    clients: c('SELECT COUNT(*) c FROM customers'),
    reviews: c("SELECT COUNT(*) c FROM testimonials WHERE status = 'approved'"),
    experience_years: '10+'
  });
});

module.exports = router;