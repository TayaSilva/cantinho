import { cors, fail, options } from '../_lib/http.mjs';
import { BUCKET, dbFetch, requireDefaultHouse, signedUrl, storageFetch } from '../_lib/supabase.mjs';

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
    const context = await requireDefaultHouse(req, req.method === 'DELETE' ? 'owner' : 'read');
    if (!context) return fail(res, 401, 'Acesso à mídia não autorizado.');
    const lookup = await dbFetch(`media?id=eq.${encodeURIComponent(id)}&house_id=eq.${context.house.id}&select=storage_path&limit=1`);
    const rows = await lookup.json();
    if (!lookup.ok || !rows[0]) return fail(res, 404, 'Arquivo não encontrado.');
    if (req.method === 'GET' || req.method === 'HEAD') {
      const url = await signedUrl(rows[0].storage_path);
      res.writeHead(307, { Location: url, 'cache-control': 'private, max-age=300' });
      return res.end();
    }
    if (req.method !== 'DELETE') return fail(res, 405, 'Método não permitido.');
    await storageFetch(`object/${BUCKET}`, { method: 'DELETE', body: JSON.stringify({ prefixes: [rows[0].storage_path] }) });
    const deleted = await dbFetch(`media?id=eq.${encodeURIComponent(id)}&house_id=eq.${context.house.id}`, { method: 'DELETE' });
    if (!deleted.ok) return fail(res, 500, 'Não foi possível remover a mídia.');
    res.writeHead(204);
    return res.end();
  } catch (error) {
    return fail(res, 500, error instanceof Error ? error.message : 'Erro no bucket.');
  }
}

