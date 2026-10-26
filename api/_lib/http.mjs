export function cors(res) {
  const origin = res.req?.headers?.origin;
  const allowed = process.env.APP_ORIGIN;
  if (origin && (!allowed || origin === allowed)) {
    res.setHeader('access-control-allow-origin', origin);
    res.setHeader('vary', 'Origin');
  }
  res.setHeader('access-control-allow-methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('access-control-allow-headers', 'authorization, content-type');
}

export function options(req, res) {
  if (req.method !== 'OPTIONS') return false;
  res.writeHead(204);
  res.end();
  return true;
}

export function json(res, status, value, extraHeaders = {}) {
  const body = JSON.stringify(value);
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  for (const [name, value] of Object.entries(extraHeaders)) res.setHeader(name, value);
  res.end(body);
}

export async function readJson(req, maxBytes = 10 * 1024 * 1024) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBytes) throw new Error('Payload muito grande.');
    chunks.push(chunk);
  }
  if (!size) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

export function validDocument(document) {
  return Boolean(document && typeof document === 'object' && !Array.isArray(document) && document.schemaVersion === 1 && document.appearance && document.content);
}

export function fail(res, status, message) {
  json(res, status, { error: message });
}
