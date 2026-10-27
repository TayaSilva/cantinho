import { cors, fail, options, readJson } from '../_lib/http.mjs';
import { authAdminFetch, dbFetch, getUser, purgeHouseFiles } from '../_lib/supabase.mjs';

/**
 * DELETE /api/me/account — a própria pessoa exclui a conta.
 * Ordem: arquivos dos cantinhos → cantinhos (houses.owner_id é "on delete restrict")
 * → usuário do Auth (a cascata leva participações em cantinhos de outras pessoas).
 * Se parar no meio, repetir é seguro: cada passo ignora o que já foi apagado.
 */
async function deleteAccount(req, res, user) {
  const body = await readJson(req, 1_000);
  if (body.confirm !== 'EXCLUIR') return fail(res, 400, 'Confirme digitando EXCLUIR.');

  const owner = encodeURIComponent(user.id);
  const lookup = await dbFetch(`houses?owner_id=eq.${owner}&select=id`);
  const houses = await lookup.json().catch(() => []);
  if (!lookup.ok) return fail(res, 500, 'Não foi possível consultar seus cantinhos.');
  try {
    for (const house of houses) await purgeHouseFiles(house.id);
  } catch (error) {
    return fail(res, 500, error instanceof Error ? error.message : 'Não foi possível remover os arquivos dos cantinhos.');
  }
  const deleted = await dbFetch(`houses?owner_id=eq.${owner}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
  if (!deleted.ok) return fail(res, 500, 'Não foi possível excluir seus cantinhos.');

  const removed = await authAdminFetch(`admin/users/${owner}`, { method: 'DELETE' });
  if (!removed.ok && removed.status !== 404) return fail(res, 500, 'Seus cantinhos foram apagados, mas não foi possível excluir a conta. Tente novamente.');
  res.statusCode = 204;
  return res.end();
}

export default async function handler(req, res) {
  cors(res);
  if (options(req, res)) return;
  if (req.method !== 'DELETE') return fail(res, 405, 'Método não permitido.');
  try {
    // O id vem sempre da sessão validada, nunca do corpo da requisição.
    const user = await getUser(req);
    if (!user) return fail(res, 401, 'Login necessário.');
    return await deleteAccount(req, res, user);
  } catch (error) {
    return fail(res, 500, error instanceof Error ? error.message : 'Erro interno.');
  }
}
