import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile, unlink } from 'node:fs/promises';
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
`);

const statements = {
  document: db.prepare('SELECT * FROM house_documents WHERE id = 1'),
  insertDocument: db.prepare(`
    INSERT INTO house_documents (id, draft_json, published_json, draft_updated_at, published_updated_at, version)
    VALUES (1, ?, ?, ?, ?, 1)
  `),
  saveDraft: db.prepare(`
    UPDATE house_documents
    SET draft_json = ?, draft_updated_at = ?, version = version + 1
    WHERE id = 1
  `),
  publish: db.prepare(`
    UPDATE house_documents
    SET draft_json = ?, published_json = ?, draft_updated_at = ?, published_updated_at = ?, version = version + 1
    WHERE id = 1
  `),
  media: db.prepare('SELECT * FROM media WHERE id = ?'),
  insertMedia: db.prepare(`
    INSERT INTO media (id, storage_name, original_name, mime_type, size_bytes, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `),
  deleteMedia: db.prepare('DELETE FROM media WHERE id = ?'),
};

function now() {
  return new Date().toISOString();
}

function json(res, status, value) {
  const body = JSON.stringify(value);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(body),
  });
  res.end(body);
}

function empty(res, status = 204) {
  res.writeHead(status);
  res.end();
}

function fail(res, status, message) {
  json(res, status, { error: message });
}

async function readJson(req) {
  const chunks = [];
  let length = 0;
  for await (const chunk of req) {
    length += chunk.length;
    if (length > maxJsonBytes) throw new Error('Payload muito grande.');
    chunks.push(chunk);
  }
  if (!length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function documentFromRow(row, field) {
  return row ? JSON.parse(row[field]) : null;
}

function validateDocument(document) {
  return Boolean(document && typeof document === 'object' && !Array.isArray(document) && document.schemaVersion === 1 && document.appearance && document.content);
}

function safeOriginalName(value) {
  const name = typeof value === 'string' ? value : 'upload';
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120) || 'upload';
}

function mediaIdFromPath(pathname) {
  return decodeURIComponent(pathname.slice('/api/media/'.length).split('/')[0]);
}

async function route(req, res) {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const { pathname } = url;

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'access-control-allow-headers': 'content-type',
    });
    return res.end();
  }

  if (pathname === '/api/health' && req.method === 'GET') {
    return json(res, 200, { ok: true, database: 'sqlite' });
  }

  if (pathname === '/api/house/published' && req.method === 'GET') {
    const row = statements.document.get();
    return row ? json(res, 200, documentFromRow(row, 'published_json')) : fail(res, 404, 'A casinha ainda não foi inicializada.');
  }

  if (pathname === '/api/house/draft' && req.method === 'GET') {
    const row = statements.document.get();
    return row ? json(res, 200, documentFromRow(row, 'draft_json')) : fail(res, 404, 'A casinha ainda não foi inicializada.');
  }

  if (pathname === '/api/house/bootstrap' && req.method === 'POST') {
    const row = statements.document.get();
    if (row) return json(res, 200, documentFromRow(row, 'published_json'));
    const body = await readJson(req);
    if (!validateDocument(body.document)) return fail(res, 400, 'Documento inicial inválido.');
    const timestamp = now();
    statements.insertDocument.run(JSON.stringify(body.document), JSON.stringify(body.document), timestamp, timestamp);
    return json(res, 201, body.document);
  }

  if (pathname === '/api/house/draft' && req.method === 'PUT') {
    const body = await readJson(req);
    if (!validateDocument(body.document)) return fail(res, 400, 'Documento inválido.');
    if (!statements.document.get()) return fail(res, 404, 'A casinha ainda não foi inicializada.');
    const saved = { ...body.document, updatedAt: now() };
    statements.saveDraft.run(JSON.stringify(saved), saved.updatedAt);
    return json(res, 200, saved);
  }

  if (pathname === '/api/house/publish' && req.method === 'POST') {
    const body = await readJson(req);
    if (!validateDocument(body.document)) return fail(res, 400, 'Documento inválido.');
    if (!statements.document.get()) return fail(res, 404, 'A casinha ainda não foi inicializada.');
    const saved = { ...body.document, updatedAt: now() };
    const serialized = JSON.stringify(saved);
    statements.publish.run(serialized, serialized, saved.updatedAt, saved.updatedAt);
    return json(res, 200, saved);
  }

  if (pathname === '/api/media' && req.method === 'POST') {
    const body = await readJson(req);
    if (typeof body.data !== 'string' || body.data.length === 0) return fail(res, 400, 'Arquivo ausente.');
    const buffer = Buffer.from(body.data, 'base64');
    if (buffer.length > 50 * 1024 * 1024) return fail(res, 413, 'O arquivo excede o limite de 50 MB.');
    const id = randomUUID();
    const originalName = safeOriginalName(body.name);
    const extension = extname(originalName).replace(/[^a-zA-Z0-9.]/g, '').slice(0, 10);
    const storageName = `${id}${extension}`;
    const target = join(uploadsDir, storageName);
    await writeFile(target, buffer, { flag: 'wx' });
    statements.insertMedia.run(id, storageName, originalName, typeof body.type === 'string' ? body.type : 'application/octet-stream', buffer.length, now());
    return json(res, 201, { ref: `media:${id}` });
  }

  if (pathname.startsWith('/api/media/') && (req.method === 'GET' || req.method === 'HEAD')) {
    const id = mediaIdFromPath(pathname);
    const media = statements.media.get(id);
    if (!media) return fail(res, 404, 'Arquivo não encontrado.');
    const target = normalize(join(uploadsDir, media.storage_name));
    if (!target.startsWith(normalize(uploadsDir)) || !existsSync(target)) return fail(res, 404, 'Arquivo não encontrado.');
    const file = await readFile(target);
    res.writeHead(200, {
      'content-type': media.mime_type,
      'content-length': file.length,
      'cache-control': 'public, max-age=31536000, immutable',
    });
    return req.method === 'HEAD' ? res.end() : res.end(file);
  }

  if (pathname.startsWith('/api/media/') && req.method === 'DELETE') {
    const id = mediaIdFromPath(pathname);
    const media = statements.media.get(id);
    if (!media) return empty(res);
    await unlink(join(uploadsDir, media.storage_name)).catch(() => undefined);
    statements.deleteMedia.run(id);
    return empty(res);
  }

  return fail(res, 404, 'Rota não encontrada.');
}

const server = createServer(async (req, res) => {
  res.setHeader('access-control-allow-origin', '*');
  try {
    await route(req, res);
  } catch (error) {
    console.error(error);
    if (!res.headersSent) fail(res, 500, 'Erro interno do servidor.');
    else res.destroy();
  }
});

server.listen(port, host, () => {
  console.log(`Casinha API em http://${host}:${port}`);
  console.log(`Banco SQLite: ${dbPath}`);
  console.log(`Uploads: ${uploadsDir}`);
});
