/**
 * Tamanhos e formatos aceitos em cada tipo de envio. Os limites cabem no plano
 * grátis do Supabase (50 MB por arquivo) e são conferidos antes de enviar,
 * para a pessoa nunca ver um "HTTP 413".
 */
export type MediaKind = 'image' | 'video' | 'audio';

const MB = 1024 * 1024;

export const UPLOAD_RULES: Record<MediaKind, { maxMb: number; formats: string; extensions: string[]; mimes: string[]; noun: string }> = {
  image: { maxMb: 10, formats: 'JPG, PNG, WebP ou GIF', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif'], mimes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'], noun: 'imagem' },
  video: { maxMb: 50, formats: 'MP4 ou WebM', extensions: ['mp4', 'm4v', 'webm'], mimes: ['video/mp4', 'video/webm', 'video/x-m4v'], noun: 'vídeo' },
  audio: { maxMb: 20, formats: 'MP3, M4A ou OGG', extensions: ['mp3', 'm4a', 'aac', 'ogg', 'oga'], mimes: ['audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/ogg'], noun: 'música' },
};

/** Valor do atributo `accept` do <input type="file">. */
export function acceptFor(kind: MediaKind): string {
  const rule = UPLOAD_RULES[kind];
  return [...rule.mimes, ...rule.extensions.map((ext) => `.${ext}`)].join(',');
}

/** Texto curto para as telas: "MP4 ou WebM · até 50 MB por arquivo". */
export function limitLabel(kind: MediaKind): string {
  const rule = UPLOAD_RULES[kind];
  return `${rule.formats} · até ${rule.maxMb} MB por arquivo`;
}

export function formatSize(bytes: number): string {
  return bytes >= MB ? `${(bytes / MB).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** Devolve a mensagem do problema, ou null se o arquivo pode ser enviado. */
export function checkFile(file: File, kind: MediaKind): string | null {
  const rule = UPLOAD_RULES[kind];
  const ext = file.name.includes('.') ? file.name.slice(file.name.lastIndexOf('.') + 1).toLowerCase() : '';
  if (ext === 'heic' || ext === 'heif') return 'Fotos HEIC (padrão do iPhone) não abrem em todos os navegadores. Exporte como JPG e envie de novo.';
  if (ext === 'mov') return 'Vídeos MOV não tocam em todos os navegadores. Converta para MP4 e envie de novo.';
  const typeOk = rule.mimes.includes(file.type) || (!file.type && rule.extensions.includes(ext)) || (rule.extensions.includes(ext) && file.type.startsWith(`${kind}/`));
  if (!typeOk) return `Este arquivo não é um formato de ${rule.noun} aceito. Use ${rule.formats}.`;
  if (file.size === 0) return 'O arquivo está vazio.';
  if (file.size > rule.maxMb * MB) return `O arquivo tem ${formatSize(file.size)} e o limite é ${rule.maxMb} MB. Escolha um arquivo menor ou comprima antes de enviar.`;
  return null;
}

/** Erro de envio já com mensagem amigável (nunca o código HTTP cru). */
export class UploadError extends Error {}

/** Traduz a resposta do Storage (413, 415, cota) para uma mensagem que a pessoa entende. */
export function friendlyUploadError(status: number | undefined, raw: string): UploadError {
  const text = raw.toLowerCase();
  if (status === 413 || text.includes('413') || text.includes('too large') || text.includes('maximum allowed size') || text.includes('exceeded')) {
    return new UploadError('O arquivo é maior do que o servidor aceita. Escolha um arquivo menor ou comprima antes de enviar.');
  }
  if (status === 415 || text.includes('415') || text.includes('mime type') || text.includes('not supported')) {
    return new UploadError('Este formato de arquivo não é aceito. Envie outro arquivo.');
  }
  if (status === 401 || status === 403 || text.includes('jwt') || text.includes('unauthorized')) {
    return new UploadError('Sua sessão expirou. Entre de novo e envie o arquivo outra vez.');
  }
  if (text.includes('failed to fetch') || text.includes('network')) {
    return new UploadError('A conexão caiu durante o envio. Confira sua internet e tente de novo.');
  }
  return new UploadError('Não foi possível enviar o arquivo. Tente de novo em instantes.');
}
