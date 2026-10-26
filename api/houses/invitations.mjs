import { randomBytes } from 'node:crypto';
import { cors, fail, json, options, readJson } from '../_lib/http.mjs';
import { dbFetch, requireDefaultHouse, tokenHash } from '../_lib/supabase.mjs';

export default async function handler(req, res) {
  cors(res);
  if (options(req, res)) return;
  if (req.method !== 'POST') return fail(res, 405, 'Método não permitido.');
  const context = await requireDefaultHouse(req, 'owner');
  if (!context) return fail(res, 401, 'Apenas o dono pode convidar pessoas.');
  try {
    const body = await readJson(req, 20_000);
    const email = String(body.email || '').trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail(res, 400, 'E-mail inválido.');
    const token = randomBytes(32).toString('base64url');
    const response = await dbFetch('house_invitations', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify([{ house_id: context.house.id, email, token_hash: tokenHash(token), created_by: context.user.id }]),
    });
    if (!response.ok) return fail(res, 500, 'Não foi possível criar o convite.');
    return json(res, 201, { token, email });
  } catch (error) {
    return fail(res, 500, error instanceof Error ? error.message : 'Erro interno.');
  }
}

