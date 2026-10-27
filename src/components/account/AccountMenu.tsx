import { useCallback, useRef, useState } from 'react';
import { AdminIcon, ConfirmDialog, useDismiss } from '../admin/controls';

/** Avatar com a inicial do nome; ao clicar, mostra a conta, o botão de sair e o de excluir a conta. */
export function AccountMenu({ firstName, email, onLogout, onDeleteAccount, ownedCount = 0 }: { firstName: string; email?: string; onLogout?: () => void; onDeleteAccount?: () => Promise<void>; ownedCount?: number }) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(open, ref, useCallback(() => setOpen(false), []));
  return (
    <div ref={ref} className="relative">
      <button type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((v) => !v)} className="flex cursor-pointer items-center gap-2 rounded-full p-0.5 pr-1 text-stone-500 hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-rose-500">
        <span className="flex size-10 items-center justify-center rounded-full bg-rose-50 text-sm font-semibold text-rose-800">{firstName.slice(0, 1).toUpperCase()}</span>
        <AdminIcon name="chevron" className={`size-4 transition-transform ${open ? 'rotate-180' : ''}`} />
        <span className="sr-only">Menu da conta</span>
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-40 mt-2 w-60 rounded-xl border border-stone-200 bg-white p-2 text-sm shadow-lg">
          <div className="border-b border-stone-100 px-2.5 pt-1 pb-2.5">
            <p className="font-semibold">{firstName}</p>
            {email && <p className="truncate text-xs text-stone-500">{email}</p>}
          </div>
          {onLogout && <button role="menuitem" type="button" className="mt-1 w-full cursor-pointer rounded-lg px-2.5 py-2 text-left hover:bg-stone-50" onClick={onLogout}>Sair</button>}
          {onDeleteAccount && (
            <button role="menuitem" type="button" className="w-full cursor-pointer rounded-lg px-2.5 py-2 text-left text-red-700 hover:bg-red-50" onClick={() => { setOpen(false); setConfirming(true); }}>
              Excluir conta
            </button>
          )}
        </div>
      )}
      {onDeleteAccount && confirming && <DeleteAccountDialog ownedCount={ownedCount} onDelete={onDeleteAccount} onClose={() => setConfirming(false)} />}
    </div>
  );
}

/** Aviso antes de excluir a conta: lista o que some junto e pede para digitar EXCLUIR. */
function DeleteAccountDialog({ ownedCount, onDelete, onClose }: { ownedCount: number; onDelete: () => Promise<void>; onClose: () => void }) {
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ready = typed.trim().toUpperCase() === 'EXCLUIR';

  const confirm = async () => {
    if (!ready || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onDelete();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível excluir a conta.');
      setBusy(false);
    }
  };

  return (
    <ConfirmDialog
      open
      danger
      title="Excluir sua conta?"
      confirmLabel={busy ? 'Excluindo…' : 'Excluir conta'}
      confirmDisabled={!ready || busy}
      onCancel={() => !busy && onClose()}
      onConfirm={() => void confirm()}
      body={
        <div className="flex flex-col gap-3">
          <p>
            Isso apaga permanentemente sua conta
            {ownedCount > 0 && <> <b className="text-stone-900">e {ownedCount === 1 ? 'o cantinho que você criou' : `os ${ownedCount} cantinhos que você criou`}</b>, com todas as fotos, vídeos, músicas, cartas e mensagens. Links compartilhados param de funcionar</>}
            . Se você participa de cantinhos de outras pessoas, perde o acesso a eles. <b className="text-stone-900">Não é possível desfazer.</b>
          </p>
          <label className="flex flex-col gap-1.5 font-medium text-stone-800">
            Digite EXCLUIR para confirmar
            <input
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && void confirm()}
              autoComplete="off"
              spellCheck={false}
              disabled={busy}
              className="h-10 rounded-lg border border-stone-300 px-3 font-normal tracking-wide outline-none focus:border-red-500"
            />
          </label>
          {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-800">{error}</p>}
        </div>
      }
    />
  );
}
