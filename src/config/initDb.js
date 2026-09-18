const bcrypt = require('bcryptjs');
const { getDb } = require('./db');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT DEFAULT '',
  description TEXT DEFAULT '',
  image_url TEXT NOT NULL,
  category_id INTEGER,
  is_featured INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  media_type TEXT DEFAULT 'image',
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  price REAL NOT NULL DEFAULT 0,
  duration TEXT DEFAULT '',
  description TEXT DEFAULT '',
  features TEXT DEFAULT '[]',
  image_url TEXT DEFAULT '',
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER,
  service_id INTEGER,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT,
  event_date TEXT DEFAULT '',
  event_time TEXT DEFAULT '',
  location TEXT DEFAULT '',
  message TEXT DEFAULT '',
  status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  subject TEXT DEFAULT '',
  message TEXT NOT NULL,
  service TEXT DEFAULT '',
  preferred_date TEXT DEFAULT '',
  is_read INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS testimonials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_name TEXT NOT NULL,
  role TEXT DEFAULT '',
  photo TEXT DEFAULT '',
  rating INTEGER DEFAULT 5,
  content TEXT NOT NULL,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  client_email TEXT DEFAULT '',
  status TEXT DEFAULT 'pending',
  admin_reply TEXT DEFAULT '',
  replied_at TEXT,
  updated_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_photos_category ON photos(category_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_customer ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_messages_read ON messages(is_read);
`;

function columnExists(table, col) {
  const db = getDb();
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  return cols.some((c) => c.name === col);
}

function applyColumn(table, col, ddl) {
  if (columnExists(table, col)) return;
  try {
    getDb().exec(`ALTER TABLE ${table} ADD COLUMN ${ddl};`);
  } catch (e) {
    if (!String(e.message).includes('duplicate column')) throw e;
  }
}

const DEFAULT_SETTINGS = {
  photographer_name: 'Jieliezer Sapanta',
  brand_name: 'JLS Photography',
  tagline: 'Storytelling Through the Lens',
  hero_heading: 'Capturing Moments That Last a Lifetime',
  hero_subheading:
    'Professional wedding, portrait, and event photography with an artistic eye for light, emotion, and detail.',
  hero_image: '/uploads/1.jpg',
  about_image: '/uploads/1.jpg',
  bio_short:
    'I am Jieliezer, a professional photographer with over 10 years of experience turning fleeting moments into timeless imagery.',
  bio_full:
    'I am Jieliezer, a professional photographer based in Cebu, Philippines, specializing in weddings, portraits, events, and storytelling photography. Over the past decade I have photographed more than 300 weddings and countless portraits and celebrations of every scale.\n\nMy approach is simple: blend in, stay patient, and let the moment unfold naturally. I believe the best photographs are honest ones — unposed laughter, quiet glances, and the in-between seconds people forget they were being watched.\n\nWhen I am not behind a camera I am studying light, scouting locations, and refining the post-production craft that turns a good photo into a keepsake.',
  experience_years: '10+',
  projects_count: '500+',
  clients_count: '350+',
  location_label: 'Cebu, Philippines',
  address: 'Cebu, Philippines',
  email: 'hello@jlsphotography.com',
  phone: '+63 917 555 0123',
  map_embed: '',
  currency_symbol: '$',
  facebook: 'https://www.facebook.com/',
  instagram: 'https://www.instagram.com/jlsphotography',
  twitter: 'https://x.com/jlsphotography',
  linkedin: 'https://linkedin.com/company/jlsphotography',
  youtube: '',
  copyright: 'JLS Photography. All rights reserved.',
  about_specialties:
    '[{"icon":"camera","title":"Wedding Storytelling","desc":"Documentary-style coverage of your most important day."},{"icon":"user","title":"Portraits","desc":"Natural, timeless portraits that capture personality."},{"icon":"users","title":"Events & Celebrations","desc":"Vibrant coverage from intimate gatherings to grand galas."},{"icon":"image","title":"Couples & Engagements","desc":"Romantic sessions planning the next big chapter."}]',
  about_equipment:
    '[{"title":"Sony A7 IV","tag":"Full-Frame Body"},{"title":"Sony 24-70mm f/2.8 GM","tag":"Event Zoom"},{"title":"DJI Mavic 3 Pro","tag":"Aerial"},{"title":"Godox AD200 Pro","tag":"Off-camera Flash"},{"title":"Fujifilm X100V","tag":"Street Compact"},{"title":"Profoto B10","tag":"Studio Lighting"}]',
  about_skills:
    '[{"label":"Portrait & Glamour","pct":95},{"label":"Event & Wedding","pct":92},{"label":"Landscape & Travel","pct":88},{"label":"Editing & Retouching","pct":96},{"label":"Lighting Design","pct":90},{"label":"Street & Documentary","pct":85}]',
  smtp_host: '',
  smtp_port: '587',
  smtp_secure: '',
  smtp_user: '',
  smtp_pass: '',
  smtp_from: '',
  smtp_from_name: 'JLS Photography'
};

const SEED_CATEGORIES = [
  ['Wedding', 'wedding'],
  ['Portrait', 'portrait'],
  ['Events', 'events'],
  ['Couples', 'couples'],
  ['Landscape', 'landscape'],
  ['Other', 'other']
];

const SEED_SERVICES = [
  {
    name: 'Essential Session',
    price: 249,
    duration: '1.5 hours',
    description: 'Perfect for individuals or small families looking for a polished portrait session.',
    features: ['1.5 hour session', '20 edited photos', 'Online gallery', 'One location'],
    image_url: '/uploads/portrait-12.jpg'
  },
  {
    name: 'Wedding Photography',
    price: 1499,
    duration: 'Full day (10 hrs)',
    description: 'Complete wedding-day storytelling from preparations to the last dance.',
    features: ['10 hour coverage', 'Unlimited edited photos', 'Online gallery + keepsake USB', 'Engagement session included', 'Preview gallery within 24h', 'Print rights'],
    image_url: '/uploads/wedding-2.jpg'
  },
  {
    name: 'Portrait Photography',
    price: 499,
    duration: '3 hours',
    description: 'A balanced package ideal for families, engagements, or creative portrait shoots.',
    features: ['3 hour session', '60 edited photos', 'Online gallery + print release', 'One location + outfit change'],
    image_url: '/uploads/portrait-7.jpg'
  },
  {
    name: 'Event Photography',
    price: 699,
    duration: '4 hours',
    description: 'Professional coverage for conferences, launches, galas, and company celebrations.',
    features: ['4 hour coverage', '100+ edited photos', 'Quick turnaround (72h)', 'On-site highlights'],
    image_url: '/uploads/events-6.jpg'
  },
  {
    name: 'Couples Photography',
    price: 799,
    duration: '4 hours',
    description: 'Romantic and candid sessions for engagements, anniversaries, and pre-wedding shoots.',
    features: ['4 hour session', '80 edited photos', 'Two locations', 'Online gallery + print release'],
    image_url: '/uploads/wedding-5.jpg'
  },
  {
    name: 'Birthday Photography',
    price: 599,
    duration: '3 hours',
    description: 'Fun and vibrant coverage of birthdays, kids parties, and milestone celebrations.',
    features: ['3 hour coverage', '80 edited photos', 'Online gallery', 'One location'],
    image_url: '/uploads/graduation-9.jpg'
  },
  {
    name: 'Product Photography',
    price: 399,
    duration: '2 hours',
    description: 'Clean, commercial-grade shots for e-commerce, menus, and social media content.',
    features: ['2 hour session', '30 edited photos', 'Studio lighting', 'E-commerce ready images'],
    image_url: '/uploads/landscape-13.jpg'
  },
  {
    name: 'Custom Photography',
    price: 0,
    duration: 'Flexible',
    description: 'Have something unique in mind? Message me and we will design a session around your vision.',
    features: ['Tailored to your needs', 'Consultation included', 'Custom timeline'],
    image_url: '/uploads/street-1.jpg'
  }
];

const SEED_PHOTOS = [
  ['Golden Hour Rivals', 'A quiet street corner glowing under late afternoon light.', '/uploads/street-1.jpg', 5, 1],
  ['First Look', 'The emotional moment before the ceremony begins.', '/uploads/wedding-2.jpg', 1, 1],
  ['City Lights', 'Downtown bustle frozen in a single frame.', '/uploads/street-3.jpg', 5, 0],
  ['Mountain Dawn', 'Misty peaks catching the first rays of sunlight.', '/uploads/landscape-4.jpg', 4, 1],
  ['Timeless Vows', 'An intimate exchange of vows by the sea.', '/uploads/wedding-5.jpg', 1, 0],
  ['Corporate Gala', 'Elegant moments from a company anniversary gala.', '/uploads/events-6.jpg', 3, 0],
  ['Museum Portrait', 'Bold editorial portrait study in soft window light.', '/uploads/portrait-7.jpg', 2, 1],
  ['Coastal Serenity', 'Long-exposure water smoothing over smooth stones.', '/uploads/landscape-8.jpg', 4, 0],
  ['Friends Forever', 'Confetti-filled joy at a graduation celebration.', '/uploads/graduation-9.jpg', 6, 1],
  ['Street Rhythm', 'Motion and energy on a busy market street.', '/uploads/street-10.jpg', 5, 0],
  ['The Big Day', 'A candid laugh shared between bride and bridesmaids.', '/uploads/events-11.jpg', 3, 0],
  ['Soft Contours', 'Minimalist portrait in warm studio tones.', '/uploads/portrait-12.jpg', 2, 0],
  ['Manila Nights', 'Neon glow reflecting on rain-soaked pavement.', '/uploads/landscape-13.jpg', 4, 0],
  ['Caps Off', 'The triumphant toss of graduation caps at dusk.', '/uploads/graduation-14.jpg', 6, 0],
  ['Sunset Vows', 'Couple silhouette at golden hour on the beach.', '/uploads/wedding-15.jpg', 1, 0],
  ['Field Study', 'A child running freely through tall golden grass.', '/uploads/portrait-16.jpg', 2, 0],
  ['Stage Lights', 'A live performance captured in dramatic light.', '/uploads/events-17.jpg', 3, 0],
  ['Lone Voyager', 'A single boat drifting across a mirror-still lake.', '/uploads/landscape-18.jpg', 4, 0]
];

function migrate() {
  const db = getDb();
  db.exec(SCHEMA);

  applyColumn('photos', 'is_published', 'is_published INTEGER DEFAULT 1');
  applyColumn('photos', 'media_type', "media_type TEXT DEFAULT 'image'");
  applyColumn('services', 'image_url', "image_url TEXT DEFAULT ''");
  applyColumn('messages', 'service', "service TEXT DEFAULT ''");
  applyColumn('messages', 'preferred_date', "preferred_date TEXT DEFAULT ''");

  const insertCat = db.prepare('INSERT OR IGNORE INTO categories (name, slug) VALUES (?, ?)');
  for (const [name, slug] of SEED_CATEGORIES) insertCat.run(name, slug);

  const upsertSetting = db.prepare(
    'INSERT OR IGNORE INTO settings (setting_key, setting_value) VALUES (?, ?)'
  );
  for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) upsertSetting.run(k, v);

  const done = db.prepare("SELECT setting_value FROM settings WHERE setting_key = '_seed_finished'").get();
  if (!done) {
    if (db.prepare('SELECT COUNT(*) c FROM photos').get().c === 0) {
      const insertPhoto = db.prepare(
        'INSERT INTO photos (title, description, image_url, category_id, is_featured, is_published, media_type) VALUES (?, ?, ?, ?, ?, 1, ?)'
      );
      for (const [title, desc, url, cat, feat] of SEED_PHOTOS) insertPhoto.run(title, desc, url, cat, feat, 'image');
    }
    if (db.prepare('SELECT COUNT(*) c FROM services').get().c === 0) {
      const insertService = db.prepare(
        'INSERT INTO services (name, price, duration, description, features, image_url, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)'
      );
      for (const s of SEED_SERVICES) insertService.run(s.name, s.price, s.duration, s.description, JSON.stringify(s.features), s.image_url);
    }
    db.prepare("INSERT OR IGNORE INTO settings (setting_key, setting_value) VALUES ('_seed_finished', '1')").run();
  }

  const seedAdmin = db.prepare('SELECT * FROM admins LIMIT 1').get();
  if (!seedAdmin) {
    const username = process.env.ADMIN_USERNAME || 'admin';
    const email = process.env.ADMIN_EMAIL || 'admin@jlsphotography.com';
    const password = process.env.ADMIN_PASSWORD || 'Admin@12345';
    const hash = bcrypt.hashSync(password, 12);
    db.prepare('INSERT INTO admins (username, email, password_hash, full_name) VALUES (?, ?, ?, ?)').run(
      username,
      email,
      hash,
      'Administrator'
    );
  }

  const setServiceImages = db.prepare("UPDATE services SET image_url = ? WHERE name = ? AND (image_url IS NULL OR image_url = '')");
  for (const s of SEED_SERVICES) setServiceImages.run(s.image_url, s.name);

  const getSettingRaw = db.prepare('SELECT setting_value FROM settings WHERE setting_key = ?');
  const heroRow = getSettingRaw.get('hero_image');
  if (heroRow && !String(heroRow.setting_value || '').startsWith('/')) {
    db.prepare("UPDATE settings SET setting_value = '/uploads/1.jpg' WHERE setting_key = 'hero_image'").run();
  }
  const taglineRow = getSettingRaw.get('tagline');
  if (taglineRow) {
    let t = String(taglineRow.setting_value || '').trim();
    if (t.length > 13 && /ceu$/i.test(t.slice(-4))) t = t.slice(0, -3).trim();
    db.prepare('UPDATE settings SET setting_value = ? WHERE setting_key = ?').run(t, 'tagline');
  }
}

function initDb() {
  migrate();
}

module.exports = { initDb, migrate };