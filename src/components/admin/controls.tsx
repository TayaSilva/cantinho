/**
 * Controles do Backoffice (visual claro e minimalista):
 * amostras de cor, miniaturas de modelo, interruptores, campos de texto,
 * seletor segmentado, diálogo de confirmação e aviso rápido.
 */
import { useEffect, useId, useRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode, RefObject } from 'react';

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(' ');
}

/** Fecha um menu suspenso ao clicar fora de `ref` ou apertar Esc. */
export function useDismiss(open: boolean, ref: RefObject<HTMLElement | null>, close: () => void) {
  useEffect(() => {
    if (!open) return;
    const onEvent = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent ? event.key === 'Escape' : !ref.current?.contains(event.target as Node)) close();
    };
    document.addEventListener('mousedown', onEvent);
    document.addEventListener('keydown', onEvent);
    return () => {
      document.removeEventListener('mousedown', onEvent);
      document.removeEventListener('keydown', onEvent);
    };
  }, [open, ref, close]);
}

/* ---------- Botões ---------- */

type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export function Button({ variant = 'secondary', size = 'md', className, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: 'md' | 'lg' }) {
  return (
    <button
      type="button"
      {...rest}
      className={cx(
        'inline-flex cursor-pointer items-center justify-center text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500 disabled:cursor-not-allowed disabled:opacity-45',
        size === 'md' ? 'h-9 gap-1.5 rounded-lg px-3.5' : 'h-11 gap-2 rounded-xl px-4',
        variant === 'primary' && 'bg-stone-900 font-semibold text-white hover:bg-stone-700',
        variant === 'secondary' && 'border border-stone-200 bg-white text-stone-900 hover:bg-stone-50',
        variant === 'ghost' && 'text-stone-700 hover:bg-stone-100',
        variant === 'danger' && 'border border-red-200 bg-white text-red-700 hover:bg-red-50',
        className,
      )}
    >
      {children}
    </button>
  );
}

/* ---------- Seções do painel ---------- */

export function Field({ title, hint, aside, children, id }: { title: string; hint?: string; aside?: ReactNode; children: ReactNode; id?: string }) {
  return (
    <section id={id} className="flex scroll-mt-4 flex-col gap-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-[13px] font-semibold text-stone-900">{title}</h3>
        {aside && <span className="truncate text-xs text-stone-500">{aside}</span>}
      </div>
      {children}
      {hint && <p className="text-xs leading-relaxed text-stone-500">{hint}</p>}
    </section>
  );
}

export function Group({ title, children, id, highlighted }: { title: string; children: ReactNode; id?: string; highlighted?: boolean }) {
  return (
    <div id={id} className={cx('flex scroll-mt-4 flex-col gap-5 rounded-xl p-0 transition-shadow', highlighted && 'ring-2 ring-rose-200 ring-offset-8 ring-offset-white')}>
      <h2 className="text-xs font-semibold uppercase tracking-[.06em] text-stone-500">{title}</h2>
      {children}
    </div>
  );
}

/* ---------- Amostras de cor ---------- */

export interface SwatchItem {
  id: string;
  name: string;
  color: string;
}

export function Swatches({ items, value, onChange, label }: { items: SwatchItem[]; value: string; onChange: (id: string) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2.5">
      {items.map((it) => {
        const active = it.id === value;
        return (
          <button
            key={it.id}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={it.name}
            title={it.name}
            onClick={() => onChange(it.id)}
            className={cx(
              'size-9 cursor-pointer rounded-full border-2 transition-shadow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500',
              active ? 'border-white shadow-[0_0_0_2px_#1c1917]' : 'border-black/10 hover:shadow-[0_0_0_2px_#d6d3d1]',
            )}
            style={{ backgroundColor: it.color }}
          />
        );
      })}
    </div>
  );
}

/* ---------- Miniaturas ---------- */

export interface ThumbItem {
  id: string;
  name: string;
  thumb: ReactNode;
  disabled?: boolean;
  disabledReason?: string;
}

export function ThumbGrid({ items, value, onChange, label, columns = 5 }: { items: ThumbItem[]; value: string; onChange: (id: string) => void; label: string; columns?: number }) {
  return (
    <div role="radiogroup" aria-label={label} className="grid gap-2" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
      {items.map((it) => {
        const active = it.id === value;
        return (
          <button
            key={it.id}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={it.disabled}
            title={it.disabled ? it.disabledReason : it.name}
            onClick={() => onChange(it.id)}
            className={cx(
              'flex min-w-0 cursor-pointer flex-col items-center gap-1 rounded-[10px] bg-white px-1 pt-1.5 pb-1.5 text-[11px] leading-tight transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500 disabled:cursor-not-allowed disabled:opacity-35',
              active ? 'border-2 border-stone-900 bg-stone-50 font-semibold text-stone-900' : 'border border-stone-200 text-stone-600 hover:border-stone-300',
            )}
          >
            <span className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-md bg-stone-100">{it.thumb}</span>
            <span className="w-full truncate text-center">{it.name}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ---------- Interruptor ---------- */

export function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4">
      <label htmlFor={id} className="flex min-w-0 cursor-pointer flex-col gap-0.5">
        <span className="text-sm font-medium text-stone-900">{label}</span>
        {description && <span className="text-xs leading-relaxed text-stone-500">{description}</span>}
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cx(
          'relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500',
          checked ? 'bg-stone-900' : 'bg-stone-300',
        )}
      >
        <span className={cx('absolute top-0.5 size-5 rounded-full bg-white shadow transition-[left]', checked ? 'left-[22px]' : 'left-0.5')} />
      </button>
    </div>
  );
}

/* ---------- Campos de texto ---------- */

const inputClass =
  'w-full rounded-lg border border-stone-300 bg-white px-3 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-500 focus:outline-none focus:ring-2 focus:ring-rose-200';

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  hint,
  type = 'text',
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
  type?: 'text' | 'date';
  maxLength?: number;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-medium text-stone-700">
        {label}
      </label>
      <input id={id} type={type} value={value} maxLength={maxLength} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={cx(inputClass, 'h-[38px]')} />
      {hint && <span className="text-xs text-stone-500">{hint}</span>}
    </div>
  );
}

export function TextArea({ label, value, onChange, rows = 4, hint }: { label: string; value: string; onChange: (v: string) => void; rows?: number; hint?: string }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-medium text-stone-700">
        {label}
      </label>
      <textarea id={id} rows={rows} value={value} onChange={(e) => onChange(e.target.value)} className={cx(inputClass, 'resize-y py-2.5 leading-relaxed')} />
      {hint && <span className="text-xs text-stone-500">{hint}</span>}
    </div>
  );
}

/* ---------- Seletor segmentado ---------- */

export function Segmented<T extends string>({ options, value, onChange, label }: { options: { id: T; label: string }[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex flex-wrap rounded-lg bg-stone-100 p-[3px]">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={o.id === value}
          onClick={() => onChange(o.id)}
          className={cx(
            'h-[30px] cursor-pointer rounded-md px-2.5 text-[13px] focus-visible:outline-2 focus-visible:outline-rose-500',
            o.id === value ? 'bg-white font-semibold text-stone-900 shadow-sm' : 'text-stone-600 hover:text-stone-900',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ---------- Confirmação ---------- */

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel = 'Cancelar',
  danger,
  confirmDisabled,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  body: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
  confirmDisabled?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  useEffect(() => {
    if (open) cancelRef.current?.focus();
  }, [open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onKeyDown={(e) => e.key === 'Escape' && onCancel()}>
      <div className="absolute inset-0 bg-stone-900/40" onClick={onCancel} aria-hidden="true" />
      <div role="alertdialog" aria-modal="true" aria-labelledby={titleId} className="relative flex w-full max-w-md flex-col gap-4 rounded-2xl bg-white p-6 shadow-xl">
        <h2 id={titleId} className="text-lg font-semibold text-stone-900">
          {title}
        </h2>
        <div className="text-sm leading-relaxed text-stone-600">{body}</div>
        <div className="flex justify-end gap-2">
          <button ref={cancelRef} type="button" onClick={onCancel} className="h-9 cursor-pointer rounded-lg border border-stone-200 bg-white px-3.5 text-sm font-medium hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-rose-500">
            {cancelLabel}
          </button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} disabled={confirmDisabled}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Aviso rápido ---------- */

export function Toast({ message, onDone }: { message: string | null; onDone: () => void }) {
  useEffect(() => {
    if (!message) return;
    const id = window.setTimeout(onDone, 2600);
    return () => window.clearTimeout(id);
  }, [message, onDone]);
  if (!message) return null;
  return (
    <div role="status" className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-white shadow-lg motion-safe:animate-fade-in">
      {message}
    </div>
  );
}

/* ---------- Ícones de traço (Backoffice) ---------- */

export function AdminIcon({ name, className = 'size-[18px]' }: { name: 'home' | 'sofa' | 'person' | 'paw' | 'star' | 'undo' | 'eye' | 'plus' | 'up' | 'down' | 'trash' | 'upload' | 'external' | 'image' | 'video' | 'music' | 'letter' | 'calendar' | 'gift' | 'text' | 'save' | 'power' | 'link' | 'more' | 'chevron' | 'menu' | 'close'; className?: string }) {
  const p = { className, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true as const };
  switch (name) {
    case 'home':
      return <svg {...p}><path d="M3 10l9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" /></svg>;
    case 'sofa':
      return <svg {...p}><path d="M4 11V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3" /><path d="M3 11h18v5H3z" /><path d="M5 16v3M19 16v3" /></svg>;
    case 'person':
      return <svg {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></svg>;
    case 'paw':
      return <svg {...p}><circle cx="6" cy="10" r="2" /><circle cx="10" cy="5.5" r="2" /><circle cx="15" cy="5.5" r="2" /><circle cx="19" cy="10" r="2" /><path d="M8 17c0-3 2-5 4.5-5s4.5 2 4.5 5c0 2-1.5 3-4.5 3S8 19 8 17z" /></svg>;
    case 'star':
      return <svg {...p}><path d="M12 3l2.5 5 5.5.8-4 3.9.9 5.5-4.9-2.6-4.9 2.6.9-5.5-4-3.9 5.5-.8z" /></svg>;
    case 'undo':
      return <svg {...p}><path d="M9 14L4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" /></svg>;
    case 'eye':
      return <svg {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>;
    case 'plus':
      return <svg {...p} strokeWidth={2.2}><path d="M12 5v14M5 12h14" /></svg>;
    case 'up':
      return <svg {...p}><path d="M12 19V5M6 11l6-6 6 6" /></svg>;
    case 'down':
      return <svg {...p}><path d="M12 5v14M6 13l6 6 6-6" /></svg>;
    case 'trash':
      return <svg {...p}><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>;
    case 'upload':
      return <svg {...p}><path d="M12 16V4M7 9l5-5 5 5" /><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" /></svg>;
    case 'external':
      return <svg {...p}><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></svg>;
    case 'image':
      return <svg {...p}><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="2" /><path d="M21 16l-5-5-9 9" /></svg>;
    case 'video':
      return <svg {...p}><rect x="3" y="5" width="14" height="14" rx="2" /><path d="M17 10l4-2v8l-4-2" /></svg>;
    case 'music':
      return <svg {...p}><path d="M9 18V5l11-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="17" cy="16" r="3" /></svg>;
    case 'letter':
      return <svg {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></svg>;
    case 'calendar':
      return <svg {...p}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>;
    case 'gift':
      return <svg {...p}><rect x="3" y="8" width="18" height="13" rx="1" /><path d="M3 12h18M12 8v13M12 8S10 3 7.5 4.5 9 8 12 8zM12 8s2-5 4.5-3.5S15 8 12 8z" /></svg>;
    case 'text':
      return <svg {...p}><path d="M4 6h16M4 12h10M4 18h13" /></svg>;
    case 'save':
      return <svg {...p}><path d="M5 3h11l4 4v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a1 1 0 0 1 1-1z" /><path d="M8 3v5h7V3M8 21v-7h8v7" /></svg>;
    case 'power':
      return <svg {...p}><path d="M12 3v8" /><path d="M7.5 6.5a7 7 0 1 0 9 0" /></svg>;
    case 'link':
      return <svg {...p}><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></svg>;
    case 'more':
      return <svg {...p} fill="currentColor" stroke="none"><circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" /></svg>;
    case 'chevron':
      return <svg {...p}><path d="M6 9l6 6 6-6" /></svg>;
    case 'menu':
      return <svg {...p}><path d="M4 7h16M4 12h16M4 17h16" /></svg>;
    case 'close':
      return <svg {...p}><path d="M6 6l12 12M18 6L6 18" /></svg>;
  }
}
