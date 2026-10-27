import { cors, fail, options } from '../../_lib/http.mjs';
import { dbFetch, requireRequestedHouse } from '../../_lib/supabase.mjs';

export default async function handler(req, res) {
  cors(res);
  if (options(req, res)) return;
  if (req.method !== 'DELETE') return fail(res, 405, 'Método não permitido.');
  const context = await requireRequestedHouse(req, 'owner');
  if (!context) return fail(res, 401, 'Apenas o dono pode revogar links.');
  const id = req.query?.id;
  if (typeof id !== 'string') return fail(res, 400, 'Link inválido.');
  const response = await dbFetch(`house_share_links?id=eq.${encodeURIComponent(id)}&house_id=eq.${encodeURIComponent(context.house.id)}`, { method: 'PATCH', body: JSON.stringify({ revoked_at: new Date().toISOString() }) });
  if (!response.ok) return fail(res, 500, 'Não foi possível revogar o link.');
  res.writeHead(204);
  return res.end();
}
