import { cors, fail, json, options } from '../_lib/http.mjs';
import { BUCKET, HOUSE_ID, dbFetch, storageFetch, storagePublicUrl, requireAdmin } from '../_lib/supabase.mjs';

function idFromRequest(req) {
  const value = req.query?.id;
  if (typeof value === 'string') return value;
  return new URL(req.url || '/', 'http://localhost').pathname.split('/').pop() || '';
}

export default async function handler(req, res) {
  cors(res);
  if (options(req, res)) return;
  const id = idFromRequest(req);
  if (!/^[0-9a-f-]{36}$/i.test(id)) return fail(res, 400, 'Mídia inválida.');
  try {
    const lookup = await dbFetch(`media?id=eq.${encodeURIComponent(id)}&house_id=eq.${HOUSE_ID}&select=storage_path,mime_type&limit=1`);
    const rows = await lookup.json();
    if (!lookup.ok || !rows[0]) return fail(res, 404, 'Arquivo não encontrado.');
    const media = rows[0];
    if (req.method === 'GET' || req.method === 'HEAD') {
      res.writeHead(307, { Location: storagePublicUrl(media.storage_path), 'cache-control': 'public, max-age=3600' });
      return res.end();
    }
    if (req.method !== 'DELETE') return fail(res, 405, 'Método não permitido.');
    const user = await requireAdmin(req);
    if (!user) return fail(res, 401, 'Acesso de administrador necessário.');
    await storageFetch(`object/remove`, { method: 'POST', body: JSON.stringify({ prefixes: [media.storage_path] }) });
    const deleted = await dbFetch(`media?id=eq.${encodeURIComponent(id)}&house_id=eq.${HOUSE_ID}`, { method: 'DELETE' });
    if (!deleted.ok) return fail(res, 500, 'Não foi possível remover a mídia.');
    return json(res, 200, { ok: true });
  } catch (error) {
    return fail(res, 500, error instanceof Error ? error.message : `Erro no bucket ${BUCKET}.`);
  }
}
