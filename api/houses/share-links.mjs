import { cors, fail, json, options } from '../_lib/http.mjs';
import { createShareToken, requireDefaultHouse } from '../_lib/supabase.mjs';

export default async function handler(req, res) {
  cors(res);
  if (options(req, res)) return;
  if (req.method !== 'POST') return fail(res, 405, 'Método não permitido.');
  const context = await requireDefaultHouse(req, 'owner');
  if (!context) return fail(res, 401, 'Apenas o dono pode criar links.');
  try {
    const token = await createShareToken(context.house.id, context.user.id);
    return json(res, 201, { token });
  } catch (error) {
    return fail(res, 500, error instanceof Error ? error.message : 'Não foi possível criar o link.');
  }
}

