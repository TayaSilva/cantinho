import { cors, fail, options } from '../_lib/http.mjs';

// A leitura pública antiga foi desativada. Casas só são entregues por
// /api/public/house/:token, após validação do link revogável.
export default function handler(req, res) {
  cors(res);
  if (options(req, res)) return;
  return fail(res, 410, 'Use o link privado de compartilhamento da casinha.');
}
