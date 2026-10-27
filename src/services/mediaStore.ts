import { authFetch, cloudConfigured, uploadToCloud, getDefaultHouseId } from './auth';
import { UploadError } from './uploadRules';

/**
 * Arquivos enviados pelo Backoffice (fotos, vídeos, músicas).
 *
 * Nesta versão ficam no IndexedDB do navegador e são referenciados no
 * conteúdo como "media:<id>". Ao ligar um backend, troque estas funções por
 * upload/URL do servidor — o resto do app não precisa mudar.
 */

const DB_NAME = 'casinha-media';
const STORE = 'files';
const PREFIX = 'media:';
const API_BASE = import.meta.env.VITE_API_URL ?? '';

let dbPromise: Promise<IDBDatabase> | null = null;
const urlCache = new Map<string, string>();

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const req = run(db.transaction(STORE, mode).objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
  );
}

export function isMediaRef(src: string | undefined): src is string {
  return typeof src === 'string' && src.startsWith(PREFIX);
}

function mediaParts(ref: string) {
  const value = ref.slice(PREFIX.length);
  const separator = value.indexOf('@');
  return separator < 0 ? { id: value, storagePath: undefined } : { id: value.slice(0, separator), storagePath: value.slice(separator + 1) };
}

export function mediaApiUrl(src: string, houseId?: string): string | undefined {
  if (!isMediaRef(src)) return src;
  const { id, storagePath } = mediaParts(src);
  const context = storagePath?.split('/')[0] || houseId;
  return `${API_BASE}/api/media/${encodeURIComponent(id)}${context ? `?house_id=${encodeURIComponent(context)}` : ''}`;
}

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Guarda um arquivo e devolve a referência para salvar no conteúdo. */
export async function putMedia(file: Blob, houseId?: string): Promise<string> {
  const namedFile = file as Blob & { name?: string };
  const originalName = namedFile.name || 'upload';

  if (cloudConfigured) {
    const id = newId();
    const selectedHouseId = houseId || await getDefaultHouseId();
    const extension = originalName.includes('.') ? originalName.slice(originalName.lastIndexOf('.')).replace(/[^a-zA-Z0-9.]/g, '').slice(0, 10) : '';
    const storagePath = `${selectedHouseId}/${id}${extension}`;
    await uploadToCloud(storagePath, file);
    const response = await authFetch(`${API_BASE}/api/media/complete?house_id=${encodeURIComponent(selectedHouseId)}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id, storagePath, name: originalName, type: file.type || 'application/octet-stream', size: file.size }),
    });
    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      throw new UploadError(response.status === 400 ? 'O arquivo é grande demais ou está em um formato não aceito.' : data.error || 'O arquivo foi enviado, mas não foi possível salvá-lo. Tente de novo.');
    }
    // A URL direta evita uma ida extra à Vercel e uma consulta ao banco quando
    // outra pessoa abre o link compartilhado.
    return `${PREFIX}${id}@${selectedHouseId}`;
  }

  try {
    const selectedHouseId = houseId || '00000000-0000-0000-0000-000000000001';
    const bytes = new Uint8Array(await file.arrayBuffer());
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    const response = await fetch(`${API_BASE}/api/media?house_id=${encodeURIComponent(selectedHouseId)}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: originalName,
        type: file.type || 'application/octet-stream',
        data: btoa(binary),
      }),
    });
    if (response.ok) {
      const body = (await response.json()) as { ref?: string };
      if (body.ref) return body.ref.includes('@') ? body.ref : `${body.ref}@${selectedHouseId}`;
    }
  } catch {
    // O fallback local permite trabalhar sem a API durante o desenvolvimento.
  }

  const id = newId();
  await tx('readwrite', (s) => s.put(file, id));
  return PREFIX + id;
}

export async function deleteMedia(ref: string, houseId?: string): Promise<void> {
  if (!isMediaRef(ref)) return;
  const { id } = mediaParts(ref);
  const apiUrl = mediaApiUrl(ref, houseId);
  await authFetch(apiUrl || `${API_BASE}/api/media/${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => undefined);
  await tx('readwrite', (s) => s.delete(id));
  const url = urlCache.get(ref);
  if (url) URL.revokeObjectURL(url);
  urlCache.delete(ref);
}

/** Transforma qualquer `src` (URL normal ou "media:<id>") em URL utilizável. */
export async function resolveMedia(src: string | undefined, houseId?: string): Promise<string | undefined> {
  if (!src) return undefined;
  if (!isMediaRef(src)) return src;
  const cached = urlCache.get(src);
  if (cached) return cached;
  const { id } = mediaParts(src);
  const apiUrl = mediaApiUrl(src, houseId) as string;

  // Em produção, a API já é o resolvedor da mídia: ela responde com um
  // redirect para o objeto no Storage. Fazer um HEAD antes do GET atrasava
  // cada vídeo/áudio e ainda podia renovar a sessão desnecessariamente.
  // Entregamos a URL imediatamente e deixamos o elemento <audio>/<video>
  // fazer uma única requisição.
  if (cloudConfigured) {
    try {
      const response = await authFetch(apiUrl, { method: 'HEAD', cache: 'no-store' });
      if (response.ok && response.url !== apiUrl) {
        urlCache.set(src, response.url);
        return response.url;
      }
    } catch {
      // Tenta o IndexedDB legado abaixo.
    }
  }

  try {
    const response = await authFetch(apiUrl, { method: 'HEAD', cache: 'no-store' });
    if (response.ok) {
      urlCache.set(src, apiUrl);
      return apiUrl;
    }
  } catch {
    // Tenta o IndexedDB legado abaixo.
  }
  const blob = await tx<Blob | undefined>('readonly', (s) => s.get(id) as IDBRequest<Blob | undefined>);
  if (!blob) return undefined;
  const url = URL.createObjectURL(blob);
  urlCache.set(src, url);
  return url;
}

/** Versão síncrona: devolve a URL se já estiver resolvida. */
export function resolvedMediaNow(src: string | undefined): string | undefined {
  if (!src) return undefined;
  return isMediaRef(src) ? urlCache.get(src) : src;
}
