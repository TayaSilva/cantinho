import { cors, fail, json, options, readJson } from '../_lib/http.mjs';
import { dbFetch, requireRequestedHouse, storageFetch } from '../_lib/supabase.mjs';

const UUID = /^[0-9a-f-]{36}$/i;
// Igual ao maior limite do app (vídeos, src/services/uploadRules.ts).
const MAX_BYTES = 50 * 1024 * 1024;
const MAX_STORAGE_BYTES = Number(process.env.MAX_STORAGE_BYTES || 500 * 1024 * 1024);
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/x-m4v', 'audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/ogg']);

async function removeUploaded(path) {
  await storageFetch(`object/${process.env.SUPABASE_BUCKET || 'casinha-media'}`, { method: 'DELETE', body: JSON.stringify({ prefixes: [path] }) }).catch(() => undefined);
}

export default async function handler(req, res) {
  cors(res);
  if (options(req, res)) return;
  if (req.method !== 'POST') return fail(res, 405, 'Método não permitido.');
  try {
    const context = await requireRequestedHouse(req, 'owner');
    if (!context) return fail(res, 401, 'Apenas o dono pode enviar mídias.');
    const body = await readJson(req, 1_000_000);
    const size = Number(body.size);
    const mime = String(body.type || '').toLowerCase();
    const path = typeof body.storagePath === 'string' ? body.storagePath : '';
    const extension = path.includes('.') ? path.slice(path.lastIndexOf('.')) : '';
    const validPath = path === `${context.house.id}/${body.id}${extension}`;
    if (!UUID.test(body.id) || !validPath || size <= 0 || size > MAX_BYTES || !ALLOWED_TYPES.has(mime)) {
      if (path.startsWith(`${context.house.id}/`)) await removeUploaded(path);
      return fail(res, 400, 'Invalid media metadata.');
    }
    if (size > MAX_STORAGE_BYTES) {
      await removeUploaded(path);
      return fail(res, 413, 'O limite de armazenamento deste cantinho foi atingido.');
    }
    if (!UUID.test(body.id) || typeof body.storagePath !== 'string' || !body.storagePath.startsWith(`${context.house.id}/`) || Number(body.size) > MAX_BYTES) return fail(res, 400, 'Metadados de mídia inválidos.');
    const response = await dbFetch('rpc/register_house_media', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        p_house_id: context.house.id,
        p_id: body.id,
        p_storage_path: path,
        p_original_name: String(body.name || 'upload').slice(0, 180),
        p_mime_type: mime.slice(0, 120),
        p_size_bytes: size,
        p_created_by: context.user.id,
      }),
    });
    if (!response.ok) {
      await removeUploaded(path);
      const details = await response.text().catch(() => '');
      if (details.includes('storage_quota_exceeded')) return fail(res, 413, 'O limite de armazenamento deste cantinho foi atingido.');
      if (details.includes('plan_inactive')) return fail(res, 409, 'O plano deste cantinho não está ativo.');
      return fail(res, 500, 'Não foi possível registrar a mídia.');
    }
    return json(res, 201, { ref: `media:${body.id}` });
  } catch (error) {
    return fail(res, 500, error instanceof Error ? error.message : 'Erro interno.');
  }
}

