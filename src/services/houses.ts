import { defaultDocument } from './houseStore';
import { authFetch, cloudConfigured } from './auth';

export interface HouseSummary {
  house_id: string;
  role: 'owner' | 'guest';
  can_add_text: boolean;
  house: { id: string; name: string; status: string; created_at?: string; updated_at?: string; published_at?: string | null };
}

export type HouseStatus = 'draft' | 'published' | 'pending';

const ACTIVE_HOUSE_KEY = 'casinha:active-house:v1';
const LOCAL_HOUSES_KEY = 'casinha:local-houses:v1';
export const LEGACY_HOUSE_ID = '00000000-0000-0000-0000-000000000001';

/** Rota do Backoffice de uma casinha: /admin/casinha/:id[/conteudos/:secao]. */
export function houseAdminPath(houseId: string, sub = '') {
  return `/admin/casinha/${encodeURIComponent(houseId)}${sub}`;
}

export function houseStatus(item: HouseSummary): HouseStatus {
  const { published_at: publishedAt, updated_at: updatedAt } = item.house;
  if (!publishedAt) return 'draft';
  return updatedAt && new Date(updatedAt).getTime() > new Date(publishedAt).getTime() ? 'pending' : 'published';
}

function localDocDate(kind: 'draft' | 'published', houseId: string): string | undefined {
  try {
    const value = JSON.parse(localStorage.getItem(`casinha:${kind}:${houseId}`) || 'null') as { updatedAt?: string } | null;
    return value?.updatedAt && value.updatedAt !== new Date(0).toISOString() ? value.updatedAt : undefined;
  } catch {
    return undefined;
  }
}

function localHouses(): HouseSummary[] {
  let items: HouseSummary[] | null = null;
  try {
    const parsed = JSON.parse(localStorage.getItem(LOCAL_HOUSES_KEY) || 'null');
    if (Array.isArray(parsed)) items = parsed;
  } catch {
    // Usa a casa legada abaixo.
  }
  if (!items) {
    items = [{
      house_id: LEGACY_HOUSE_ID,
      role: 'owner',
      can_add_text: true,
      house: { id: LEGACY_HOUSE_ID, name: 'Minha casinha', status: 'active', created_at: new Date().toISOString() },
    }];
    saveLocalHouses(items);
  }
  // Sem servidor de contas, as datas saem do próprio cache local dos documentos.
  return items.map((item) => {
    const publishedAt = localDocDate('published', item.house_id);
    return { ...item, house: { ...item.house, updated_at: localDocDate('draft', item.house_id) || publishedAt || item.house.created_at, published_at: publishedAt ?? null } };
  });
}

function saveLocalHouses(houses: HouseSummary[]) {
  localStorage.setItem(LOCAL_HOUSES_KEY, JSON.stringify(houses));
}

export async function listHouses(): Promise<HouseSummary[]> {
  if (!cloudConfigured) return localHouses();
  const response = await authFetch('/api/me/houses', { cache: 'no-store' });
  const data = (await response.json().catch(() => ({}))) as HouseSummary[] | { error?: string };
  if (!response.ok || !Array.isArray(data)) throw new Error((!Array.isArray(data) && data.error) || 'Não foi possível carregar suas casinhas.');
  return data;
}

export async function createHouse(name: string): Promise<HouseSummary> {
  const cleanName = name.trim().slice(0, 80) || 'Minha casinha';
  if (!cloudConfigured) {
    const id = crypto.randomUUID();
    const item: HouseSummary = { house_id: id, role: 'owner', can_add_text: true, house: { id, name: cleanName, status: 'active', created_at: new Date().toISOString() } };
    saveLocalHouses([...localHouses(), item]);
    localStorage.setItem(`casinha:draft:${id}`, JSON.stringify(defaultDocument()));
    return item;
  }
  const response = await authFetch('/api/me/houses', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: cleanName, document: defaultDocument() }),
  });
  const data = (await response.json().catch(() => ({}))) as HouseSummary & { error?: string };
  if (!response.ok) throw new Error(data.error || 'Não foi possível criar a casinha.');
  return data;
}

/** Exclui a casinha, seus documentos e arquivos. Não pode ser desfeito. */
export async function deleteHouse(houseId: string): Promise<void> {
  if (!cloudConfigured) {
    saveLocalHouses(localHouses().filter((item) => item.house_id !== houseId));
    localStorage.removeItem(`casinha:draft:${houseId}`);
    localStorage.removeItem(`casinha:published:${houseId}`);
    return;
  }
  const response = await authFetch(`/api/me/houses?house_id=${encodeURIComponent(houseId)}`, { method: 'DELETE' });
  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error || 'Não foi possível excluir a casinha.');
  }
}

export function getActiveHouseId(houses: HouseSummary[]): string | null {
  const saved = localStorage.getItem(ACTIVE_HOUSE_KEY);
  return houses.some((item) => item.house_id === saved) ? saved : houses[0]?.house_id ?? null;
}

export function setActiveHouseId(houseId: string) {
  localStorage.setItem(ACTIVE_HOUSE_KEY, houseId);
}
