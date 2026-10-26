import { cors, fail, json, options, readJson } from '../_lib/http.mjs';
import { dbFetch, requireDefaultHouse } from '../_lib/supabase.mjs';

const UUID = /^[0-9a-f-]{36}$/i;
const MAX_BYTES = 500 * 1024 * 1024;

export default async function handler(req, res) {
  cors(res);
  if (options(req, res)) return;
  if (req.method !== 'POST') return fail(res, 405, 'Método não permitido.');
  try {
    const context = await requireDefaultHouse(req, 'owner');
    if (!context) return fail(res, 401, 'Apenas o dono pode enviar mídias.');
    const body = await readJson(req, 1_000_000);
    if (!UUID.test(body.id) || typeof body.storagePath !== 'string' || !body.storagePath.startsWith(`${context.house.id}/`) || Number(body.size) > MAX_BYTES) return fail(res, 400, 'Metadados de mídia inválidos.');
    const response = await dbFetch('media?on_conflict=id', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify([{ id: body.id, house_id: context.house.id, storage_path: body.storagePath, original_name: String(body.name || 'upload').slice(0, 180), mime_type: String(body.type || 'application/octet-stream').slice(0, 120), size_bytes: Number(body.size) || 0, created_by: context.user.id }]),
    });
    if (!response.ok) return fail(res, 500, 'Não foi possível registrar a mídia.');
    return json(res, 201, { ref: `media:${body.id}` });
  } catch (error) {
    return fail(res, 500, error instanceof Error ? error.message : 'Erro interno.');
  }
}

