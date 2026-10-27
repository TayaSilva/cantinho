import { cors, fail, json, options, readJson, validDocument } from '../_lib/http.mjs';
import { dbFetch, requireRequestedHouse, upsertDocuments } from '../_lib/supabase.mjs';

export default async function handler(req, res) {
  cors(res);
  if (options(req, res)) return;
  if (req.method !== 'GET' && req.method !== 'POST') return fail(res, 405, 'Método não permitido.');
  try {
    const context = await requireRequestedHouse(req, req.method === 'POST' ? 'owner' : 'read');
    if (!context) return fail(res, 401, 'Acesso ao cantinho não autorizado.');
    const existing = await dbFetch(`house_documents?house_id=eq.${context.house.id}&status=eq.published&select=document&limit=1`);
    const existingRows = await existing.json();
    if (existingRows[0]) return json(res, 200, existingRows[0].document);
    if (req.method === 'GET') return fail(res, 404, 'A publicação ainda não foi inicializada.');
    const body = await readJson(req);
    if (!validDocument(body.document)) return fail(res, 400, 'Documento inicial inválido.');
    await upsertDocuments([
      { house_id: context.house.id, status: 'draft', document: body.document, updated_by: context.user.id },
      { house_id: context.house.id, status: 'published', document: body.document, updated_by: context.user.id },
    ]);
    return json(res, 201, body.document);
  } catch (error) {
    return fail(res, 500, error instanceof Error ? error.message : 'Erro interno.');
  }
}
