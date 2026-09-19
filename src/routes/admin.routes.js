const express = require('express');
const bcrypt = require('bcryptjs');
const { getDb } = require('../config/db');
const { getAllSettings, updateSettings } = require('../config/settings');
const { requireAuth } = require('../middleware/auth');
const { makeUpload, handleUploadErrors } = require('../middleware/upload');
const { safeDelete } = require('../utils/upload');
const { sendMail } = require('../utils/mailer');
const nodemailer = require('nodemailer');

const router = express.Router();
router.use(requireAuth);

const galleryUpload = makeUpload({
  fieldName: 'files',
  maxSize: 10 * 1024 * 1024,
  allowVideo: false,
  max: 24
});

const videoFileUpload = makeUpload({
  fieldName: 'file',
  maxSize: 250 * 1024 * 1024,
  allowVideo: true,
  max: 1
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
  const recentBookings = db
    .prepare(
      `SELECT b.id, b.customer_name, b.customer_email, b.customer_phone, b.event_date, b.event_time,
              b.location, b.message, b.status, b.created_at, s.name AS service_name
       FROM bookings b LEFT JOIN services s ON s.id = b.service_id
       ORDER BY b.created_at DESC, b.id DESC LIMIT 8`
    )
    .all();
  res.json({
    stats: {
      totalPhotos: c('SELECT COUNT(*) c FROM photos'),
      publishedPhotos: c('SELECT COUNT(*) c FROM photos WHERE is_published = 1'),
      featuredPhotos: c('SELECT COUNT(*) c FROM photos WHERE is_featured = 1'),
      totalVideos: c('SELECT COUNT(*) c FROM videos'),
      publishedVideos: c('SELECT COUNT(*) c FROM videos WHERE is_published = 1'),
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
      messages: recentMessages,
      bookings: recentBookings
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
  const featured = is_featured === '1' || is_featured === 1 || is_featured === true ? 1 : 0;
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
  let image_url = existing.image_url;
  if (b.image_url !== undefined && b.image_url !== null && String(b.image_url).trim()) {
    image_url = String(b.image_url).trim();
    if (existing.image_url && existing.image_url !== image_url) safeDelete(existing.image_url);
  }
  db.prepare(
    'UPDATE photos SET title = ?, description = ?, category_id = ?, is_featured = ?, is_published = ?, image_url = ? WHERE id = ?'
  ).run(title, description, category_id, is_featured, is_published, image_url, id);
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

router.delete('/photos', (req, res) => {
  const db = getDb();
  const rawIds = Array.isArray(req.body && req.body.ids) ? req.body.ids : [];
  const ids = Array.from(new Set(rawIds.map((id) => parseInt(id, 10)).filter((id) => Number.isInteger(id) && id > 0)));
  if (!ids.length) return res.status(400).json({ error: 'Select at least one photo' });
  if (ids.length > 100) return res.status(400).json({ error: 'You can delete up to 100 photos at once' });

  const placeholders = ids.map(() => '?').join(', ');
  const existing = db.prepare(`SELECT id, image_url FROM photos WHERE id IN (${placeholders})`).all(...ids);
  const deletePhotos = db.prepare(`DELETE FROM photos WHERE id IN (${placeholders})`);
  db.exec('BEGIN');
  try {
    deletePhotos.run(...ids);
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
  const deletedUrls = new Set();
  existing.forEach((photo) => {
    if (photo.image_url && !deletedUrls.has(photo.image_url)) {
      deletedUrls.add(photo.image_url);
      safeDelete(photo.image_url);
    }
  });
  res.json({ ok: true, deleted: existing.length });
});

// ---------- Videos ----------
router.get('/videos', (req, res) => {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT v.*, c.name AS category_name, c.slug AS category_slug
       FROM videos v LEFT JOIN categories c ON v.category_id = c.id
       ORDER BY v.created_at DESC, v.id DESC`
    )
    .all();
  res.json(rows);
});

router.post('/videos', (req, res) => {
  const db = getDb();
  const b = extract(req.body);
  const videoUrl = String(b.video_url || '').trim();
  if (!videoUrl) return res.status(400).json({ error: 'A video file is required' });
  if (!/^\/uploads\/[^/]+$/.test(videoUrl)) return res.status(400).json({ error: 'Invalid video file path' });
  const title = String(b.title || '').trim() || 'Untitled video';
  const description = String(b.description || '').trim();
  const thumbnail_url = String(b.thumbnail_url || '').trim();
  const category_id = b.category_id ? parseInt(b.category_id, 10) || null : null;
  const is_published = b.is_published === '1' || b.is_published === 1 ? 1 : 0;
  try {
    const info = db
      .prepare(
        `INSERT INTO videos (title, description, video_url, thumbnail_url, category_id, is_published, created_at)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
      )
      .run(title, description, videoUrl, thumbnail_url, category_id, is_published);
    res.status(201).json({ ok: true, id: Number(info.lastInsertRowid) });
  } catch (e) {
    safeDelete(videoUrl);
    if (thumbnail_url) safeDelete(thumbnail_url);
    console.error('Video insert error:', e.message);
    res.status(500).json({ error: 'Could not save video' });
  }
});

router.put('/videos/:id', (req, res) => {
  const db = getDb();
  const b = extract(req.body);
  const existing = db.prepare('SELECT * FROM videos WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Video not found' });
  let video_url = existing.video_url;
  if (b.video_url !== undefined && String(b.video_url || '').trim()) {
    if (!/^\/uploads\/[^/]+$/.test(String(b.video_url))) return res.status(400).json({ error: 'Invalid video file path' });
    video_url = String(b.video_url).trim();
    if (existing.video_url !== video_url) safeDelete(existing.video_url);
  }
  let thumbnail_url = b.thumbnail_url === undefined ? existing.thumbnail_url : String(b.thumbnail_url || '').trim();
  if (b.thumbnail_url !== undefined && thumbnail_url !== existing.thumbnail_url) safeDelete(existing.thumbnail_url);
  db.prepare(
    `UPDATE videos SET title = ?, description = ?, video_url = ?, thumbnail_url = ?, category_id = ?, is_published = ?
     WHERE id = ?`
  ).run(
    b.title != null ? String(b.title).trim() || existing.title : existing.title,
    b.description !== undefined ? String(b.description).trim() : existing.description,
    video_url,
    thumbnail_url,
    b.category_id !== undefined && b.category_id !== '' ? parseInt(b.category_id, 10) || null : existing.category_id,
    b.is_published !== undefined ? (b.is_published === '1' || b.is_published === 1 ? 1 : 0) : existing.is_published,
    req.params.id
  );
  res.json({ ok: true });
});

router.delete('/videos/:id', (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM videos WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Video not found' });
  db.prepare('DELETE FROM videos WHERE id = ?').run(req.params.id);
  safeDelete(existing.video_url);
  if (existing.thumbnail_url) safeDelete(existing.thumbnail_url);
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

router.get('/bookings', (req, res) => {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT b.*, s.name AS service_name
       FROM bookings b LEFT JOIN services s ON s.id = b.service_id
       ORDER BY b.created_at DESC, b.id DESC`
    )
    .all();
  res.json(rows);
});

router.put('/bookings/:id/status', (req, res) => {
  const db = getDb();
  const status = String(extract(req.body).status || '').trim();
  if (!['pending', 'confirmed', 'rejected', 'completed', 'cancelled'].includes(status)) {
    return res.status(400).json({ error: 'Invalid booking status' });
  }
  const booking = db.prepare('SELECT id FROM bookings WHERE id = ?').get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  db.prepare('UPDATE bookings SET status = ? WHERE id = ?').run(status, req.params.id);
  res.json({ ok: true, status });
});

router.get('/bookings/:id/replies', (req, res) => {
  const db = getDb();
  const booking = db.prepare(
    `SELECT b.*, s.name AS service_name FROM bookings b
     LEFT JOIN services s ON s.id = b.service_id WHERE b.id = ?`
  ).get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  const replies = db.prepare('SELECT * FROM booking_replies WHERE booking_id = ? ORDER BY sent_at ASC, id ASC').all(req.params.id);
  res.json({ booking, replies });
});

router.post('/bookings/:id/reply', async (req, res) => {
  const db = getDb();
  const booking = db.prepare(
    `SELECT b.*, s.name AS service_name FROM bookings b
     LEFT JOIN services s ON s.id = b.service_id WHERE b.id = ?`
  ).get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  const body = String(extract(req.body).reply || '').trim();
  if (!body) return res.status(400).json({ error: 'Reply message is required' });
  if (!booking.customer_email || !/^\S+@\S+\.\S+$/.test(booking.customer_email)) {
    return res.status(400).json({ error: 'The customer has no valid email address to reply to' });
  }

  const settings = getAllSettings();
  const fromName = settings.smtp_from_name || 'JLS Photography';
  const brand = settings.brand_name || 'JLS Photography';
  const escMail = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
    <h2 style="color:#a8863f">${escMail(brand)}</h2>
    <p>Dear ${escMail(booking.customer_name)},</p>
    <div style="padding:18px 20px;background:#f9f6ef;border:1px solid #eee5d3;border-radius:10px;white-space:pre-wrap">${escMail(body)}</div>
    <p style="margin-top:20px;color:#6b6457">— ${escMail(fromName)}</p>
  </div>`;
  const subject = 'Re: Your booking request with ' + fromName;
  const result = await sendMail(booking.customer_email, subject, html);
  const emailStatus = result.ok ? 'sent' : result.skipped ? 'skipped' : 'failed';
  const errorText = result && result.error ? String(result.error).slice(0, 500) : result && result.skipped ? String(result.reason) : '';
  db.prepare(
    `INSERT INTO booking_replies (booking_id, reply_body, reply_to, subject, email_status, error_text)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(booking.id, body, booking.customer_email, subject, emailStatus, errorText);
  res.json({ ok: true, email_status: emailStatus, warning: errorText });
});

router.put('/messages/:id/read', (req, res) => {
  const db = getDb();
  const { is_read } = extract(req.body);
  db.prepare('UPDATE messages SET is_read = ? WHERE id = ?').run(is_read ? 1 : 0, req.params.id);
  res.json({ ok: true });
});

router.get('/messages/:id/replies', (req, res) => {
  const db = getDb();
  const msg = db.prepare('SELECT * FROM messages WHERE id = ?').get(req.params.id);
  if (!msg) return res.status(404).json({ error: 'Message not found' });
  const replies = db
    .prepare('SELECT * FROM message_replies WHERE message_id = ? ORDER BY sent_at ASC, id ASC')
    .all(req.params.id);
  res.json({ message: msg, replies });
});

router.post('/messages/:id/reply', async (req, res) => {
  const db = getDb();
  const msg = db.prepare('SELECT * FROM messages WHERE id = ?').get(req.params.id);
  if (!msg) return res.status(404).json({ error: 'Message not found' });
  const b = extract(req.body);
  const body = String(b.reply || '').trim();
  if (!body) return res.status(400).json({ error: 'Reply message is required' });
  if (!msg.email || !/^\S+@\S+\.\S+$/.test(msg.email)) {
    return res.status(400).json({ error: 'The sender has no valid email address to reply to' });
  }

  const settings = getAllSettings();
  const fromName = settings.smtp_from_name || 'JLS Photography';
  const base = String(settings.site_url || process.env.SITE_URL || '').replace(/\/+$/, '') || '';
  const subject = b.subject ? String(b.subject).trim() : 'Re: ' + (msg.subject || 'Your message to ' + fromName);

  const esc = (s) =>
    String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const brand = settings.brand_name || 'JLS Photography';
  const html =
    `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#a8863f;margin:0 0 18px">${esc(brand)}</h2>
      <p>Dear ${esc(msg.name)},</p>
      <div style="padding:18px 20px;background:#f9f6ef;border:1px solid #eee5d3;border-radius:10px;white-space:pre-wrap;color:#3a3732">${esc(body)}</div>
      <p style="margin-top:20px;color:#6b6457;font-size:13px">— ${esc(fromName)}</p>
      <div style="margin-top:26px;padding-top:16px;border-top:1px solid #eee5d3;color:#8a8375;font-size:12px">
        <b>Your original message:</b><br>
        <div style="margin-top:6px;color:#57524a">${esc(msg.message)}</div>
      </div>
      ${base ? `<p style="margin-top:18px"><a href="${esc(base)}" style="background:#c9a961;color:#14140f;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:bold">Visit our website</a></p>` : ''}
    </div>`;

  const result = await sendMail(msg.email, subject, html);

  const status = result.ok ? 'sent' : result.skipped ? 'skipped' : 'failed';
  const errText = result && result.error ? String(result.error).slice(0, 500) : result && result.skipped ? String(result.reason) : '';
  try {
    db.prepare(
      `INSERT INTO message_replies (message_id, reply_body, reply_to, subject, email_status, error_text)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(msg.id, body, msg.email, subject, status, errText);
    db.prepare('UPDATE messages SET is_read = 1 WHERE id = ?').run(msg.id);
  } catch (e) {
    console.error('Reply save error:', e.message);
    return res.status(500).json({ error: 'Could not save the reply' });
  }

  if (result.ok) {
    res.json({ ok: true, email_status: 'sent', message: 'Reply sent to ' + msg.email });
  } else if (result.skipped) {
    res.json({
      ok: true,
      email_status: 'skipped',
      message: 'Reply saved, but email was NOT sent (SMTP is not configured).',
      warning: result.reason || 'SMTP not configured'
    });
  } else {
    res.json({
      ok: true,
      email_status: 'failed',
      message: 'Reply saved, but the email failed to send.',
      warning: result.error || 'Unknown mail error'
    });
  }
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

router.post('/settings/test-email', async (req, res) => {
  const b = extract(req.body);
  const saved = getAllSettings();
  const host = String(b.smtp_host || saved.smtp_host || '').trim();
  const port = parseInt(String(b.smtp_port || saved.smtp_port || '587'), 10) || 587;
  const user = String(b.smtp_user || saved.smtp_user || '').trim();
  const passRaw = b.smtp_pass != null && String(b.smtp_pass).trim() !== '' ? String(b.smtp_pass) : String(saved.smtp_pass || '');
  const fromName = String(b.smtp_from_name || saved.smtp_from_name || 'JLS Photography').trim();
  const from = String(b.smtp_from || saved.smtp_from || user || '').trim();
  const secure = String(b.smtp_secure || '').trim() === 'true' || port === 465;
  const to = String(b.to || saved.notify_email || saved.email || user || '').trim();

  if (!host) return res.status(400).json({ error: 'SMTP host is required' });
  if (!user) return res.status(400).json({ error: 'SMTP username is required' });
  if (!passRaw) return res.status(400).json({ error: 'SMTP password (app password) is required' });
  if (!/^\S+@\S+\.\S+$/.test(to)) return res.status(400).json({ error: 'A valid recipient email is required' });

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass: passRaw }
  });

  let info;
  try {
    await transporter.verify();
    info = await transporter.sendMail({
      from: `"${fromName}" <${from}>`,
      to,
      subject: 'JLS Photography — SMTP test',
      html:
        '<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto">' +
        '<h2 style="color:#a8863f;margin:0 0 14px">JLS Photography</h2>' +
        '<p>This is a test message — your email (SMTP) settings are working and replies will now reach customers.</p>' +
        '</div>'
    });
  } catch (e) {
    const msg =
      e && e.response && Buffer.isBuffer(e.response)
        ? e.response.toString().slice(0, 500)
        : e && e.message
          ? e.message.slice(0, 500)
          : 'Email send failed';
    return res.status(400).json({ error: msg });
  }

  res.json({ ok: true, message: 'Test email sent to ' + to, id: info && info.messageId ? String(info.messageId) : undefined });
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

// ---------- Video file upload ----------
router.post('/upload/video', videoFileUpload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No video uploaded' });
  res.status(201).json({ url: '/uploads/' + req.file.filename });
});

router.use('/photos', (err, req, res, next) => {
  if (req.path && req.method === 'POST') return handleUploadErrors(err, req, res, next);
  next(err);
});

router.use('/upload', (err, req, res, next) => handleUploadErrors(err, req, res, next));

module.exports = router;