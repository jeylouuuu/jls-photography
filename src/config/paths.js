const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..', '..');

function getUploadsDir() {
  const custom = process.env.UPLOADS_DIR;
  const dir = custom ? path.resolve(custom) : path.join(ROOT, 'uploads');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// Bundled seed imagery (ships read-only inside the Docker image). Used only to
// give a brand-new production volume a working gallery until real uploads arrive.
function getSeedAssetsDir() {
  const custom = process.env.SEED_ASSETS_DIR;
  return custom ? path.resolve(custom) : path.join(ROOT, 'seed-assets');
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

module.exports = { ROOT, getUploadsDir, getSeedAssetsDir, getDbPath, getDataDir };