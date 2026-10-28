import { useEffect, useRef, useSyncExternalStore } from 'react';

/**
 * Alertas que aparecem no topo da tela depois de uma ação (salvar, publicar,
 * copiar link...). Qualquer parte do app chama `notify.success(...)` ou
 * `notify.error(...)`; o <Notifications /> montado no App mostra os avisos.
 */

export type NotifyTone = 'success' | 'error' | 'info';

type Item = { id: number; tone: NotifyTone; message: string };

const MAX_VISIBLE = 3;
const DURATION: Record<NotifyTone, number> = { success: 3500, info: 4000, error: 6500 };

let items: Item[] = [];
let nextId = 1;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((fn) => fn());
}

function push(tone: NotifyTone, message: string) {
  // Repetir a mesma mensagem só reinicia o aviso, sem empilhar cópias.
  items = [...items.filter((i) => i.message !== message), { id: nextId++, tone, message }].slice(-MAX_VISIBLE);
  emit();
}

function dismiss(id: number) {
  items = items.filter((i) => i.id !== id);
  emit();
}

export const notify = {
  success: (message: string) => push('success', message),
  error: (message: string) => push('error', message),
  info: (message: string) => push('info', message),
};

/** Mensagem de erro legível a partir de qualquer exceção. */
export function errorMessage(cause: unknown, fallback: string): string {
  return cause instanceof Error && cause.message ? cause.message : fallback;
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function Notifications() {
  const list = useSyncExternalStore(subscribe, () => items);
  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex flex-col items-center gap-2.5 px-4 sm:top-5">
      {list.map((item) => (
        <Notice key={item.id} item={item} />
      ))}
    </div>
  );
}

const TONES: Record<NotifyTone, { title: string; icon: string; bar: string }> = {
  success: { title: 'Tudo certo!', icon: '#6F9A5B', bar: 'bg-[#E4F0D9]' },
  error: { title: 'Algo deu errado', icon: '#C0525A', bar: 'bg-[#F9DADB]' },
  info: { title: 'Aviso', icon: '#8A5D6B', bar: 'bg-highlight' },
};

function Notice({ item }: { item: Item }) {
  const tone = TONES[item.tone];
  const timer = useRef<number | undefined>(undefined);
  const start = () => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => dismiss(item.id), DURATION[item.tone]);
  };
  const stop = () => window.clearTimeout(timer.current);

  useEffect(() => {
    start();
    return stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id]);

  return (
    <div
      role={item.tone === 'error' ? 'alert' : 'status'}
      onMouseEnter={stop}
      onMouseLeave={start}
      onFocus={stop}
      onBlur={start}
      className="pointer-events-auto flex w-full max-w-sm items-stretch border-[3px] border-ink bg-paper font-sans text-ink shadow-[0_4px_0_var(--color-ink)] motion-safe:animate-toast-in"
    >
      <div className={`flex shrink-0 items-center border-r-[3px] border-ink px-3 ${tone.bar}`}>
        <ToneIcon tone={item.tone} color={tone.icon} />
      </div>
      <div className="min-w-0 flex-1 px-3 py-2.5">
        <p className="m-0 font-pixel text-[15px] font-semibold leading-tight">{tone.title}</p>
        <p className="m-0 mt-0.5 text-sm leading-snug break-words text-muted">{item.message}</p>
      </div>
      <button
        type="button"
        onClick={() => dismiss(item.id)}
        aria-label="Fechar aviso"
        className="flex shrink-0 cursor-pointer items-start px-2.5 pt-2.5 text-muted outline-none hover:text-ink focus-visible:ring-4 focus-visible:ring-rug/50"
      >
        <PixelGrid rows={ICONS.error} color="currentColor" size={11} />
      </button>
    </div>
  );
}

/** Ícones em pixel art, desenhados em grade ("#" = pixel aceso). */
const ICONS: Record<NotifyTone, string[]> = {
  success: ['.......##', '......##.', '.....##..', '##..##...', '.####....', '..##.....'],
  error: ['##...##', '###.###', '.#####.', '..###..', '.#####.', '###.###', '##...##'],
  info: ['.##.', '.##.', '....', '###.', '.##.', '.##.', '####'],
};

function PixelGrid({ rows, color, size }: { rows: string[]; color: string; size: number }) {
  const w = rows[0].length;
  const h = rows.length;
  const d = rows.flatMap((row, y) => [...row].map((c, x) => (c === '#' ? `M${x} ${y}h1v1h-1z` : ''))).join('');
  return (
    <svg width={size} height={(size * h) / w} viewBox={`0 0 ${w} ${h}`} shapeRendering="crispEdges" aria-hidden="true">
      <path d={d} fill={color} />
    </svg>
  );
}

function ToneIcon({ tone, color }: { tone: NotifyTone; color: string }) {
  return <PixelGrid rows={ICONS[tone]} color={color} size={tone === 'info' ? 12 : 22} />;
}
