import { cors, fail, json, options, readJson, validDocument } from '../_lib/http.mjs';
import { dbFetch, requireRequestedHouse, touchHouse, upsertDocuments } from '../_lib/supabase.mjs';
import { getHousePlan, validatePublication } from '../_lib/planLimits.mjs';

export default async function handler(req, res) {
  cors(res);
  if (options(req, res)) return;
  if (req.method !== 'POST') return fail(res, 405, 'Método não permitido.');
  try {
    const context = await requireRequestedHouse(req, 'owner');
    if (!context) return fail(res, 401, 'Apenas o dono pode publicar o cantinho.');
    const body = await readJson(req);
    if (!validDocument(body.document)) return fail(res, 400, 'Documento inválido.');
    const plan = await getHousePlan(context.house.id);
    const mediaResponse = await dbFetch(`media?house_id=eq.${encodeURIComponent(context.house.id)}&select=id,size_bytes`);
    const mediaRows = await mediaResponse.json().catch(() => []);
    if (!mediaResponse.ok) return fail(res, 500, 'Não foi possível validar o armazenamento.');
    if (plan.status !== 'active') {
      return json(res, 409, { error: 'O plano deste cantinho não está ativo.', code: 'PLAN_INACTIVE', details: { status: plan.status, limits: plan.limits } });
    }
    const validation = validatePublication(body.document, plan, mediaRows);
    if (!validation.valid) {
      return json(res, 409, { error: 'A publicação excede os limites do plano.', code: 'PLAN_LIMITS', details: validation });
    }
    const saved = { ...body.document, updatedAt: new Date().toISOString() };
    const documents = body.preserveDraft === true
      ? [{ house_id: context.house.id, status: 'published', document: saved, updated_by: context.user.id, updated_at: saved.updatedAt }]
      : [
          { house_id: context.house.id, status: 'draft', document: saved, updated_by: context.user.id, updated_at: saved.updatedAt },
          { house_id: context.house.id, status: 'published', document: saved, updated_by: context.user.id, updated_at: saved.updatedAt },
        ];
    await upsertDocuments(documents);
    await touchHouse(context.house.id, { updated_at: saved.updatedAt, published_at: saved.updatedAt });
    return json(res, 200, saved);
  } catch (error) {
    return fail(res, 500, error instanceof Error ? error.message : 'Erro interno.');
  }
}

