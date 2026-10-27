import { createHash, randomBytes } from 'node:crypto';

const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const BUCKET = process.env.SUPABASE_BUCKET || 'casinha-media';

export function assertConfig() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) throw new Error('Supabase não está configurado nas variáveis da Vercel.');
}

function headers(initHeaders, key) {
  const result = new Headers(initHeaders);
  result.set('apikey', key);
  result.set('Authorization', `Bearer ${key}`);
  if (!result.has('content-type')) result.set('content-type', 'application/json');
  return result;
}

export function dbFetch(path, init = {}) {
  assertConfig();
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...init, headers: headers(init.headers, SUPABASE_SERVICE_ROLE_KEY) });
}

export function storageFetch(path, init = {}) {
  assertConfig();
  return fetch(`${SUPABASE_URL}/storage/v1/${path}`, { ...init, headers: headers(init.headers, SUPABASE_SERVICE_ROLE_KEY) });
}

export async function getUser(req) {
  assertConfig();
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith('Bearer ')) return null;
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: SUPABASE_ANON_KEY, Authorization: authorization } });
  return response.ok ? response.json() : null;
}

export async function getHouseForUser(userId, houseId) {
  const filter = houseId ? `id=eq.${encodeURIComponent(houseId)}` : `owner_id=eq.${encodeURIComponent(userId)}`;
  const response = await dbFetch(`houses?${filter}&status=eq.active&select=id,owner_id,name&limit=1`);
  const rows = await response.json();
  if (!response.ok || !rows[0]) return null;
  const member = await dbFetch(`house_members?house_id=eq.${encodeURIComponent(rows[0].id)}&user_id=eq.${encodeURIComponent(userId)}&select=role,can_add_text&limit=1`);
  const members = await member.json();
  if (!member.ok || !members[0]) return null;
  return { house: rows[0], membership: members[0] };
}

export async function requireHouse(req, houseId, permission = 'read') {
  const user = await getUser(req);
  if (!user || !(user.email_confirmed_at || user.confirmed_at)) return null;
  const context = await getHouseForUser(user.id, houseId);
  if (!context) return null;
  const allowed = permission === 'owner' ? context.membership.role === 'owner' : permission === 'text' ? context.membership.role === 'owner' || context.membership.can_add_text : true;
  return allowed ? { user, ...context } : null;
}

export function requestedHouseId(req) {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  return url.searchParams.get('house_id') || '';
}

export async function requireRequestedHouse(req, permission = 'read') {
  const houseId = requestedHouseId(req);
  if (!houseId) return null;
  return requireHouse(req, houseId, permission);
}

export async function requireDefaultHouse(req, permission = 'read') {
  const user = await getUser(req);
  if (!user) return null;
  const response = await dbFetch(`house_members?user_id=eq.${encodeURIComponent(user.id)}&select=house_id,role,can_add_text&order=created_at.asc&limit=1`);
  const rows = await response.json();
  if (!response.ok || !rows[0]) return null;
  const context = await getHouseForUser(user.id, rows[0].house_id);
  if (!context) return null;
  const allowed = permission === 'owner' ? rows[0].role === 'owner' : permission === 'text' ? rows[0].role === 'owner' || rows[0].can_add_text : true;
  return allowed ? { user, ...context } : null;
}

export const MAX_HOUSES_PER_USER = Number(process.env.MAX_HOUSES_PER_USER || 5);

/** Atualiza os carimbos da casa: updated_at = último rascunho, published_at = última publicação. */
export async function touchHouse(houseId, fields) {
  const response = await dbFetch(`houses?id=eq.${encodeURIComponent(houseId)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(fields) });
  if (!response.ok) throw new Error(await response.text());
}

export function tokenHash(token) {
  return createHash('sha256').update(token).digest('hex');
}

export async function createShareToken(houseId, userId) {
  const token = randomBytes(32).toString('base64url');
  const response = await dbFetch('house_share_links', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify([{ house_id: houseId, token_hash: tokenHash(token), created_by: userId }]),
  });
  if (!response.ok) throw new Error(await response.text());
  return token;
}

export async function resolveShareToken(token) {
  if (!token || token.length < 32) return null;
  const response = await dbFetch(`house_share_links?token_hash=eq.${encodeURIComponent(tokenHash(token))}&revoked_at=is.null&select=id,house_id,expires_at&limit=1`);
  const rows = await response.json();
  if (!response.ok || !rows[0] || (rows[0].expires_at && new Date(rows[0].expires_at) <= new Date())) return null;
  return rows[0];
}

export async function upsertDocuments(documents) {
  const response = await dbFetch('house_documents?on_conflict=house_id,status', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=representation' }, body: JSON.stringify(documents) });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

export async function signedUrl(path, expiresIn = 3600) {
  const encoded = path.split('/').map((part) => encodeURIComponent(part)).join('/');
  const response = await storageFetch(`object/sign/${BUCKET}/${encoded}`, { method: 'POST', body: JSON.stringify({ expiresIn }) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || typeof data.signedURL !== 'string') throw new Error('Não foi possível gerar a URL temporária da mídia.');
  return data.signedURL.startsWith('http') ? data.signedURL : `${SUPABASE_URL}/storage/v1${data.signedURL}`;
}

export async function hydrateMedia(document, houseId) {
  const response = await dbFetch(`media?house_id=eq.${encodeURIComponent(houseId)}&select=id,storage_path`);
  const rows = await response.json();
  if (!response.ok) throw new Error('Não foi possível consultar as mídias.');
  const urls = new Map(await Promise.all(rows.map(async (row) => [row.id, await signedUrl(row.storage_path)])));
  const visit = (value) => {
    if (typeof value === 'string' && value.startsWith('media:')) return urls.get(value.slice(6).split('@')[0]) || value;
    if (Array.isArray(value)) return value.map(visit);
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, visit(item)]));
    return value;
  };
  return visit(document);
}
