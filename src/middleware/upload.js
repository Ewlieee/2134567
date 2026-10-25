const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const { badRequest } = require('../utils/http');

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');
const ALLOWED = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' };

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (req, file, cb) => cb(null, crypto.randomUUID() + ALLOWED[file.mimetype]),
});

const coverUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED[file.mimetype]) cb(null, true);
    else cb(badRequest('Обложка должна быть изображением JPG, PNG, WEBP или GIF'));
  },
}).single('cover');

/** Удаляет ранее загруженный файл обложки (только из каталога uploads/). */
function removeUpload(url) {
  if (!url || !url.startsWith('/uploads/')) return;
  const file = path.join(UPLOAD_DIR, path.basename(url));
  fs.promises.unlink(file).catch(() => {});
}

module.exports = { coverUpload, removeUpload };
