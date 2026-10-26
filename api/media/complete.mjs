import { cors, fail, json, options, readJson } from '../_lib/http.mjs';
import { HOUSE_ID, dbFetch, requireAdmin } from '../_lib/supabase.mjs';

const UUID = /^[0-9a-f-]{36}$/i;

export default async function handler(req, res) {
  cors(res);
  if (options(req, res)) return;
  if (req.method !== 'POST') return fail(res, 405, 'Método não permitido.');
  try {
    const user = await requireAdmin(req);
    if (!user) return fail(res, 401, 'Acesso de administrador necessário.');
    const body = await readJson(req, 1_000_000);
    if (!UUID.test(body.id) || typeof body.storagePath !== 'string' || !body.storagePath.startsWith(`${HOUSE_ID}/`)) return fail(res, 400, 'Metadados de mídia inválidos.');
    const response = await dbFetch('media?on_conflict=id', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify([{ id: body.id, house_id: HOUSE_ID, storage_path: body.storagePath, original_name: body.name || 'upload', mime_type: body.type || 'application/octet-stream', size_bytes: Number(body.size) || 0, created_by: user.id }]),
    });
    if (!response.ok) return fail(res, 500, 'Não foi possível registrar a mídia.');
    return json(res, 201, { ref: `media:${body.id}` });
  } catch (error) {
    return fail(res, 500, error instanceof Error ? error.message : 'Erro interno.');
  }
}
