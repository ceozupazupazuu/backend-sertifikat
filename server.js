require('dotenv').config();
const express = require('express');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 3000;

// ---------------------------------------------------------------------------
// Database
// ---------------------------------------------------------------------------
const DATA_DIR = path.join(__dirname, 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });
const db = new Database(path.join(DATA_DIR, 'certificates.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS certificates (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    sku            TEXT NOT NULL UNIQUE,
    product_name   TEXT NOT NULL,
    photo_filename TEXT,
    created_at     TEXT DEFAULT (datetime('now')),
    updated_at     TEXT DEFAULT (datetime('now'))
  );
`);

// ---------------------------------------------------------------------------
// Uploads
// ---------------------------------------------------------------------------
const UPLOAD_DIR = path.join(__dirname, 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `cert-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) return cb(null, true);
    cb(new Error('Only .jpg, .jpeg, .png, .webp files are allowed'));
  }
});

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d' }));
app.use('/admin/assets', express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: process.env.SESSION_SECRET || 'please-change-this-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    maxAge: 8 * 60 * 60 * 1000, // 8h
    secure: process.env.NODE_ENV === 'production'
  }
}));

function requireAuth(req, res, next) {
  if (req.session && req.session.authed) return next();
  return res.status(401).json({ error: 'Unauthorized' });
}

function toPublic(row) {
  return {
    id: row.id,
    sku: row.sku,
    product_name: row.product_name,
    photo_url: row.photo_filename ? `/uploads/${row.photo_filename}` : null
  };
}

// ---------------------------------------------------------------------------
// Auth routes
// ---------------------------------------------------------------------------
app.post('/admin/login', (req, res) => {
  const { username, password } = req.body || {};
  const ADMIN_USER = process.env.ADMIN_USER || 'admin';
  const ADMIN_PASS_HASH = process.env.ADMIN_PASS_HASH;

  if (!ADMIN_PASS_HASH) {
    return res.status(500).json({ error: 'Server misconfigured: ADMIN_PASS_HASH is not set' });
  }
  const okUser = username === ADMIN_USER;
  const okPass = okUser && bcrypt.compareSync(password || '', ADMIN_PASS_HASH);
  if (!okUser || !okPass) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }
  req.session.authed = true;
  res.json({ ok: true });
});

app.post('/admin/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get('/admin/api/me', (req, res) => {
 res.set('Cache-Control', 'no-store');
  res.json({ authed: !!(req.session && req.session.authed) });
});

// ---------------------------------------------------------------------------
// Admin CRUD API (protected)
// ---------------------------------------------------------------------------
app.get('/admin/api/certificates', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT * FROM certificates ORDER BY id DESC').all();
  res.json(rows.map(toPublic));
});

app.post('/admin/api/certificates', requireAuth, upload.single('photo'), (req, res) => {
  const sku = (req.body.sku || '').trim();
  const product_name = (req.body.product_name || '').trim();

  if (!sku || !product_name) {
    return res.status(400).json({ error: 'sku and product_name are required' });
  }

  const photo_filename = req.file ? req.file.filename : null;

  try {
    const info = db
      .prepare('INSERT INTO certificates (sku, product_name, photo_filename) VALUES (?, ?, ?)')
      .run(sku, product_name, photo_filename);
    const row = db.prepare('SELECT * FROM certificates WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json(toPublic(row));
  } catch (e) {
    if (String(e.message).includes('UNIQUE')) {
      return res.status(409).json({ error: `SKU "${sku}" already exists` });
    }
    res.status(500).json({ error: e.message });
  }
});

app.put('/admin/api/certificates/:id', requireAuth, upload.single('photo'), (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM certificates WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Not found' });

  const sku = (req.body.sku || existing.sku).trim();
  const product_name = (req.body.product_name || existing.product_name).trim();
  let photo_filename = existing.photo_filename;

  if (req.file) {
    if (existing.photo_filename) {
      fs.unlink(path.join(UPLOAD_DIR, existing.photo_filename), () => {});
    }
    photo_filename = req.file.filename;
  }

  try {
    db.prepare(
      "UPDATE certificates SET sku=?, product_name=?, photo_filename=?, updated_at=datetime('now') WHERE id=?"
    ).run(sku, product_name, photo_filename, id);
    const row = db.prepare('SELECT * FROM certificates WHERE id = ?').get(id);
    res.json(toPublic(row));
  } catch (e) {
    if (String(e.message).includes('UNIQUE')) {
      return res.status(409).json({ error: `SKU "${sku}" already exists` });
    }
    res.status(500).json({ error: e.message });
  }
});

app.delete('/admin/api/certificates/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM certificates WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  if (existing.photo_filename) {
    fs.unlink(path.join(UPLOAD_DIR, existing.photo_filename), () => {});
  }
  db.prepare('DELETE FROM certificates WHERE id = ?').run(id);
  res.json({ ok: true });
});

app.post('/admin/api/certificates/bulk-delete', requireAuth, (req, res) => {
  const { ids } = req.body || {};
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'ids (array) is required' });
  }
  const placeholders = ids.map(() => '?').join(',');
  const rows = db.prepare(`SELECT * FROM certificates WHERE id IN (${placeholders})`).all(...ids);
  rows.forEach(r => {
    if (r.photo_filename) fs.unlink(path.join(UPLOAD_DIR, r.photo_filename), () => {});
  });
  db.prepare(`DELETE FROM certificates WHERE id IN (${placeholders})`).run(...ids);
  res.json({ ok: true, deleted: rows.length });
});

// ---------------------------------------------------------------------------
// Public API — used by the certificate-verification frontend
// ---------------------------------------------------------------------------
app.get('/api/certificates/search', (req, res) => {
  const q = (req.query.q || '').trim().toLowerCase();
  if (!q) return res.json([]);
  const rows = db
    .prepare(
      `SELECT * FROM certificates WHERE lower(sku) LIKE ? OR lower(product_name) LIKE ? ORDER BY id DESC`
    )
    .all(`%${q}%`, `%${q}%`);
  res.json(rows.map(toPublic));
});

app.get('/api/certificates', (req, res) => {
  const rows = db.prepare('SELECT * FROM certificates ORDER BY id DESC').all();
  res.json(rows.map(toPublic));
});

// ---------------------------------------------------------------------------
// Admin panel (static HTML, auth handled client-side via /admin/api/me)
// ---------------------------------------------------------------------------
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/', (req, res) => res.redirect('/admin'));

// ---------------------------------------------------------------------------
// Error handler (e.g. multer file-type / size errors)
// ---------------------------------------------------------------------------
app.use((err, req, res, next) => {
  if (err) return res.status(400).json({ error: err.message });
  next();
});

app.listen(PORT, () => {
  console.log(`Certificate backend running on http://localhost:${PORT}`);
});
