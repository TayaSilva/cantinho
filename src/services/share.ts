import { authFetch, cloudConfigured } from './auth';

export type ShareResult = 'shared' | 'copied' | null;
export class ShareError extends Error {}

export function buildShareMessage(houseUrl: string): string {
  return `🏡💕 Alguém especial preparou um cantinho cheio de carinho para você! 💖\n\n✨ Entre, explore cada detalhe e viva essa experiência feita com amor. 🏠💗\n\n🔗 ${houseUrl}\n\n💌 Um pequeno mundo, feito para guardar grandes sentimentos.`;
}

export function supportsNativeShare(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
}

export async function getPublicHouseUrl(houseId?: string, directUrl?: string): Promise<string> {
  if (directUrl) {
    const parsed = new URL(directUrl, window.location.origin);
    if (parsed.origin !== window.location.origin || !parsed.pathname.startsWith('/c/')) throw new ShareError('O link público do cantinho é inválido.');
    return parsed.href;
  }

  if (houseId && cloudConfigured) {
    try {
      const query = `?house_id=${encodeURIComponent(houseId)}`;
      const response = await authFetch(`/api/houses/share-links${query}`, { method: 'POST' });
      const data = (await response.json().catch(() => ({}))) as { token?: string; error?: string };
      if (!response.ok || !data.token) throw new ShareError(data.error || 'Não foi possível criar o link.');
      return new URL(`/c/${encodeURIComponent(data.token)}`, window.location.origin).href;
    } catch (cause) {
      if (cause instanceof ShareError) throw cause;
      throw new ShareError('Não foi possível criar o link.');
    }
  }

  // O modo local não possui o banco de links do Supabase; usa a rota da casa
  // selecionada, nunca a URL da demonstração ou a página atual por acidente.
  if (houseId) return new URL(`/?house=${encodeURIComponent(houseId)}`, window.location.origin).href;
  throw new ShareError('Não foi possível identificar o cantinho para compartilhar.');
}

export async function copyShareMessage(message: string): Promise<void> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(message);
      return;
    }
    const input = document.createElement('textarea');
    input.value = message;
    input.setAttribute('readonly', 'true');
    input.style.position = 'fixed';
    input.style.opacity = '0';
    document.body.appendChild(input);
    input.select();
    const copied = document.execCommand('copy');
    input.remove();
    if (copied) return;
  } catch {
    // A mensagem abaixo é mais útil do que expor detalhes do navegador.
  }
  throw new ShareError('Não foi possível copiar a mensagem.');
}

export async function shareMessage(message: string): Promise<'shared' | 'cancelled'> {
  if (!supportsNativeShare()) throw new ShareError('O compartilhamento nativo não está disponível.');
  try {
    // A URL já está no texto; não enviamos `url` em separado para evitar
    // que alguns dispositivos mostrem o mesmo link duas vezes.
    await navigator.share?.({ title: document.title || 'Nosso cantinho', text: message });
    return 'shared';
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
    throw new ShareError('Não foi possível compartilhar a mensagem.');
  }
}

export async function sharePublicHouse(houseId?: string, directUrl?: string): Promise<ShareResult> {
  const url = await getPublicHouseUrl(houseId, directUrl);
  const message = buildShareMessage(url);

  if (supportsNativeShare()) {
    try {
      const result = await shareMessage(message);
      return result === 'shared' ? 'shared' : null;
    } catch (cause) {
      if (!(cause instanceof ShareError)) throw cause;
    }
  }
  await copyShareMessage(message);
  return 'copied';
}
