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

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Guarda um arquivo e devolve a referência para salvar no conteúdo. */
export async function putMedia(file: Blob): Promise<string> {
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    const response = await fetch(`${API_BASE}/api/media`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: 'name' in file && typeof file.name === 'string' ? file.name : 'upload',
        type: file.type || 'application/octet-stream',
        data: btoa(binary),
      }),
    });
    if (response.ok) {
      const body = (await response.json()) as { ref?: string };
      if (body.ref) return body.ref;
    }
  } catch {
    // O fallback local permite trabalhar sem a API durante o desenvolvimento.
  }

  const id = newId();
  await tx('readwrite', (s) => s.put(file, id));
  return PREFIX + id;
}

export async function deleteMedia(ref: string): Promise<void> {
  if (!isMediaRef(ref)) return;
  const id = ref.slice(PREFIX.length);
  await fetch(`${API_BASE}/api/media/${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => undefined);
  await tx('readwrite', (s) => s.delete(id));
  const url = urlCache.get(ref);
  if (url) URL.revokeObjectURL(url);
  urlCache.delete(ref);
}

/** Transforma qualquer `src` (URL normal ou "media:<id>") em URL utilizável. */
export async function resolveMedia(src: string | undefined): Promise<string | undefined> {
  if (!src) return undefined;
  if (!isMediaRef(src)) return src;
  const cached = urlCache.get(src);
  if (cached) return cached;
  const id = src.slice(PREFIX.length);
  const apiUrl = `${API_BASE}/api/media/${encodeURIComponent(id)}`;
  try {
    const response = await fetch(apiUrl, { method: 'HEAD', cache: 'no-store' });
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
