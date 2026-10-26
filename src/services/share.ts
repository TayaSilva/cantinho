import { authFetch } from './auth';

export type ShareResult = 'shared' | 'copied' | null;

export async function sharePublicHouse(): Promise<ShareResult> {
  let token = '';
  try {
    const response = await authFetch('/api/houses/share-links', { method: 'POST' });
    const data = (await response.json().catch(() => ({}))) as { token?: string; error?: string };
    if (!response.ok || !data.token) throw new Error(data.error || 'Não foi possível criar o link.');
    token = data.token;
  } catch {
    return null;
  }
  const url = new URL(`/c/${encodeURIComponent(token)}`, window.location.origin).href;
  const share = (navigator as Navigator & {
    share?: (data: { title?: string; text?: string; url?: string }) => Promise<void>;
  }).share;

  if (share) {
    try {
      await share({ title: document.title || 'Nossa casinha', text: 'Vem conhecer nosso cantinho.', url });
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
