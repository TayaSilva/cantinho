import { cors, fail, json, options, readJson, validDocument } from '../_lib/http.mjs';
import { dbFetch, requireDefaultHouse, upsertDocuments } from '../_lib/supabase.mjs';

export default async function handler(req, res) {
  cors(res);
  if (options(req, res)) return;
  if (req.method !== 'GET' && req.method !== 'PUT') return fail(res, 405, 'Método não permitido.');
  try {
    const context = await requireDefaultHouse(req, req.method === 'PUT' ? 'owner' : 'read');
    if (!context) return fail(res, 401, 'Acesso à casinha não autorizado.');
    if (req.method === 'GET') {
      const response = await dbFetch(`house_documents?house_id=eq.${context.house.id}&status=eq.draft&select=document&limit=1`);
      const rows = await response.json();
      if (!response.ok) return fail(res, 500, 'Não foi possível consultar o rascunho.');
      if (!rows[0]) return fail(res, 404, 'O rascunho ainda não foi inicializado.');
      return json(res, 200, rows[0].document);
    }
    const body = await readJson(req);
    if (!validDocument(body.document)) return fail(res, 400, 'Documento inválido.');
    const saved = { ...body.document, updatedAt: new Date().toISOString() };
    await upsertDocuments([{ house_id: context.house.id, status: 'draft', document: saved, updated_by: context.user.id, updated_at: saved.updatedAt }]);
    return json(res, 200, saved);
  } catch (error) {
    return fail(res, 500, error instanceof Error ? error.message : 'Erro interno.');
  }
}

