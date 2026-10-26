import { cors, fail, json, options, readJson, validDocument } from '../_lib/http.mjs';
import { upsertDocuments, requireDefaultHouse } from '../_lib/supabase.mjs';

export default async function handler(req, res) {
  cors(res);
  if (options(req, res)) return;
  if (req.method !== 'POST') return fail(res, 405, 'Método não permitido.');
  try {
    const context = await requireDefaultHouse(req, 'owner');
    if (!context) return fail(res, 401, 'Apenas o dono pode publicar a casinha.');
    const body = await readJson(req);
    if (!validDocument(body.document)) return fail(res, 400, 'Documento inválido.');
    const saved = { ...body.document, updatedAt: new Date().toISOString() };
    await upsertDocuments([
      { house_id: context.house.id, status: 'draft', document: saved, updated_by: context.user.id, updated_at: saved.updatedAt },
      { house_id: context.house.id, status: 'published', document: saved, updated_by: context.user.id, updated_at: saved.updatedAt },
    ]);
    return json(res, 200, saved);
  } catch (error) {
    return fail(res, 500, error instanceof Error ? error.message : 'Erro interno.');
  }
}

