import { useCallback, useRef, useState } from 'react';
import { AdminIcon, useDismiss } from '../admin/controls';

/** Avatar com a inicial do nome; ao clicar, mostra a conta e o botão de sair. */
export function AccountMenu({ firstName, email, onLogout }: { firstName: string; email?: string; onLogout?: () => void }) {
  const [open, setOpen] = useState(false);
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
        </div>
      )}
    </div>
  );
}
