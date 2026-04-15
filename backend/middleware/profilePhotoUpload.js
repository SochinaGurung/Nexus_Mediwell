import multer from 'multer';

const storage = multer.memoryStorage();

const fileFilter = (_req, file, cb) => {
  const ok = /^image\/(jpeg|jpg|png|webp|gif)$/i.test(file.mimetype);
  if (ok) cb(null, true);
  else cb(new Error('Only JPEG, PNG, WebP, or GIF images are allowed'));
};

const profilePhotoMulter = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter
});

// Express middleware wrapper so Multer errors return JSON.
export function uploadProfilePhotoMiddleware(req, res, next) {
  profilePhotoMulter.single('photo')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'Image must be 5MB or smaller' });
      }
      return res.status(400).json({ message: err.message || 'Invalid upload' });
    }
    next();
  });
}

