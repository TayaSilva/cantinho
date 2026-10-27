import { useEffect, useId, useRef } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { Icon } from '../ui/PixelButton';

type Look = 'paper' | 'dark' | 'bare';

interface BaseModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Cor da faixa de título no estilo "paper". */
  headerClass?: string;
  look?: Look;
  /** Classes de largura, ex.: "max-w-2xl". */
  widthClass?: string;
  /** Fechar ao clicar fora (padrão: sim). */
  closeOnBackdrop?: boolean;
  /** Teclas extras dentro do modal (ex.: setas para navegar fotos). */
  onKeyDown?: (e: KeyboardEvent<HTMLDivElement>) => void;
  children: ReactNode;
}

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select, textarea, video[controls], [tabindex]:not([tabindex="-1"])';

/**
 * Modal padrão do cantinho:
 * fundo escurecido, conteúdo central, botão de fechar, tecla Esc,
 * clique fora, foco preso dentro do modal e animação curta
 * (desligada para quem prefere menos movimento).
 */
export function BaseModal({
  open,
  onClose,
  title,
  headerClass = 'bg-wall-2',
  look = 'paper',
  widthClass = 'max-w-2xl',
  closeOnBackdrop = true,
  onKeyDown,
  children,
}: BaseModalProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const el = dialogRef.current;
    const first = el?.querySelector<HTMLElement>('[data-autofocus]') ?? el;
    first?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  if (!open) return null;

  const handleKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key === 'Tab' && dialogRef.current) {
      const items = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((n) => n.offsetParent !== null);
      if (items.length === 0) return;
      const firstItem = items[0];
      const lastItem = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === firstItem || document.activeElement === dialogRef.current)) {
        e.preventDefault();
        lastItem.focus();
      } else if (!e.shiftKey && document.activeElement === lastItem) {
        e.preventDefault();
        firstItem.focus();
      }
    }
    onKeyDown?.(e);
  };

  const closeButton = (
    <button
      type="button"
      onClick={onClose}
      aria-label={`Fechar ${title.toLowerCase()}`}
      className="flex size-11 shrink-0 cursor-pointer items-center justify-center border-[3px] border-ink-deep bg-paper text-ink hover:bg-highlight focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-rug"
    >
      <Icon name="close" className="size-4" />
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" onKeyDown={handleKey}>
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[rgba(27,20,32,.66)] motion-safe:animate-fade-in"
        onClick={closeOnBackdrop ? onClose : undefined}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`relative flex max-h-[92dvh] w-full flex-col outline-none motion-safe:animate-modal-in ${widthClass} ${
          look === 'paper'
            ? 'border-4 border-ink-deep bg-paper text-ink shadow-[8px_8px_0_rgba(0,0,0,.35)]'
            : look === 'dark'
              ? 'border-4 border-ink-deep bg-tv text-highlight shadow-[8px_8px_0_rgba(0,0,0,.35)]'
              : 'text-highlight'
        }`}
      >
        {look === 'paper' ? (
          <div className={`flex items-center justify-between gap-3 border-b-4 border-ink-deep py-2.5 pl-5 pr-2.5 ${headerClass}`}>
            <h2 id={titleId} className="font-pixel text-xl font-semibold sm:text-[22px]">{title}</h2>
            {closeButton}
          </div>
        ) : (
          <div className={`flex items-center justify-between gap-3 ${look === 'dark' ? 'px-5 pt-4' : 'pb-3'}`}>
            <h2 id={titleId} className="font-pixel text-xl font-semibold text-highlight sm:text-[22px]">{title}</h2>
            {closeButton}
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
