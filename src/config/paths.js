const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..', '..');

function getUploadsDir() {
  const custom = process.env.UPLOADS_DIR;
  const dir = custom ? path.resolve(custom) : path.join(ROOT, 'uploads');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function getDataDir() {
  const custom = process.env.DB_PATH;
  const dir = custom ? path.resolve(path.dirname(custom)) : path.join(ROOT, 'data');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function getDbPath() {
  if (process.env.DB_PATH) return path.resolve(process.env.DB_PATH);
  return path.join(ROOT, 'data', 'photography.db');
}

module.exports = { ROOT, getUploadsDir, getDbPath, getDataDir };