import { cors, fail, json, options } from '../_lib/http.mjs';
import { dbFetch, getUser } from '../_lib/supabase.mjs';

export default async function handler(req, res) {
  cors(res);
  if (options(req, res)) return;
  if (req.method !== 'GET') return fail(res, 405, 'Método não permitido.');
  const user = await getUser(req);
  if (!user) return fail(res, 401, 'Login necessário.');
  const response = await dbFetch(`house_members?user_id=eq.${encodeURIComponent(user.id)}&select=house_id,role,can_add_text,house:houses(id,name,status)&order=created_at.asc`);
  const rows = await response.json();
  if (!response.ok) return fail(res, 500, 'Não foi possível carregar suas casinhas.');
  return json(res, 200, rows);
}

