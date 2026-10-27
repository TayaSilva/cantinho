import type { CSSProperties, ReactNode } from 'react';

/** Quantas tiras formam a folha: mais tiras = curva mais suave. */
const STRIPS = 8;

type Turn = 'next' | 'prev' | 'in';

interface PageLeafProps {
  /** Sentido do giro, define para onde a folha se curva. next: direita → esquerda; prev: esquerda → direita; in: volta da esquerda (celular). */
  turn: Turn;
  /** Lado da folha preso à lombada. */
  hinge: 'left' | 'right';
  front: ReactNode;
  back: ReactNode;
  /** Posição e giro da folha inteira (classes .book-leaf-*). */
  className: string;
}

/**
 * Folha de papel que se curva enquanto vira.
 * A folha é cortada em tiras encaixadas umas nas outras; cada tira gira um
 * pouquinho em relação à anterior, então a borda solta fica "atrasada" ou
 * "adiantada" em relação à lombada, como papel de verdade.
 */
export function PageLeaf({ turn, hinge, front, back, className }: PageLeafProps) {
  // Fatia k (contada a partir da borda esquerda da página) de cada face.
  const frontSlice = (i: number) => (hinge === 'left' ? i : STRIPS - 1 - i);
  const backSlice = (i: number) => (hinge === 'left' ? STRIPS - 1 - i : i);

  const strip = (i: number): ReactNode => (
    <div
      className={`book-strip book-strip-${hinge} ${i === 0 ? '' : `book-bend-${turn}`}`}
      style={{ width: i === 0 ? `${100 / STRIPS}%` : '100%', [hinge]: i === 0 ? 0 : '100%' } as CSSProperties}
    >
      <Slice k={frontSlice(i)} className="book-leaf-front">
        {front}
      </Slice>
      <Slice k={backSlice(i)} className="book-leaf-back">
        {back}
      </Slice>
      {i < STRIPS - 1 && strip(i + 1)}
    </div>
  );

  return (
    <div className={`book-leaf ${className}`} aria-hidden="true">
      {strip(0)}
    </div>
  );
}

/** Uma face de uma tira: mostra só o pedaço k da página inteira. */
function Slice({ k, className, children }: { k: number; className: string; children: ReactNode }) {
  return (
    <div className={`book-leaf-face ${className}`}>
      <div className="absolute inset-y-0" style={{ width: `${STRIPS * 100}%`, left: `${-k * 100}%` }}>
        {children}
        <div className="book-leaf-shade" />
      </div>
    </div>
  );
}

/** Barulhinho de papel, gerado na hora (sem arquivo de áudio). */
let audioCtx: AudioContext | null = null;
export function playPageSound() {
  try {
    audioCtx ??= new AudioContext();
    const ctx = audioCtx;
    const length = Math.floor(ctx.sampleRate * 0.45);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (0.6 + 0.4 * Math.random());
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 0.9;
    const t = ctx.currentTime;
    filter.frequency.setValueAtTime(900, t);
    filter.frequency.exponentialRampToValueAtTime(3800, t + 0.25);
    filter.frequency.exponentialRampToValueAtTime(1600, t + 0.45);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.12, t + 0.06);
    gain.gain.exponentialRampToValueAtTime(0.05, t + 0.22);
    gain.gain.exponentialRampToValueAtTime(0.14, t + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
    noise.connect(filter).connect(gain).connect(ctx.destination);
    noise.start(t);
    noise.stop(t + 0.45);
  } catch {
    // Sem áudio disponível: a página vira em silêncio.
  }
}
