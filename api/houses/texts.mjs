import { cors, fail, json, options, readJson } from '../_lib/http.mjs';
import { dbFetch, requireRequestedHouse, upsertDocuments } from '../_lib/supabase.mjs';

const allowed = new Set(['letters', 'specialDates', 'chestMessages']);

function validItem(kind, item) {
  if (typeof item.id !== 'string' || item.id.length > 80) return false;
  if (kind === 'chestMessages') return typeof item.text === 'string' && item.text.length <= 2000;
  if (kind === 'specialDates') return typeof item.title === 'string' && item.title.length <= 160 && typeof item.date === 'string' && typeof item.description === 'string' && item.description.length <= 2000;
  return typeof item.title === 'string' && item.title.length <= 160 && typeof item.date === 'string' && typeof item.author === 'string' && item.author.length <= 160 && typeof item.body === 'string' && item.body.length <= 10000;
}

export default async function handler(req, res) {
  cors(res);
  if (options(req, res)) return;
  if (req.method !== 'POST') return fail(res, 405, 'Método não permitido.');
  const context = await requireRequestedHouse(req, 'text');
  if (!context) return fail(res, 401, 'Permissão de texto não autorizada.');
  try {
    const body = await readJson(req, 50_000);
    if (!allowed.has(body.kind) || !body.item || typeof body.item !== 'object' || !validItem(body.kind, body.item)) return fail(res, 400, 'Texto inválido.');
    const existing = await dbFetch(`house_documents?house_id=eq.${context.house.id}&status=eq.draft&select=document&limit=1`);
    const rows = await existing.json();
    if (!existing.ok || !rows[0]) return fail(res, 404, 'Rascunho não encontrado.');
    const document = structuredClone(rows[0].document);
    const list = Array.isArray(document.content?.[body.kind]) ? document.content[body.kind] : [];
    if (list.length >= 500) return fail(res, 413, 'Limite de textos atingido.');
    list.push(body.item);
    document.content[body.kind] = list;
    document.updatedAt = new Date().toISOString();
    await upsertDocuments([{ house_id: context.house.id, status: 'draft', document, updated_by: context.user.id, updated_at: document.updatedAt }]);
    return json(res, 200, { ok: true });
  } catch (error) {
    return fail(res, 500, error instanceof Error ? error.message : 'Erro interno.');
  }
}

