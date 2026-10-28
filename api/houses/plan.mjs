import { cors, fail, json, options } from '../../_lib/http.mjs';
import { requireRequestedHouse } from '../../_lib/supabase.mjs';
import { getHousePlan } from '../../_lib/planLimits.mjs';

export default async function handler(req, res) {
  cors(res);
  if (options(req, res)) return;
  if (req.method !== 'GET') return fail(res, 405, 'Método não permitido.');
  try {
    const context = await requireRequestedHouse(req, 'read');
    if (!context) return fail(res, 401, 'Acesso ao plano não autorizado.');
    return json(res, 200, await getHousePlan(context.house.id));
  } catch (error) {
    return fail(res, 500, error instanceof Error ? error.message : 'Erro interno.');
  }
}
