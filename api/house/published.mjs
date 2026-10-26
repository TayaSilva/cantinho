import { cors, fail, json, options } from '../_lib/http.mjs';
import { HOUSE_ID, assertConfig, dbFetch } from '../_lib/supabase.mjs';

export default async function handler(req, res) {
  cors(res);
  if (options(req, res)) return;
  if (req.method !== 'GET') return fail(res, 405, 'Método não permitido.');
  try {
    assertConfig();
    const response = await dbFetch(`house_documents?house_id=eq.${HOUSE_ID}&status=eq.published&select=document&limit=1`);
    const rows = await response.json();
    if (!response.ok) return fail(res, 500, 'Não foi possível consultar a casa.');
    if (!rows[0]) return fail(res, 404, 'A casinha ainda não foi inicializada.');
    return json(res, 200, rows[0].document);
  } catch (error) {
    return fail(res, 500, error instanceof Error ? error.message : 'Erro interno.');
  }
}
