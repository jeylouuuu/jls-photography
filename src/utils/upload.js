const fs = require('fs');
const path = require('path');
const { getUploadsDir } = require('../config/paths');

function safeDelete(url) {
  if (!url) return;
  try {
    const clean = String(url).replace(/^\/uploads\//, '');
    if (clean.includes('..') || clean.includes('/') || clean.includes('\\')) return;
    const full = path.join(getUploadsDir(), clean);
    if (fs.existsSync(full)) fs.unlinkSync(full);
  } catch (e) {
    // ignore deletion errors
  }
}

module.exports = { safeDelete };