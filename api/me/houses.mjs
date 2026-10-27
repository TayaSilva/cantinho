import { cors, fail, json, options, readJson, validDocument } from '../_lib/http.mjs';
import { BUCKET, dbFetch, getUser, MAX_HOUSES_PER_USER, requestedHouseId, requireHouse, storageFetch, upsertDocuments } from '../_lib/supabase.mjs';

const UUID = /^[0-9a-f-]{36}$/i;

/** Desfaz uma criação incompleta; a FK em cascata remove membros e documentos. */
async function removeHouse(houseId) {
  await dbFetch(`houses?id=eq.${encodeURIComponent(houseId)}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } }).catch(() => undefined);
}

async function createHouse(req, res, user) {
  const owned = await dbFetch(`houses?owner_id=eq.${encodeURIComponent(user.id)}&status=neq.deleted&select=id`, { headers: { Prefer: 'count=exact', Range: '0-0' } });
  const total = Number(owned.headers.get('content-range')?.split('/')[1] || 0);
  if (!owned.ok) return fail(res, 500, 'Não foi possível verificar seus limites.');
  if (total >= MAX_HOUSES_PER_USER) return fail(res, 403, `Você atingiu o limite de ${MAX_HOUSES_PER_USER} casinhas.`);

  const body = await readJson(req, 10_000_000);
  const name = String(body.name || 'Minha casinha').trim().slice(0, 80) || 'Minha casinha';
  if (!validDocument(body.document)) return fail(res, 400, 'Documento inicial inválido.');

  // O dono vem sempre da sessão validada, nunca do corpo da requisição.
  const created = await dbFetch('houses', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify([{ name, owner_id: user.id }]),
  });
  const houses = await created.json().catch(() => []);
  if (!created.ok || !houses[0]) return fail(res, 500, 'Não foi possível criar a casinha.');
  const house = houses[0];
  try {
    const member = await dbFetch('house_members', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify([{ house_id: house.id, user_id: user.id, role: 'owner', can_add_text: true }]),
    });
    if (!member.ok) throw new Error('Não foi possível associar a casinha à conta.');
    // Os dois documentos nascem iguais; published_at continua nulo até a primeira publicação.
    const timestamp = new Date().toISOString();
    await upsertDocuments([
      { house_id: house.id, status: 'draft', document: body.document, updated_by: user.id, updated_at: timestamp },
      { house_id: house.id, status: 'published', document: body.document, updated_by: user.id, updated_at: timestamp },
    ]);
  } catch (error) {
    await removeHouse(house.id);
    throw error;
  }
  return json(res, 201, { house_id: house.id, role: 'owner', can_add_text: true, house });
}

async function deleteHouse(req, res) {
  const houseId = requestedHouseId(req);
  if (!UUID.test(houseId)) return fail(res, 400, 'Casinha inválida.');
  const context = await requireHouse(req, houseId, 'owner');
  if (!context) return fail(res, 403, 'Apenas o dono pode excluir a casinha.');

  const lookup = await dbFetch(`media?house_id=eq.${encodeURIComponent(houseId)}&select=storage_path`);
  const media = await lookup.json().catch(() => []);
  if (!lookup.ok) return fail(res, 500, 'Não foi possível consultar as mídias da casinha.');
  const prefixes = media.map((row) => row.storage_path).filter((path) => typeof path === 'string' && path.startsWith(`${houseId}/`));
  for (let i = 0; i < prefixes.length; i += 100) {
    const removed = await storageFetch(`object/${BUCKET}`, { method: 'DELETE', body: JSON.stringify({ prefixes: prefixes.slice(i, i + 100) }) });
    if (!removed.ok) return fail(res, 500, 'Não foi possível remover os arquivos da casinha.');
  }

  const deleted = await dbFetch(`houses?id=eq.${encodeURIComponent(houseId)}&owner_id=eq.${encodeURIComponent(context.user.id)}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
  if (!deleted.ok) return fail(res, 500, 'Não foi possível excluir a casinha.');
  res.statusCode = 204;
  return res.end();
}

export default async function handler(req, res) {
  cors(res);
  if (options(req, res)) return;
  if (!['GET', 'POST', 'DELETE'].includes(req.method)) return fail(res, 405, 'Método não permitido.');
  try {
    const user = await getUser(req);
    if (!user) return fail(res, 401, 'Login necessário.');
    if (!user.email_confirmed_at && !user.confirmed_at) return fail(res, 403, 'Confirme seu e-mail para gerenciar casinhas.');
    if (req.method === 'POST') return await createHouse(req, res, user);
    if (req.method === 'DELETE') return await deleteHouse(req, res);

    const response = await dbFetch(`house_members?user_id=eq.${encodeURIComponent(user.id)}&select=house_id,role,can_add_text,house:houses!inner(id,name,status,created_at,updated_at,published_at)&house.status=eq.active&order=created_at.asc`);
    const rows = await response.json();
    if (!response.ok) return fail(res, 500, 'Não foi possível carregar suas casinhas.');
    return json(res, 200, rows);
  } catch (error) {
    return fail(res, 500, error instanceof Error ? error.message : 'Erro interno.');
  }
}
