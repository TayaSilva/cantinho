import { authFetch, cloudConfigured } from './auth';

export type ShareResult = 'shared' | 'copied' | null;
export class ShareError extends Error {}

export async function sharePublicHouse(houseId?: string, directUrl?: string): Promise<ShareResult> {
  let url = directUrl ? new URL(directUrl, window.location.origin).href : '';

  if (!url && houseId && cloudConfigured) {
    try {
      const query = `?house_id=${encodeURIComponent(houseId)}`;
      const response = await authFetch(`/api/houses/share-links${query}`, { method: 'POST' });
      const data = (await response.json().catch(() => ({}))) as { token?: string; error?: string };
      if (!response.ok || !data.token) throw new ShareError(data.error || 'Não foi possível criar o link.');
      url = new URL(`/c/${encodeURIComponent(data.token)}`, window.location.origin).href;
    } catch (cause) {
      if (cause instanceof ShareError) throw cause;
      throw new ShareError('Não foi possível criar o link.');
    }
  }

  // O modo local não possui o banco de links do Supabase; ainda assim, a
  // ação continua útil para testar e copiar a rota persistida localmente.
  if (!url && houseId) url = new URL(`/?house=${encodeURIComponent(houseId)}`, window.location.origin).href;
  if (!url) url = window.location.href;

  const share = (navigator as Navigator & {
    share?: (data: { title?: string; text?: string; url?: string }) => Promise<void>;
  }).share;

  if (share) {
    try {
      await share({ title: document.title || 'Nosso cantinho', text: 'Vem conhecer nosso cantinho.', url });
      return 'shared';
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return null;
    }
  }

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      return 'copied';
    }
    const input = document.createElement('textarea');
    input.value = url;
    input.setAttribute('readonly', 'true');
    input.style.position = 'fixed';
    input.style.opacity = '0';
    document.body.appendChild(input);
    input.select();
    const copied = document.execCommand('copy');
    input.remove();
    return copied ? 'copied' : null;
  } catch {
    return null;
  }
}
