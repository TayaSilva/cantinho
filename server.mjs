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
const MB = 1024 * 1024;
const FREE_LIMITS = { storageMb: 20, photos: 5, videos: 0, audios: 1, letters: 1, chestTexts: 1, characters: 2, pets: 0, radio: false, tv: false };

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
  CREATE TABLE IF NOT EXISTS house_plans (
    house_id TEXT PRIMARY KEY,
    plan_type TEXT NOT NULL DEFAULT 'free',
    status TEXT NOT NULL DEFAULT 'active',
    started_at TEXT NOT NULL,
    expires_at TEXT,
    deletion_at TEXT
  );
  CREATE TABLE IF NOT EXISTS legacy_entitlements (
    house_id TEXT PRIMARY KEY,
    preserved_storage_bytes INTEGER NOT NULL DEFAULT 0,
    preserved_photos INTEGER NOT NULL DEFAULT 0,
    preserved_videos INTEGER NOT NULL DEFAULT 0,
    preserved_audios INTEGER NOT NULL DEFAULT 0,
    preserved_letters INTEGER NOT NULL DEFAULT 0,
    preserved_chest_texts INTEGER NOT NULL DEFAULT 0,
    preserved_characters INTEGER NOT NULL DEFAULT 2,
    preserved_pet INTEGER NOT NULL DEFAULT 0,
    preserved_radio INTEGER NOT NULL DEFAULT 0,
    preserved_tv INTEGER NOT NULL DEFAULT 0
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
function documentUsage(document) {
  const appearance = document?.appearance || {}; const content = document?.content || {};
  return {
    photos: Array.isArray(content.photos) ? content.photos.length : 0,
    videos: Array.isArray(content.videos) ? content.videos.length : 0,
    audios: Array.isArray(content.playlist?.tracks) ? content.playlist.tracks.length : 0,
    letters: Array.isArray(content.letters) ? content.letters.length : 0,
    chestTexts: Array.isArray(content.chestMessages) ? content.chestMessages.filter((item) => item?.text?.trim()).length : 0,
    characters: Array.isArray(appearance.characters) ? appearance.characters.filter((item) => item?.enabled !== false).length : 0,
    pets: appearance.pet?.enabled ? 1 : 0,
    radio: appearance.furniture?.radio ? (appearance.furniture.radio.visible === false ? 0 : 1) : 0,
    tv: appearance.furniture?.tv ? (appearance.furniture.tv.visible === false ? 0 : 1) : 0,
  };
}
function mediaIds(document) {
  const ids = new Set(); const visit = (value) => {
    if (typeof value === 'string' && value.startsWith('media:')) { ids.add(value.slice(6).split('@')[0]); return; }
    if (Array.isArray(value)) value.forEach(visit); else if (value && typeof value === 'object') Object.values(value).forEach(visit);
  }; visit(document); return ids;
}
function localLimits(houseId) {
  const legacy = db.prepare('SELECT * FROM legacy_entitlements WHERE house_id = ?').get(houseId);
  return {
    ...FREE_LIMITS,
    storageMb: Math.max(FREE_LIMITS.storageMb * MB, Number(legacy?.preserved_storage_bytes || 0)) / MB,
    photos: Math.max(FREE_LIMITS.photos, Number(legacy?.preserved_photos || 0)),
    videos: Math.max(FREE_LIMITS.videos, Number(legacy?.preserved_videos || 0)),
    audios: Math.max(FREE_LIMITS.audios, Number(legacy?.preserved_audios || 0)),
    letters: Math.max(FREE_LIMITS.letters, Number(legacy?.preserved_letters || 0)),
    chestTexts: Math.max(FREE_LIMITS.chestTexts, Number(legacy?.preserved_chest_texts || 0)),
    characters: Math.max(FREE_LIMITS.characters, Number(legacy?.preserved_characters || 0)),
    pets: FREE_LIMITS.pets || legacy?.preserved_pet ? 1 : 0,
    radio: FREE_LIMITS.radio || Boolean(legacy?.preserved_radio),
    tv: FREE_LIMITS.tv || Boolean(legacy?.preserved_tv),
  };
}
function freeDocument(document) {
  const next = structuredClone(document); next.appearance.furniture.radio.visible = false; next.appearance.furniture.tv.visible = false; next.appearance.pet.enabled = false; next.appearance.characters[2].enabled = false; next.appearance.characters[3].enabled = false; return next;
}

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
  const timestamp = now();
  db.prepare('INSERT OR IGNORE INTO house_plans (house_id, plan_type, status, started_at, expires_at) VALUES (?, \'free\', \'active\', ?, ?)').run(houseId, timestamp, new Date(Date.now() + 30 * 86_400_000).toISOString());
  if (!db.prepare('SELECT 1 FROM legacy_entitlements WHERE house_id = ?').get(houseId)) {
    const published = getDocument(houseId, 'published'); const usage = documentUsage(published ? documentFromRow(published) : null);
    const storage = db.prepare('SELECT COALESCE(SUM(size_bytes), 0) AS total FROM media WHERE house_id = ?').get(houseId)?.total || 0;
    db.prepare('INSERT INTO legacy_entitlements (house_id, preserved_storage_bytes, preserved_photos, preserved_videos, preserved_audios, preserved_letters, preserved_chest_texts, preserved_characters, preserved_pet, preserved_radio, preserved_tv) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(houseId, storage, usage.photos, usage.videos, usage.audios, usage.letters, usage.chestTexts, Math.max(2, usage.characters), usage.pets, usage.radio, usage.tv);
  }
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
    const initial = freeDocument(body.document);
    statements.insertDocument.run(houseId, 'draft', JSON.stringify(initial), timestamp, houseId, 'draft');
    statements.insertDocument.run(houseId, 'published', JSON.stringify(initial), timestamp, houseId, 'published');
    return json(res, 201, initial);
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
    const candidate = body.document; const plan = db.prepare('SELECT * FROM house_plans WHERE house_id = ?').get(houseId); const limits = localLimits(houseId); const usage = documentUsage(candidate);
    if (plan?.status !== 'active' || (plan?.expires_at && new Date(plan.expires_at) <= new Date())) return json(res, 409, { error: 'O plano deste cantinho não está ativo.', code: 'PLAN_INACTIVE', details: { status: 'expired', limits } });
    const mediaRows = db.prepare('SELECT id, size_bytes FROM media WHERE house_id = ?').all(houseId); const refs = mediaIds(candidate);
    const projectedBytes = mediaRows.reduce((sum, row) => sum + (refs.has(row.id) ? row.size_bytes : 0), 0);
    const issues = Object.entries({ photos: usage.photos, videos: usage.videos, audios: usage.audios, letters: usage.letters, chestTexts: usage.chestTexts, characters: usage.characters }).filter(([key, value]) => value > limits[key]).map(([key, used]) => ({ key, label: key, used, limit: limits[key] }));
    if (usage.pets > limits.pets) issues.push({ key: 'pet', label: 'Pet', used: usage.pets, limit: limits.pets });
    if (usage.radio && !limits.radio) issues.push({ key: 'radio', label: 'Rádio', used: 1, limit: 0 });
    if (usage.tv && !limits.tv) issues.push({ key: 'tv', label: 'TV', used: 1, limit: 0 });
    if (projectedBytes > limits.storageMb * MB) issues.push({ key: 'storage', label: 'Armazenamento', used: projectedBytes, limit: limits.storageMb * MB });
    if (issues.length) return json(res, 409, { error: 'A publicação excede os limites do plano.', code: 'PLAN_LIMITS', details: { issues, usage, limits, storage: { usedBytes: mediaRows.reduce((sum, row) => sum + row.size_bytes, 0), projectedBytes, limitBytes: limits.storageMb * MB } } });
    const timestamp = now(); const serialized = JSON.stringify({ ...candidate, updatedAt: timestamp });
    if (body.preserveDraft !== true) statements.publish.run(houseId, 'draft', serialized, timestamp, houseId, 'draft');
    statements.publish.run(houseId, 'published', serialized, timestamp, houseId, 'published');
    return json(res, 200, JSON.parse(serialized));
  }
  if (pathname === '/api/media' && req.method === 'POST') {
    ensureHouse(houseId); const body = await readJson(req);
    if (typeof body.data !== 'string' || !body.data) return fail(res, 400, 'Arquivo ausente.');
    const buffer = Buffer.from(body.data, 'base64'); if (buffer.length > 50 * 1024 * 1024) return fail(res, 413, 'O arquivo excede o limite de 50 MB.');
    const id = randomUUID(); const originalName = safeOriginalName(body.name); const extension = extname(originalName).replace(/[^a-zA-Z0-9.]/g, '').slice(0, 10); const storageName = `${id}${extension}`; const target = join(uploadsDir, storageName);
    await writeFile(target, buffer, { flag: 'wx' });
    const plan = db.prepare('SELECT * FROM house_plans WHERE house_id = ?').get(houseId);
    if (plan?.status !== 'active' || (plan?.expires_at && new Date(plan.expires_at) <= new Date())) { await unlink(target).catch(() => undefined); return fail(res, 409, 'O plano deste cantinho não está ativo.'); }
    const limits = localLimits(houseId); const used = db.prepare('SELECT COALESCE(SUM(size_bytes), 0) AS total FROM media WHERE house_id = ?').get(houseId)?.total || 0;
    if (used + buffer.length > Math.max(limits.storageMb, 100) * MB) { await unlink(target).catch(() => undefined); return fail(res, 413, 'O limite de armazenamento deste cantinho foi atingido.'); }
    statements.insertMedia.run(id, houseId, storageName, originalName, typeof body.type === 'string' ? body.type : 'application/octet-stream', buffer.length, now());
    return json(res, 201, { ref: `media:${id}@${houseId}` });
  }
  if (pathname === '/api/houses/plan' && req.method === 'GET') {
    ensureHouse(houseId); const plan = db.prepare('SELECT * FROM house_plans WHERE house_id = ?').get(houseId); const status = plan?.status !== 'active' || (plan?.expires_at && new Date(plan.expires_at) <= new Date()) ? 'expired' : 'active'; const limits = localLimits(houseId); const storageUsedBytes = db.prepare('SELECT COALESCE(SUM(size_bytes), 0) AS total FROM media WHERE house_id = ?').get(houseId)?.total || 0;
    return json(res, 200, { houseId, planId: plan?.plan_type || 'free', status, startedAt: plan?.started_at || null, expiresAt: plan?.expires_at || null, deletionAt: plan?.deletion_at || null, storageUsedBytes, limits, payments: [] });
  }
  // Pagamentos só existem na API da Vercel (Mercado Pago + Supabase).
  if (pathname.startsWith('/api/payments/')) return fail(res, 503, 'Pagamentos indisponíveis no backend local.');
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
