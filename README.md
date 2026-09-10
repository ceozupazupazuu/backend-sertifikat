# Certificate Backend

A small backend + admin panel to manage certificate records for
`sertifikat.zupazupazuu.id`. Each record has three fields:

1. **SKU**
2. **Product Name**
3. **Photo Certificate** (image file)

It gives you:
- `/admin` — a login-protected panel to add/edit/delete certificates (mirrors
  the style of your `backend-production-2607.up.railway.app/admin` panel).
- `/api/certificates/search?q=...` — a public JSON endpoint the
  verification frontend can call to look up a certificate by SKU or product
  name.

## 1. Local setup

```bash
npm install
cp .env.example .env
node hash-password.js "yourChosenPassword"   # copy the printed hash
```

Paste the printed hash into `.env` as `ADMIN_PASS_HASH`, set `ADMIN_USER`
and a random `SESSION_SECRET`, then:

```bash
npm start
```

Visit `http://localhost:3000/admin`, log in, and add certificates.

## 2. How data is stored

- SQLite file at `data/certificates.db` (auto-created).
- Photos saved to `uploads/` and served at `/uploads/<filename>`.
- No external database needed — good for a small catalog. If you expect a
  very large number of certificates or multiple server instances, swap
  `better-sqlite3` for Postgres/MySQL later; the query logic is simple and
  easy to port.

## 3. API reference

### Public (no auth) — for the frontend

```
GET /api/certificates/search?q=<sku-or-name>
```
Returns an array of matches:
```json
[
  { "id": 1, "sku": "SKU-10245", "product_name": "Meridian Oak Watch",
    "photo_url": "/uploads/cert-....jpg" }
]
```

```
GET /api/certificates
```
Returns every certificate — useful if you'd rather have the frontend fetch
the whole list once and search client-side (matching its current "local
lookup" behavior), instead of calling `/search` per keystroke.

### Admin (requires login session cookie)

| Method | Path                                   | Purpose            |
|--------|-----------------------------------------|--------------------|
| POST   | `/admin/login`                          | `{username,password}` |
| POST   | `/admin/logout`                         | end session        |
| GET    | `/admin/api/certificates`               | list all           |
| POST   | `/admin/api/certificates`               | create (multipart: `sku`, `product_name`, `photo`) |
| PUT    | `/admin/api/certificates/:id`           | update (multipart, `photo` optional) |
| DELETE | `/admin/api/certificates/:id`           | delete one         |
| POST   | `/admin/api/certificates/bulk-delete`   | `{ids:[1,2,3]}`    |

## 4. Connecting the existing frontend

Your current frontend page says lookups are done **locally, no server call**
— meaning it's matching against a bundled JSON/array in its own code. To
make it use this backend instead, replace that local-array lookup with a
fetch call, e.g.:

```js
async function verify(query) {
  const res = await fetch(
    `https://your-backend-domain.com/api/certificates/search?q=${encodeURIComponent(query)}`
  );
  const matches = await res.json();
  // matches[0].sku, matches[0].product_name, matches[0].photo_url
}
```

If you'd rather keep it "no server call per search", fetch `/api/certificates`
once on page load and keep matching client-side against that array — same
behavior as today, just backed by your admin panel instead of a hardcoded
list.

> Note: the frontend and this backend are on different domains
> (`sertifikat.zupazupazuu.id` vs wherever you deploy this). You'll need
> CORS enabled for the public endpoints — see the commented `cors` line in
> `server.js`'s middleware section if you add it, or simply serve the
> frontend from this same backend/domain later.

## 5. Deploying to Railway

1. Push this folder to a GitHub repo, then "New Project → Deploy from GitHub"
   in Railway.
2. Set environment variables in Railway's dashboard (Settings → Variables):
   - `ADMIN_USER`
   - `ADMIN_PASS_HASH` (generate locally with `node hash-password.js "..."`)
   - `SESSION_SECRET`
   - `NODE_ENV=production`
3. **Important — persistent storage:** Railway's filesystem is ephemeral by
   default, so `data/` (the SQLite file) and `uploads/` (photos) will be
   wiped on every redeploy/restart unless you attach a **Railway Volume**
   mounted at `/app/data` and another at `/app/uploads` (or one volume
   covering both if you restructure paths). Do this before adding real data.
4. Railway auto-detects `npm start` from `package.json` — no extra config
   needed beyond the volume + env vars.
5. Once deployed, your admin panel is at
   `https://<your-app>.up.railway.app/admin` and the public search endpoint
   is `https://<your-app>.up.railway.app/api/certificates/search?q=...`.

## 6. Security notes

- Change `ADMIN_USER`/`ADMIN_PASS_HASH`/`SESSION_SECRET` before going live —
  never keep the example values.
- Sessions use an in-memory store, which is fine for a single Railway
  instance but resets on restart (admins just log in again) and won't work
  if you later scale to multiple instances — swap to a Redis/DB session
  store if you do.
- File uploads are limited to `.jpg/.jpeg/.png/.webp`, max 8MB.
