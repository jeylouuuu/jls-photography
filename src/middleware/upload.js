const multer = require('multer');
const path = require('path');
const { getUploadsDir } = require('../config/paths');

const IMAGE_TYPES = /jpeg|jpg|png|gif|webp|avif/;
const VIDEO_TYPES = /mp4|webm|mov|quicktime/;
const ALL_TYPES = /jpeg|jpg|png|gif|webp|avif|mp4|webm|mov|quicktime/;

function makeUpload(opts = {}) {
  const {
    fieldName = 'files',
    maxSize = opts.allowVideo ? 25 * 1024 * 1024 : 8 * 1024 * 1024,
    allowVideo = false,
    allowed = allowVideo ? ALL_TYPES : IMAGE_TYPES,
    max = opts.allowVideo ? 24 : 12
  } = opts;

  const storage = multer.diskStorage({
    destination(req, file, cb) {
      cb(null, getUploadsDir());
    },
    filename(req, file, cb) {
      const ext = path.extname(file.originalname || '').toLowerCase();
      const safeExt = /^\.\w+$/.test(ext) ? ext : '';
      cb(null, Date.now() + '-' + Math.round(Math.random() * 1e9) + safeExt);
    }
  });

  const filter = (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const isImage = IMAGE_TYPES.test(file.mimetype) || IMAGE_TYPES.test(ext);
    const isVideo = allowVideo && (VIDEO_TYPES.test(file.mimetype) || VIDEO_TYPES.test(ext));
    const matchesAllowed = allowed.test(String(file.mimetype || '')) || allowed.test(ext);
    if ((isImage || isVideo) && matchesAllowed) {
      return cb(null, true);
    }
    const err = new Error('Invalid file type. Only images' + (allowVideo ? ' and videos' : '') + ' are allowed.');
    err.status = 400;
    err.code = 'INVALID_FILE_TYPE';
    cb(err);
  };

  return multer({
    storage,
    limits: { fileSize: maxSize, files: max },
    fileFilter: filter
  });
}

function handleUploadErrors(err, req, res, next) {
  if (!err) return next();
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File too large. Maximum size exceeded.' });
  }
  if (err.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({ error: 'Too many files selected.' });
  }
  if (err.code === 'INVALID_FILE_TYPE') {
    return res.status(400).json({ error: err.message });
  }
  return res.status(400).json({ error: err.message || 'Upload failed' });
}

module.exports = { makeUpload, handleUploadErrors, getUploadsDir };