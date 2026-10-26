import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'paper' | 'accent' | 'dark';
type Size = 'sm' | 'md' | 'lg' | 'icon' | 'icon-lg';

interface PixelButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

const variants: Record<Variant, string> = {
  primary: 'bg-highlight text-ink border-ink-deep shadow-[0_4px_0_var(--color-ink-deep)]',
  paper: 'bg-paper text-ink border-ink-deep shadow-[0_4px_0_var(--color-ink-deep)]',
  accent: 'bg-rug text-ink-deep border-ink-deep shadow-[0_5px_0_var(--color-ink-deep)]',
  dark: 'bg-night-2 text-highlight border-night-3 hover:bg-night-3',
};

const sizes: Record<Size, string> = {
  sm: 'min-h-11 px-4 py-2 text-base',
  md: 'min-h-12 px-5 py-2.5 text-lg',
  lg: 'min-h-14 px-8 py-3 text-xl',
  icon: 'size-11 p-0',
  'icon-lg': 'size-16 p-0',
};

/** Botão com borda grossa e sombra “degrau”, no estilo pixel art. */
export function PixelButton({ variant = 'primary', size = 'md', className = '', children, ...rest }: PixelButtonProps) {
  const pressable = variant === 'dark' ? '' : 'motion-safe:hover:-translate-y-0.5 motion-safe:active:translate-y-0.5';
  return (
    <button
      type="button"
      {...rest}
      className={`inline-flex items-center justify-center gap-2 border-[3px] font-pixel font-semibold cursor-pointer transition-transform duration-75 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-rug disabled:opacity-50 ${pressable} ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </button>
  );
}

/* Ícones em traço, compartilhados pelos componentes. */
export function Icon({ name, className = 'size-5' }: { name: IconName; className?: string }) {
  const common = { className, viewBox: '0 0 24 24', 'aria-hidden': true as const };
  switch (name) {
    case 'close':
      return <svg {...common} fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="square"><path d="M6 6l12 12M18 6L6 18" /></svg>;
    case 'play':
      return <svg {...common} fill="currentColor"><polygon points="7,4 20,12 7,20" /></svg>;
    case 'pause':
      return <svg {...common} fill="currentColor"><rect x="6" y="5" width="4" height="14" /><rect x="14" y="5" width="4" height="14" /></svg>;
    case 'prev':
      return <svg {...common} fill="currentColor"><polygon points="19,5 9,12 19,19" /><rect x="5" y="5" width="3" height="14" /></svg>;
    case 'next':
      return <svg {...common} fill="currentColor"><polygon points="5,5 15,12 5,19" /><rect x="16" y="5" width="3" height="14" /></svg>;
    case 'left':
      return <svg {...common} fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="square"><path d="M15 5l-7 7 7 7" /></svg>;
    case 'right':
      return <svg {...common} fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="square"><path d="M9 5l7 7-7 7" /></svg>;
    case 'sound':
      return <svg {...common} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="square"><path d="M3 9h4l5-4v14l-5-4H3z" /><path d="M16 9c1.2 1.4 1.2 4.6 0 6" /><path d="M19 6.5c2.6 3 2.6 8 0 11" /></svg>;
    case 'mute':
      return <svg {...common} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="square"><path d="M3 9h4l5-4v14l-5-4H3z" /><path d="M16 9l5 6M21 9l-5 6" /></svg>;
    case 'fullscreen':
      return <svg {...common} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="square"><path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" /></svg>;
    case 'help':
      return <svg {...common} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="square"><path d="M8.5 9a3.5 3.5 0 1 1 5 3.2c-.9.4-1.5 1.1-1.5 2v.8" /><path d="M12 18.5v.5" /></svg>;
    case 'plus':
      return <svg {...common} fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="square"><path d="M12 5v14M5 12h14" /></svg>;
    case 'minus':
      return <svg {...common} fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="square"><path d="M5 12h14" /></svg>;
    case 'note':
      return <svg className={className} viewBox="0 0 7 7" aria-hidden="true" shapeRendering="crispEdges"><path d="M2 6h-2v-2h2v-4h5v2h-4v4z" fill="currentColor" /></svg>;
    case 'heart':
      return <svg className={className} viewBox="0 0 12 12" aria-hidden="true" shapeRendering="crispEdges"><path d="M1 3h1v-1h3v1h2v-1h3v1h1v3h-1v1h-1v1h-1v1h-1v1h-2v-1h-1v-1h-1v-1h-1v-1h-1z" fill="currentColor" /></svg>;
  }
}

export type IconName =
  | 'close' | 'play' | 'pause' | 'prev' | 'next' | 'left' | 'right'
  | 'sound' | 'mute' | 'fullscreen' | 'help' | 'plus' | 'minus' | 'note' | 'heart';
