import { memo, useState } from 'react';
import type { ButtonHTMLAttributes, FormEvent, InputHTMLAttributes, ReactNode } from 'react';
import { defaultAppearance, periods } from '../../data/houseConfig';
import type { SceneRuntime } from '../../types/house';
import { SceneSvg } from '../house/HouseScene';
import { cx } from './controls';

/** A sala fica parada à noite com o abajur aceso: o login precisa parecer calmo. */
const NIGHT_RUNTIME: SceneRuntime = { lampOn: true, chestOpen: false, tvOn: false, musicPlaying: false, petHappy: false };

/** Memorizada: o formulário re-renderiza a cada tecla, a sala não precisa. */
const NightScene = memo(function NightScene() {
  return <SceneSvg appearance={defaultAppearance} theme={periods.noite} runtime={NIGHT_RUNTIME} />;
});

const STARS = [
  { left: '8%', top: '14%', color: '#F8E6B5', delay: '' },
  { left: '46%', top: '9%', color: '#F2A7B5', delay: 'twinkle-1' },
  { left: '62%', top: '86%', color: '#F8E6B5', delay: 'twinkle-2' },
];

export function PixelHeart({ size = 18, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" shapeRendering="crispEdges" aria-hidden="true" className={className}>
      <path d="M1 3h1v-1h3v1h2v-1h3v1h1v3h-1v1h-1v1h-1v1h-1v1h-2v-1h-1v-1h-1v-1h-1v-1h-1z" fill="#F2A7B5" />
    </svg>
  );
}

/**
 * Página das telas de autenticação, do fundo para a frente: base, cantinho padrão
 * à noite, véu de leitura, estrelinhas, selo e o conteúdo (o cartão de vidro).
 */
export function AuthBackdrop({ children }: { children: ReactNode }) {
  return (
    <main className="login-page font-admin text-login-text">
      <div className="login-scene" aria-hidden="true">
        <NightScene />
      </div>
      <div className="login-veil" aria-hidden="true" />
      {STARS.map((star) => (
        <span key={star.left} aria-hidden="true" className={cx('twinkle absolute size-[3px]', star.delay)} style={{ left: star.left, top: star.top, background: star.color }} />
      ))}
      <div className="glass-pill absolute top-8 left-[clamp(16px,4vw,48px)] flex items-center gap-2 px-4 py-2">
        <PixelHeart />
        <span className="font-pixel text-[15px] font-semibold">Cantinho</span>
      </div>
      <div className="relative w-full max-w-[440px]">{children}</div>
      <p className="absolute bottom-5 left-1/2 w-max max-w-[calc(100%-32px)] -translate-x-1/2 text-center text-xs text-[#FFF8EE]/60">Protegido · seus dados ficam só com você</p>
    </main>
  );
}

const cardClass = 'glass-card flex w-full flex-col gap-6 px-[clamp(24px,4vw,40px)] pt-10 pb-8';

export function GlassCard({ children, onSubmit }: { children: ReactNode; onSubmit?: (event: FormEvent) => void }) {
  return onSubmit ? <form className={cardClass} onSubmit={onSubmit} noValidate>{children}</form> : <div className={cardClass}>{children}</div>;
}

/** Sobretítulo em pixel, título e apoio. */
export function GlassHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div>
      <p className="font-pixel text-[15px] font-medium text-highlight">Um cantinho especial para você.</p>
      <h1 className="mt-2 text-[32px] leading-[1.15] font-bold tracking-[-0.01em]">{title}</h1>
      {children && <p className="mt-3 text-[15px] leading-normal text-login-muted">{children}</p>}
    </div>
  );
}

/** Rótulo ligado ao campo + mensagem de erro anunciada (aria-describedby = `${id}-erro`). */
export function GlassField({ id, label, error, hint, aside, children }: { id: string; label: string; error?: string; hint?: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium">{label}</label>
        {aside}
      </div>
      {children}
      {error ? <span id={`${id}-erro`} className="text-[13px] text-login-error">{error}</span> : hint && <span className="text-[13px] text-login-muted">{hint}</span>}
    </div>
  );
}

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> & { id: string; error?: string; onValue: (value: string) => void };

export function GlassInput({ id, error, onValue, className, ...props }: InputProps) {
  return <input id={id} {...props} onChange={(event) => onValue(event.target.value)} aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-erro` : undefined} className={cx('glass-input', className)} />;
}

export function GlassPasswordInput(props: Omit<InputProps, 'type'>) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <GlassInput {...props} type={visible ? 'text' : 'password'} className="has-eye" />
      <button type="button" aria-label={visible ? 'Esconder senha' : 'Mostrar senha'} aria-pressed={visible} onClick={() => setVisible((v) => !v)} className="absolute top-1 right-1 flex size-[42px] cursor-pointer items-center justify-center rounded-[10px] text-[#FFF8EE]/75 hover:bg-white/10 hover:text-login-text">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
          <circle cx="12" cy="12" r="3" />
          {visible && <path d="M4 4l16 16" />}
        </svg>
      </button>
    </div>
  );
}

export function GlassButton({ loading, children, className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  return (
    <button type="submit" {...props} className={cx('flex h-[52px] w-full cursor-pointer items-center justify-center gap-2.5 rounded-[14px] bg-login-primary text-base font-semibold text-white shadow-[0_10px_24px_rgba(178,74,109,.35)] transition-colors hover:bg-login-primary-hover disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:bg-login-primary', className)}>
      {loading && <span className="login-spinner" aria-hidden="true" />}
      {children}
    </button>
  );
}

export function GlassLink({ children, className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" {...props} className={cx('cursor-pointer font-medium text-login-link underline-offset-2 hover:text-white hover:underline disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:text-login-link disabled:hover:no-underline', className)}>{children}</button>;
}

/** Mensagem geral (erro do servidor, aviso ou link vencido). */
export function GlassAlert({ tone = 'error', children }: { tone?: 'error' | 'info'; children: ReactNode }) {
  return (
    <p role={tone === 'error' ? 'alert' : 'status'} className={cx('rounded-[14px] border px-4 py-3 text-sm leading-normal', tone === 'error' ? 'border-login-error-border/60 bg-[#FF9CB4]/10 text-login-error' : 'border-white/20 bg-white/10 text-login-text')}>
      {children}
    </p>
  );
}
