import { cors, fail, json, options, readJson, validDocument } from '../_lib/http.mjs';
import { dbFetch, getUser, purgeHouseFiles, requestedHouseId, requireHouse, upsertDocuments } from '../_lib/supabase.mjs';
import { randomUUID } from 'node:crypto';

const UUID = /^[0-9a-f-]{36}$/i;

function slugify(value) {
  const base = String(value || 'cantinho')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'cantinho';
  return base;
}

/** Desfaz uma criação incompleta; a FK em cascata remove membros e documentos. */
async function removeHouse(houseId) {
  await dbFetch(`houses?id=eq.${encodeURIComponent(houseId)}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } }).catch(() => undefined);
}

async function createHouse(req, res, user) {
  const owned = await dbFetch(`houses?owner_id=eq.${encodeURIComponent(user.id)}&status=neq.deleted&select=id`, { headers: { Prefer: 'count=exact', Range: '0-0' } });
  const total = Number(owned.headers.get('content-range')?.split('/')[1] || 0);
  if (total >= 1) return fail(res, 409, 'Cada conta pode ter apenas um cantinho ativo nesta primeira versão.');
  if (!owned.ok) return fail(res, 500, 'Não foi possível verificar seus limites.');
  if (total >= MAX_HOUSES_PER_USER) return fail(res, 403, `Você atingiu o limite de ${MAX_HOUSES_PER_USER} cantinhos.`);

  const body = await readJson(req, 10_000_000);
  const name = String(body.name || 'Meu cantinho').trim().slice(0, 80) || 'Meu cantinho';
  const id = randomUUID();
  const slug = `${slugify(name)}-${id.replaceAll('-', '').slice(0, 10)}`;
  if (!validDocument(body.document)) return fail(res, 400, 'Documento inicial inválido.');

  // O dono vem sempre da sessão validada, nunca do corpo da requisição.
  const created = await dbFetch('houses', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify([{ id, name, slug, owner_id: user.id }]),
  });
  const houses = await created.json().catch(() => []);
  if (!created.ok || !houses[0]) return fail(res, 500, 'Não foi possível criar o cantinho.');
  const house = houses[0];
  try {
    const member = await dbFetch('house_members', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify([{ house_id: house.id, user_id: user.id, role: 'owner', can_add_text: true }]),
    });
    if (!member.ok) throw new Error('Não foi possível associar o cantinho à conta.');
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
  if (!UUID.test(houseId)) return fail(res, 400, 'Cantinho inválido.');
  const context = await requireHouse(req, houseId, 'owner');
  if (!context) return fail(res, 403, 'Apenas o dono pode excluir o cantinho.');

  try {
    await purgeHouseFiles(houseId);
  } catch (error) {
    return fail(res, 500, error instanceof Error ? error.message : 'Não foi possível remover os arquivos do cantinho.');
  }

  const deleted = await dbFetch(`houses?id=eq.${encodeURIComponent(houseId)}&owner_id=eq.${encodeURIComponent(context.user.id)}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
  if (!deleted.ok) return fail(res, 500, 'Não foi possível excluir o cantinho.');
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
    if (!user.email_confirmed_at && !user.confirmed_at) return fail(res, 403, 'Confirme seu e-mail para gerenciar cantinhos.');
    if (req.method === 'POST') return await createHouse(req, res, user);
    if (req.method === 'DELETE') return await deleteHouse(req, res);

    const response = await dbFetch(`house_members?user_id=eq.${encodeURIComponent(user.id)}&select=house_id,role,can_add_text,house:houses!inner(id,name,slug,status,created_at,updated_at,published_at)&house.status=eq.active&order=created_at.asc`);
    const rows = await response.json();
    if (!response.ok) return fail(res, 500, 'Não foi possível carregar seus cantinhos.');
    return json(res, 200, rows);
  } catch (error) {
    return fail(res, 500, error instanceof Error ? error.message : 'Erro interno.');
  }
}
