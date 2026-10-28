import { useEffect, useId, useState } from 'react';
import { buildShareMessage, copyShareMessage, shareMessage, supportsNativeShare } from '../../services/share';
import { Button } from './controls';

export function ShareMessageModal({ open, houseUrl, onClose }: { open: boolean; houseUrl: string | null; onClose: () => void }) {
  const titleId = useId();
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<'copy' | 'share' | null>(null);
  const message = houseUrl ? buildShareMessage(houseUrl) : '';
  const nativeShare = supportsNativeShare();

  useEffect(() => {
    if (open) {
      setNotice(null);
      setBusy(null);
    }
  }, [open]);

  if (!open || !houseUrl) return null;

  const copy = async () => {
    if (busy) return;
    setBusy('copy');
    try {
      await copyShareMessage(message);
      setNotice('Mensagem e link copiados!');
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : 'Não foi possível copiar a mensagem.');
    } finally {
      setBusy(null);
    }
  };

  const share = async () => {
    if (busy) return;
    setBusy('share');
    try {
      const result = await shareMessage(message);
      setNotice(result === 'shared' ? 'Mensagem compartilhada!' : 'Compartilhamento cancelado.');
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : 'Não foi possível compartilhar a mensagem.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby={titleId} onKeyDown={(event) => event.key === 'Escape' && onClose()}>
      <div className="absolute inset-0 bg-stone-900/40" onClick={onClose} aria-hidden="true" />
      <div className="relative flex max-h-[90dvh] w-full max-w-lg flex-col gap-5 overflow-y-auto rounded-2xl bg-white p-5 shadow-xl sm:p-6">
        <div>
          <h2 id={titleId} className="text-lg font-semibold text-stone-900">Compartilhe seu cantinho</h2>
          <p className="mt-1 text-sm leading-relaxed text-stone-600">Envie uma mensagem especial para alguém conhecer esse pequeno mundo.</p>
        </div>
        <textarea readOnly value={message} aria-label="Prévia da mensagem de compartilhamento" className="min-h-56 w-full resize-none rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm leading-relaxed text-stone-700 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100" />
        {notice && <p role="status" className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-900">{notice}</p>}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button onClick={onClose}>Fechar</Button>
          {nativeShare && <Button variant="secondary" onClick={() => void share()} disabled={busy !== null}>{busy === 'share' ? 'Compartilhando…' : 'Compartilhar'}</Button>}
          <Button variant="primary" onClick={() => void copy()} disabled={busy !== null}>{busy === 'copy' ? 'Copiando…' : 'Copiar mensagem e link'}</Button>
        </div>
      </div>
    </div>
  );
}
