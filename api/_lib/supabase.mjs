const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const HOUSE_ID = process.env.CASINHA_ID || '00000000-0000-0000-0000-000000000001';
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

export async function requireAdmin(req) {
  assertConfig();
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith('Bearer ')) return null;
  const userResponse = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: authorization },
  });
  if (!userResponse.ok) return null;
  const user = await userResponse.json();
  const adminResponse = await dbFetch(`admin_users?user_id=eq.${encodeURIComponent(user.id)}&select=user_id&limit=1`);
  if (!adminResponse.ok || (await adminResponse.json()).length === 0) return null;
  return user;
}

export async function upsertDocuments(documents) {
  const response = await dbFetch('house_documents?on_conflict=house_id,status', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify(documents),
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

export function storagePublicUrl(path) {
  const encodedPath = path.split('/').map((part) => encodeURIComponent(part)).join('/');
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${encodedPath}`;
}
