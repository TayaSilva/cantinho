import { cors, fail, json, options, readJson, validDocument } from '../_lib/http.mjs';
import { HOUSE_ID, dbFetch, upsertDocuments } from '../_lib/supabase.mjs';

export default async function handler(req, res) {
  cors(res);
  if (options(req, res)) return;
  if (req.method !== 'POST') return fail(res, 405, 'Método não permitido.');
  try {
    const existing = await dbFetch(`house_documents?house_id=eq.${HOUSE_ID}&status=eq.published&select=document&limit=1`);
    const existingRows = await existing.json();
    if (existingRows[0]) return json(res, 200, existingRows[0].document);
    const body = await readJson(req);
    if (!validDocument(body.document)) return fail(res, 400, 'Documento inicial inválido.');
    await upsertDocuments([
      { house_id: HOUSE_ID, status: 'draft', document: body.document },
      { house_id: HOUSE_ID, status: 'published', document: body.document },
    ]);
    return json(res, 201, body.document);
  } catch (error) {
    return fail(res, 500, error instanceof Error ? error.message : 'Erro interno.');
  }
}
