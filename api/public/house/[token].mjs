import { cors, fail, json, options } from '../../_lib/http.mjs';
import { dbFetch, hydrateMedia, resolveShareToken } from '../../_lib/supabase.mjs';

export default async function handler(req, res) {
  cors(res);
  if (options(req, res)) return;
  if (req.method !== 'GET') return fail(res, 405, 'Método não permitido.');
  try {
    const share = await resolveShareToken(req.query?.token);
    if (!share) return fail(res, 404, 'Link do cantinho inválido ou revogado.');
    const lookup = await dbFetch(`houses?id=eq.${encodeURIComponent(share.house_id)}&status=eq.active&published_at=not.is.null&select=id&limit=1`);
    const houses = await lookup.json();
    if (!lookup.ok || !houses[0]) return fail(res, 404, 'O cantinho ainda não foi publicado.');
    const response = await dbFetch(`house_documents?house_id=eq.${encodeURIComponent(share.house_id)}&status=eq.published&select=document&limit=1`);
    const rows = await response.json();
    if (!response.ok || !rows[0]) return fail(res, 404, 'O cantinho ainda não foi publicado.');
    const document = await hydrateMedia(rows[0].document, share.house_id);
    res.setHeader('Set-Cookie', `casinha_share=${encodeURIComponent(share.house_id)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=3600`);
    return json(res, 200, document, { 'cache-control': 'private, no-store', 'x-robots-tag': 'noindex, nofollow' });
  } catch (error) {
    return fail(res, 500, error instanceof Error ? error.message : 'Erro interno.');
  }
}

