import { cors, fail, json, options } from '../_lib/http.mjs';
import { dbFetch, getUser, tokenHash } from '../_lib/supabase.mjs';

export default async function handler(req, res) {
  cors(res);
  if (options(req, res)) return;
  if (req.method !== 'POST') return fail(res, 405, 'Método não permitido.');
  const user = await getUser(req);
  if (!user) return fail(res, 401, 'Faça login para aceitar o convite.');
  const token = req.query?.token;
  if (typeof token !== 'string') return fail(res, 400, 'Convite inválido.');
  const lookup = await dbFetch(`house_invitations?token_hash=eq.${encodeURIComponent(tokenHash(token))}&accepted_at=is.null&select=id,house_id,email,expires_at&limit=1`);
  const rows = await lookup.json();
  const invite = rows[0];
  if (!lookup.ok || !invite || new Date(invite.expires_at) <= new Date() || String(user.email || '').toLowerCase() !== String(invite.email).toLowerCase()) return fail(res, 404, 'Convite inválido, expirado ou destinado a outro e-mail.');
  const member = await dbFetch('house_members', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify([{ house_id: invite.house_id, user_id: user.id, role: 'guest', can_add_text: true }]) });
  if (!member.ok) return fail(res, 500, 'Não foi possível vincular a conta ao cantinho.');
  await dbFetch(`house_invitations?id=eq.${encodeURIComponent(invite.id)}`, { method: 'PATCH', body: JSON.stringify({ accepted_at: new Date().toISOString() }) });
  return json(res, 200, { ok: true, houseId: invite.house_id });
}
