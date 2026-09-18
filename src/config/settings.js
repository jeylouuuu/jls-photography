const { getDb } = require('./db');

function getAllSettings() {
  const db = getDb();
  const rows = db.prepare('SELECT setting_key, setting_value FROM settings').all();
  const out = {};
  for (const r of rows) out[r.setting_key] = r.setting_value == null ? '' : String(r.setting_value);
  return out;
}

function getSetting(key, fallback = '') {
  const db = getDb();
  const r = db.prepare('SELECT setting_value FROM settings WHERE setting_key = ?').get(key);
  return r && r.setting_value != null && r.setting_value !== '' ? String(r.setting_value) : fallback;
}

function updateSettings(entries) {
  const db = getDb();
  const upsert = db.prepare(
    'INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value'
  );
  db.exec('BEGIN');
  try {
    for (const [k, v] of Object.entries(entries)) {
      upsert.run(k, v == null ? '' : String(v));
    }
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

module.exports = { getAllSettings, getSetting, updateSettings };