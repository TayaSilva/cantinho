/**
 * Persistência do cantinho: RASCUNHO e PUBLICADO.
 *
 * - O Backoffice edita sempre o rascunho.
 * - Os visitantes só leem o publicado.
 * - Publicar copia o rascunho para o publicado.
 *
 * Nesta versão tudo fica no localStorage do navegador. As funções são
 * assíncronas de propósito: para ligar um banco de dados (tabelas
 * asset_options, house_appearance, house_characters, house_pet...), basta
 * reescrever este arquivo chamando a API — os componentes não mudam.
 */
import { defaultAppearance } from '../data/houseConfig';
import { defaultContent } from '../data/mockContent';
import { authFetch } from './auth';
import type { HouseAppearance, HouseContent, HouseDocument } from '../types/house';

const LEGACY_HOUSE_ID = '00000000-0000-0000-0000-000000000001';
const API_BASE = import.meta.env.VITE_API_URL ?? '';

export const STORE_EVENT = 'casinha:store-changed';

export function defaultDocument(): HouseDocument {
  return {
    schemaVersion: 1,
    appearance: structuredClone(defaultAppearance),
    content: structuredClone(defaultContent),
    updatedAt: new Date(0).toISOString(),
  };
}

/** Completa campos que faltarem (ex.: documento salvo antes de uma atualização do catálogo). */
function mergeDefaults<T>(base: T, saved: unknown, path = ''): T {
  if (Array.isArray(base)) {
    if (!Array.isArray(saved)) return structuredClone(base);

    // Listas de conteúdo são editáveis e podem legitimamente ficar vazias.
    // Apenas os quatro personagens são slots fixos e precisam ser completados
    // quando um documento antigo ainda não os possui.
    const length = path === 'appearance.characters' ? base.length : saved.length;
    return Array.from({ length }, (_, index) => {
      if (index >= saved.length || saved[index] === undefined) {
        return index < base.length ? structuredClone(base[index]) : undefined;
      }
      return index < base.length ? mergeDefaults(base[index], saved[index], `${path}[${index}]`) : saved[index];
    }) as T;
  }
  if (base && typeof base === 'object') {
    const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
    if (saved && typeof saved === 'object' && !Array.isArray(saved)) {
      for (const [k, v] of Object.entries(saved as Record<string, unknown>)) {
        out[k] = k in out ? mergeDefaults(out[k], v, path ? `${path}.${k}` : k) : v;
      }
    }
    return out as T;
  }
  return (saved === undefined || saved === null ? base : saved) as T;
}

function migrate(raw: unknown): HouseDocument {
  const base = defaultDocument();
  if (!raw || typeof raw !== 'object') return base;
  const doc = raw as Partial<HouseDocument>;
  return {
    schemaVersion: 1,
    appearance: mergeDefaults<HouseAppearance>(base.appearance, doc.appearance),
    content: mergeDefaults<HouseContent>(base.content, doc.content),
    updatedAt: typeof doc.updatedAt === 'string' ? doc.updatedAt : base.updatedAt,
  };
}

function storageKey(kind: 'draft' | 'published', houseId: string) {
  return `casinha:${kind}:${houseId}`;
}

function endpoint(path: string, houseId: string) {
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}house_id=${encodeURIComponent(houseId)}`;
}

function read(key: string): HouseDocument | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? migrate(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

function write(key: string, doc: HouseDocument) {
  localStorage.setItem(key, JSON.stringify(doc));
  window.dispatchEvent(new CustomEvent(STORE_EVENT, { detail: key }));
}

async function request(path: string, init?: RequestInit): Promise<Response | null> {
  try {
    return await authFetch(`${API_BASE}${path}`, { cache: 'no-store', ...init });
  } catch {
    return null;
  }
}

async function readApiDocument(response: Response): Promise<HouseDocument | null> {
  if (!response.ok) return null;
  try {
    return migrate(await response.json());
  } catch {
    return null;
  }
}

function notifyServerChange(key: string, doc: HouseDocument) {
  // Mantém um cache local pequeno apenas para sincronizar abas antigas.
  localStorage.setItem(key, JSON.stringify(doc));
  window.dispatchEvent(new CustomEvent(STORE_EVENT, { detail: key }));
  localStorage.setItem('casinha:server-sync', String(Date.now()));
}

async function bootstrap(houseId: string): Promise<HouseDocument | null> {
  const doc = defaultDocument();
  const response = await request(endpoint('/api/house/bootstrap', houseId), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ document: doc }),
  });
  const saved = response ? await readApiDocument(response) : null;
  if (saved) notifyServerChange(storageKey('published', houseId), saved);
  return saved;
}

/** Versão que os visitantes veem. */
export async function loadPublished(houseId = LEGACY_HOUSE_ID): Promise<HouseDocument> {
  const response = await request(endpoint('/api/house/bootstrap', houseId));
  const saved = response ? await readApiDocument(response) : null;
  if (saved) {
    notifyServerChange(storageKey('published', houseId), saved);
    return saved;
  }
  if (response?.status === 404) {
    const initialized = await bootstrap(houseId);
    if (initialized) return initialized;
  }
  return read(storageKey('published', houseId)) ?? defaultDocument();
}

/** Rascunho do Backoffice (se não houver, parte do publicado). */
export async function loadDraft(houseId = LEGACY_HOUSE_ID): Promise<HouseDocument> {
  const response = await request(endpoint('/api/house/draft', houseId));
  const saved = response ? await readApiDocument(response) : null;
  if (saved) {
    notifyServerChange(storageKey('draft', houseId), saved);
    return saved;
  }
  return read(storageKey('draft', houseId)) ?? (await loadPublished(houseId));
}

export async function saveDraft(doc: HouseDocument, houseId = LEGACY_HOUSE_ID): Promise<HouseDocument> {
  const saved = { ...doc, updatedAt: new Date().toISOString() };
  const response = await request(endpoint('/api/house/draft', houseId), {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ document: saved }),
  });
  const serverSaved = response ? await readApiDocument(response) : null;
  if (serverSaved) {
    notifyServerChange(storageKey('draft', houseId), serverSaved);
    return serverSaved;
  }
  write(storageKey('draft', houseId), saved);
  return saved;
}

/** Publica o rascunho: a partir daqui os visitantes veem esta versão. */
export async function publish(doc: HouseDocument, houseId = LEGACY_HOUSE_ID): Promise<HouseDocument> {
  const saved = { ...doc, updatedAt: new Date().toISOString() };
  const response = await request(endpoint('/api/house/publish', houseId), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ document: saved }),
  });
  const serverSaved = response ? await readApiDocument(response) : null;
  if (serverSaved) {
    notifyServerChange(storageKey('draft', houseId), serverSaved);
    notifyServerChange(storageKey('published', houseId), serverSaved);
    return serverSaved;
  }
  write(storageKey('draft', houseId), saved);
  write(storageKey('published', houseId), saved);
  return saved;
}

/** Quantos valores diferem entre duas versões (para "N alterações não publicadas"). */
export function countDifferences(a: unknown, b: unknown): number {
  if (a === b) return 0;
  if (Array.isArray(a) && Array.isArray(b)) {
    const shared = Math.min(a.length, b.length);
    let n = Math.abs(a.length - b.length);
    for (let i = 0; i < shared; i++) n += countDifferences(a[i], b[i]);
    return n;
  }
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const keys = new Set([...Object.keys(a as object), ...Object.keys(b as object)]);
    let n = 0;
    keys.forEach((k) => {
      if (k === 'updatedAt') return;
      n += countDifferences((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]);
    });
    return n;
  }
  return 1;
}
