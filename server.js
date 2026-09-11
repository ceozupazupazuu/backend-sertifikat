require('dotenv').config();
const express = require('express');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000;

const DATA_DIR = path.join(__dirname, 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });
const db = new Database(path.join(DATA_DIR, 'certificates.db'));
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS certificates (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    product_name   TEXT NOT NULL,
    photo_filename TEXT,
    created_at     TEXT DEFAULT (datetime('now')),
    updated_at     TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS certificate_skus (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    certificate_id INTEGER NOT NULL,
    sku            TEXT NOT NULL UNIQUE,
    FOREIGN KEY (certificate_id) REFERENCES certificates(id) ON DELETE CASCADE
  );
`);

const hasLegacySkuColumn = db.prepare("PRAGMA table_info(certificates)").all().some(col => col.name === 'sku');
if (hasLegacySkuColumn) {
  db.pragma('foreign_keys = OFF');
  const migrate = db.transaction(() => {
    db.exec(`
      CREATE TABLE certificates_migrated (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        product_name   TEXT NOT NULL,
        photo_filename TEXT,
        created_at     TEXT DEFAULT (datetime('now')),
        updated_at     TEXT DEFAULT (datetime('now'))
      );
      INSERT INTO certificates_migrated (id, product_name, photo_filename, created_at, updated_at)
        SELECT id, product_name, photo_filename, created_at, updated_at FROM certificates;
    `);
    const insertSku = db.prepare('INSERT OR IGNORE INTO certificate_skus (certificate_id, sku) VALUES (?, ?)');
    const oldRows = db.prepare("SELECT id, sku FROM certificates WHERE sku IS NOT NULL AND sku != ''").all();
    oldRows.forEach(r => insertSku.run(r.id, r.sku));
    db.exec(`
      DROP TABLE certificates;
      ALTER TABLE certificates_migrated RENAME TO certificates;
    `);
  });
  migrate();
  db.pragma('foreign_keys = ON');
}

const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
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
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) return cb(null, true);
    cb(new Error('Only .jpg, .jpeg, .png, .webp files are allowed'));
  }
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d' }));
app.use('/admin/assets', express.static(path.join(__dirname, 'public')));

app.use('/api', (req, res, next) => {
  const origin = req.headers.origin;
  if (origin && origin.replace(/^https?:\/\//, '') === 'sertifikat.zupazupazuu.id') {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Methods', 'GET');
  next();
});

app.use(session({
  secret: process.env.SESSION_SECRET || 'please-change-this-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    maxAge: 8 * 60 * 60 * 1000,
    secure: process.env.NODE_ENV === 'production'
  }
}));

function requireAuth(req, res, next) {
  if (req.session && req.session.authed) return next();
  return res.status(401).json({ error: 'Unauthorized' });
}

const BACKEND_ORIGIN = 'https://backend-sertifikat-production.up.railway.app';

const getSkusStmt = db.prepare('SELECT sku FROM certificate_skus WHERE certificate_id = ? ORDER BY id');

function toPublic(row) {
  const skus = getSkusStmt.all(row.id).map(r => r.sku);
  return {
    id: row.id,
    skus,
    product_name: row.product_name,
    photo_url: row.photo_filename ? `${BACKEND_ORIGIN}/uploads/${row.photo_filename}` : null
  };
}

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

app.get('/admin/api/certificates', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT * FROM certificates ORDER BY id DESC').all();
  res.json(rows.map(toPublic));
});

app.post('/admin/api/certificates', requireAuth, upload.single('photo'), (req, res) => {
  const skus = String(req.body.skus || '').split(',').map(s => s.trim()).filter(Boolean);
  const product_name = (req.body.product_name || '').trim();

  if (skus.length === 0 || !product_name) {
    return res.status(400).json({ error: 'at least one SKU and product_name are required' });
  }

  const photo_filename = req.file ? req.file.filename : null;

  const insertCert = db.prepare('INSERT INTO certificates (product_name, photo_filename) VALUES (?, ?)');
  const insertSku = db.prepare('INSERT INTO certificate_skus (certificate_id, sku) VALUES (?, ?)');
  const createTx = db.transaction((skus) => {
    const info = insertCert.run(product_name, photo_filename);
    for (const sku of skus) insertSku.run(info.lastInsertRowid, sku);
    return info.lastInsertRowid;
  });

  try {
    const certId = createTx(skus);
    const row = db.prepare('SELECT * FROM certificates WHERE id = ?').get(certId);
    res.status(201).json(toPublic(row));
  } catch (e) {
    if (String(e.message).includes('UNIQUE')) {
      return res.status(409).json({ error: 'One or more SKUs already exist on another certificate' });
    }
    res.status(500).json({ error: e.message });
  }
});

app.put('/admin/api/certificates/:id', requireAuth, upload.single('photo'), (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM certificates WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Not found' });

  const product_name = (req.body.product_name || existing.product_name).trim();
  let photo_filename = existing.photo_filename;

  if (req.file) {
    if (existing.photo_filename) {
      fs.unlink(path.join(UPLOAD_DIR, existing.photo_filename), () => {});
    }
    photo_filename = req.file.filename;
  }

  let skus = null;
  if (typeof req.body.skus === 'string') {
    skus = req.body.skus.split(',').map(s => s.trim()).filter(Boolean);
    if (skus.length === 0) {
      return res.status(400).json({ error: 'at least one SKU is required' });
    }
  }

  const insertSku = db.prepare('INSERT INTO certificate_skus (certificate_id, sku) VALUES (?, ?)');
  const updateTx = db.transaction(() => {
    db.prepare(
      "UPDATE certificates SET product_name=?, photo_filename=?, updated_at=datetime('now') WHERE id=?"
    ).run(product_name, photo_filename, id);
    if (skus) {
      db.prepare('DELETE FROM certificate_skus WHERE certificate_id = ?').run(id);
      for (const sku of skus) insertSku.run(id, sku);
    }
  });

  try {
    updateTx();
    const row = db.prepare('SELECT * FROM certificates WHERE id = ?').get(id);
    res.json(toPublic(row));
  } catch (e) {
    if (String(e.message).includes('UNIQUE')) {
      return res.status(409).json({ error: 'One or more SKUs already exist on another certificate' });
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

app.get('/api/certificates/search', (req, res) => {
  res.set('Cache-Control', 'no-store');
  const q = (req.query.q || '').trim().toLowerCase();
  if (!q) return res.json([]);
  const rows = db
    .prepare(
      `SELECT DISTINCT c.* FROM certificates c
       LEFT JOIN certificate_skus s ON s.certificate_id = c.id
       WHERE lower(s.sku) LIKE ? OR lower(c.product_name) LIKE ?
       ORDER BY c.id DESC`
    )
    .all(`%${q}%`, `%${q}%`);
  res.json(rows.map(toPublic));
});

app.get('/api/certificates', (req, res) => {
  res.set('Cache-Control', 'no-store');
  const rows = db.prepare('SELECT * FROM certificates ORDER BY id DESC').all();
  res.json(rows.map(toPublic));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/', (req, res) => res.redirect('/admin'));

app.use((err, req, res, next) => {
  if (err) return res.status(400).json({ error: err.message });
  next();
});

app.listen(PORT, () => {
  console.log(`Certificate backend running on http://localhost:${PORT}`);
});
