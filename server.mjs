import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const root = dirname(fileURLToPath(import.meta.url));
const dataDir = join(root, 'data');
const uploadsDir = join(dataDir, 'uploads');
const dbPath = join(dataDir, 'casinha.sqlite');
const port = Number(process.env.PORT || 3001);
const host = process.env.HOST || '127.0.0.1';
const maxJsonBytes = 100 * 1024 * 1024;
const LOCAL_USER_ID = 'local-user';
const LEGACY_HOUSE_ID = '00000000-0000-0000-0000-000000000001';

await mkdir(uploadsDir, { recursive: true });
const db = new DatabaseSync(dbPath);
db.exec(`
  CREATE TABLE IF NOT EXISTS house_documents (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    draft_json TEXT NOT NULL,
    published_json TEXT NOT NULL,
    draft_updated_at TEXT NOT NULL,
    published_updated_at TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1
  );
  CREATE TABLE IF NOT EXISTS media (
    id TEXT PRIMARY KEY,
    storage_name TEXT NOT NULL,
    original_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS houses (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    owner_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS house_members (
    house_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL,
    can_add_text INTEGER NOT NULL DEFAULT 1,
    PRIMARY KEY (house_id, user_id)
  );
  CREATE TABLE IF NOT EXISTS house_documents_multi (
    house_id TEXT NOT NULL,
    status TEXT NOT NULL,
    document TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    PRIMARY KEY (house_id, status)
  );
`);
try { db.exec('ALTER TABLE media ADD COLUMN house_id TEXT'); } catch { /* já migrada */ }

function now() { return new Date().toISOString(); }
function json(res, status, value) {
  const body = JSON.stringify(value);
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'content-length': Buffer.byteLength(body) });
  res.end(body);
}
function empty(res, status = 204) { res.writeHead(status); res.end(); }
function fail(res, status, message) { json(res, status, { error: message }); }
async function readJson(req) {
  const chunks = []; let length = 0;
  for await (const chunk of req) { length += chunk.length; if (length > maxJsonBytes) throw new Error('Payload muito grande.'); chunks.push(chunk); }
  return length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {};
}
function validDocument(document) { return Boolean(document && typeof document === 'object' && !Array.isArray(document) && document.schemaVersion === 1 && document.appearance && document.content); }
function safeOriginalName(value) { return (typeof value === 'string' ? value : 'upload').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120) || 'upload'; }
function houseIdFromUrl(url) { return url.searchParams.get('house_id') || LEGACY_HOUSE_ID; }
function mediaIdFromPath(pathname) { return decodeURIComponent(pathname.slice('/api/media/'.length).split('/')[0]); }
function documentFromRow(row) { return row ? JSON.parse(row.document) : null; }

const oldDocument = db.prepare('SELECT * FROM house_documents WHERE id = 1').get();
const oldMedia = db.prepare('SELECT COUNT(*) AS count FROM media').get();
const insertHouse = db.prepare('INSERT OR IGNORE INTO houses (id, name, owner_id, status, created_at, updated_at) VALUES (?, ?, ?, \'active\', ?, ?)');
const insertMember = db.prepare('INSERT OR IGNORE INTO house_members (house_id, user_id, role, can_add_text) VALUES (?, ?, \'owner\', 1)');
insertHouse.run(LEGACY_HOUSE_ID, 'Meu cantinho', LOCAL_USER_ID, now(), now());
insertMember.run(LEGACY_HOUSE_ID, LOCAL_USER_ID);
if (oldDocument) {
  const insertLegacy = db.prepare('INSERT OR IGNORE INTO house_documents_multi (house_id, status, document, updated_at) VALUES (?, ?, ?, ?)');
  insertLegacy.run(LEGACY_HOUSE_ID, 'draft', oldDocument.draft_json, oldDocument.draft_updated_at);
  insertLegacy.run(LEGACY_HOUSE_ID, 'published', oldDocument.published_json, oldDocument.published_updated_at);
}
if (oldMedia?.count) db.prepare('UPDATE media SET house_id = COALESCE(house_id, ?)').run(LEGACY_HOUSE_ID);

const statements = {
  house: db.prepare('SELECT * FROM houses WHERE id = ? AND status = \'active\''),
  document: db.prepare('SELECT * FROM house_documents_multi WHERE house_id = ? AND status = ?'),
  insertDocument: db.prepare('INSERT OR REPLACE INTO house_documents_multi (house_id, status, document, updated_at, version) VALUES (?, ?, ?, ?, COALESCE((SELECT version + 1 FROM house_documents_multi WHERE house_id = ? AND status = ?), 1))'),
  saveDraft: db.prepare('UPDATE house_documents_multi SET document = ?, updated_at = ?, version = version + 1 WHERE house_id = ? AND status = \'draft\''),
  publish: db.prepare('INSERT OR REPLACE INTO house_documents_multi (house_id, status, document, updated_at, version) VALUES (?, ?, ?, ?, COALESCE((SELECT version + 1 FROM house_documents_multi WHERE house_id = ? AND status = ?), 1))'),
  media: db.prepare('SELECT * FROM media WHERE id = ? AND house_id = ?'),
  insertMedia: db.prepare('INSERT INTO media (id, house_id, storage_name, original_name, mime_type, size_bytes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'),
  deleteMedia: db.prepare('DELETE FROM media WHERE id = ? AND house_id = ?'),
};

function ensureHouse(houseId) {
  insertHouse.run(houseId, houseId === LEGACY_HOUSE_ID ? 'Meu cantinho' : 'Meu cantinho', LOCAL_USER_ID, now(), now());
  insertMember.run(houseId, LOCAL_USER_ID);
}
function getDocument(houseId, status) { return statements.document.get(houseId, status); }

async function route(req, res) {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const { pathname } = url;
  if (req.method === 'OPTIONS') { res.writeHead(204, { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS', 'access-control-allow-headers': 'content-type' }); return res.end(); }
  const houseId = houseIdFromUrl(url);

  if (pathname === '/api/health' && req.method === 'GET') return json(res, 200, { ok: true, database: 'sqlite', houses: true });
  if (pathname === '/api/house/bootstrap' && (req.method === 'GET' || req.method === 'POST')) {
    ensureHouse(houseId);
    const existing = getDocument(houseId, 'published');
    if (existing) return json(res, 200, documentFromRow(existing));
    if (req.method === 'GET') return fail(res, 404, 'A publicação ainda não foi inicializada.');
    const body = await readJson(req); if (!validDocument(body.document)) return fail(res, 400, 'Documento inicial inválido.');
    const timestamp = now();
    statements.insertDocument.run(houseId, 'draft', JSON.stringify(body.document), timestamp, houseId, 'draft');
    statements.insertDocument.run(houseId, 'published', JSON.stringify(body.document), timestamp, houseId, 'published');
    return json(res, 201, body.document);
  }
  if (pathname === '/api/house/draft' && (req.method === 'GET' || req.method === 'PUT')) {
    ensureHouse(houseId);
    if (req.method === 'GET') { const row = getDocument(houseId, 'draft'); return row ? json(res, 200, documentFromRow(row)) : fail(res, 404, 'O rascunho ainda não foi inicializado.'); }
    const body = await readJson(req); if (!validDocument(body.document)) return fail(res, 400, 'Documento inválido.');
    const timestamp = now(); const serialized = JSON.stringify({ ...body.document, updatedAt: timestamp });
    if (!getDocument(houseId, 'draft')) statements.insertDocument.run(houseId, 'draft', serialized, timestamp, houseId, 'draft');
    else statements.saveDraft.run(serialized, timestamp, houseId);
    return json(res, 200, JSON.parse(serialized));
  }
  if (pathname === '/api/house/publish' && req.method === 'POST') {
    ensureHouse(houseId);
    const body = await readJson(req); if (!validDocument(body.document)) return fail(res, 400, 'Documento inválido.');
    const timestamp = now(); const serialized = JSON.stringify({ ...body.document, updatedAt: timestamp });
    statements.publish.run(houseId, 'draft', serialized, timestamp, houseId, 'draft');
    statements.publish.run(houseId, 'published', serialized, timestamp, houseId, 'published');
    return json(res, 200, JSON.parse(serialized));
  }
  if (pathname === '/api/media' && req.method === 'POST') {
    ensureHouse(houseId); const body = await readJson(req);
    if (typeof body.data !== 'string' || !body.data) return fail(res, 400, 'Arquivo ausente.');
    const buffer = Buffer.from(body.data, 'base64'); if (buffer.length > 50 * 1024 * 1024) return fail(res, 413, 'O arquivo excede o limite de 50 MB.');
    const id = randomUUID(); const originalName = safeOriginalName(body.name); const extension = extname(originalName).replace(/[^a-zA-Z0-9.]/g, '').slice(0, 10); const storageName = `${id}${extension}`; const target = join(uploadsDir, storageName);
    await writeFile(target, buffer, { flag: 'wx' });
    statements.insertMedia.run(id, houseId, storageName, originalName, typeof body.type === 'string' ? body.type : 'application/octet-stream', buffer.length, now());
    return json(res, 201, { ref: `media:${id}@${houseId}` });
  }
  if (pathname.startsWith('/api/media/') && (req.method === 'GET' || req.method === 'HEAD')) {
    const id = mediaIdFromPath(pathname); const media = statements.media.get(id, houseId);
    if (!media) return fail(res, 404, 'Arquivo não encontrado.'); const target = normalize(join(uploadsDir, media.storage_name));
    if (!target.startsWith(normalize(uploadsDir)) || !existsSync(target)) return fail(res, 404, 'Arquivo não encontrado.');
    const file = await readFile(target); res.writeHead(200, { 'content-type': media.mime_type, 'content-length': file.length, 'cache-control': 'public, max-age=31536000, immutable' }); return req.method === 'HEAD' ? res.end() : res.end(file);
  }
  if (pathname.startsWith('/api/media/') && req.method === 'DELETE') {
    const id = mediaIdFromPath(pathname); const media = statements.media.get(id, houseId); if (!media) return empty(res);
    await unlink(join(uploadsDir, media.storage_name)).catch(() => undefined); statements.deleteMedia.run(id, houseId); return empty(res);
  }
  return fail(res, 404, 'Rota não encontrada.');
}

const server = createServer(async (req, res) => { res.setHeader('access-control-allow-origin', '*'); try { await route(req, res); } catch (error) { console.error(error); if (!res.headersSent) fail(res, 500, 'Erro interno do servidor.'); else res.destroy(); } });
server.listen(port, host, () => { console.log(`Cantinho API em http://${host}:${port}`); console.log(`Banco SQLite multi-casa: ${dbPath}`); console.log(`Uploads: ${uploadsDir}`); });
