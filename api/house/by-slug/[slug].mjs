import { cors, fail, json, options } from '../../_lib/http.mjs';
import { dbFetch, hydrateMedia, requireSlugHouse } from '../../_lib/supabase.mjs';

function slugFromRequest(req) {
  const value = req.query?.slug;
  if (typeof value === 'string') return value;
  return decodeURIComponent(new URL(req.url || '/', 'http://localhost').pathname.split('/').pop() || '');
}

export default async function handler(req, res) {
  cors(res);
  if (options(req, res)) return;
  if (req.method !== 'GET') return fail(res, 405, 'Método não permitido.');
  try {
    const context = await requireSlugHouse(req, slugFromRequest(req), 'read');
    if (!context) return fail(res, 404, 'Cantinho não encontrado.');
    const response = await dbFetch(`house_documents?house_id=eq.${encodeURIComponent(context.house.id)}&status=eq.published&select=document&limit=1`);
    const rows = await response.json().catch(() => []);
    if (!response.ok || !rows[0]) return fail(res, 404, 'O cantinho ainda não foi publicado.');
    return json(res, 200, await hydrateMedia(rows[0].document, context.house.id), { 'cache-control': 'private, no-store', 'x-robots-tag': 'noindex, nofollow' });
  } catch (error) {
    return fail(res, 500, error instanceof Error ? error.message : 'Erro interno.');
  }
}
