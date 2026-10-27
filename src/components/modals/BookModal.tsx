import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import type { Letter } from '../../types/house';
import { useAudio } from '../ui/AudioControl';
import { PixelButton } from '../ui/PixelButton';
import { BaseModal } from './BaseModal';
import { PageLeaf, playPageSound } from './PageLeaf';

interface BookModalProps {
  open: boolean;
  onClose: () => void;
  letters: Letter[];
  /** Cor da capa (opção "Livro: capa e cor" do editor). */
  coverColor?: string;
}

type Flip = { dir: 'next' | 'prev'; to: number } | null;

/** Duração da virada de página (ms). */
const FLIP_MS = 1000;

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setMatches(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}

/**
 * Livro de cartas com virada de página de verdade:
 * no computador o livro fica aberto em duas páginas e a folha gira presa à lombada;
 * no celular é uma página só, que vira como a de um caderno.
 * Navegue pelos botões, pelo cantinho dobrado da página ou pelas setas ← →.
 */
export function BookModal({ open, onClose, letters, coverColor = '#8A5D46' }: BookModalProps) {
  const [index, setIndex] = useState(0);
  const [flip, setFlip] = useState<Flip>(null);
  const wide = useMediaQuery('(min-width: 640px)');
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const { muted } = useAudio();
  const total = letters.length;

  // Termina a virada (por tempo, para não depender de animationend em todos os navegadores).
  useEffect(() => {
    if (!flip) return;
    const id = window.setTimeout(() => {
      setIndex(flip.to);
      setFlip(null);
    }, FLIP_MS);
    return () => window.clearTimeout(id);
  }, [flip]);

  // Ao fechar, interrompe qualquer virada pela metade.
  useEffect(() => {
    if (!open && flip) {
      setIndex(flip.to);
      setFlip(null);
    }
  }, [open, flip]);

  if (total === 0) {
    return (
      <BaseModal open={open} onClose={onClose} title="Estante · Livro de cartas" widthClass="max-w-[540px]">
        <p className="p-6 text-center">Ainda não há cartas no livro.</p>
      </BaseModal>
    );
  }

  const go = (dir: 'next' | 'prev') => {
    if (flip || total < 2) return;
    const to = (index + (dir === 'next' ? 1 : -1) + total) % total;
    if (!muted) playPageSound();
    if (reducedMotion) setIndex(to);
    else setFlip({ dir, to });
  };

  const current = letters[index];
  const target = flip ? letters[flip.to] : current;
  const shownNumber = (flip ? flip.to : index) + 1;
  const stageStyle = { '--flip-duration': `${FLIP_MS}ms` } as CSSProperties;

  return (
    <BaseModal
      open={open}
      onClose={onClose}
      title="Estante · Livro de cartas"
      look="bare"
      widthClass="max-w-[880px]"
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') go('prev');
        if (e.key === 'ArrowRight') go('next');
      }}
    >
      <div className="flex flex-col gap-3.5 p-3 sm:p-0">
        {/* capa: moldura de madeira em volta das páginas */}
        <div className="border-4 border-ink-deep p-2.5 shadow-[8px_8px_0_rgba(0,0,0,.35)] sm:p-3" style={{ backgroundColor: coverColor }}>
          {/* bordas das folhas empilhadas */}
          <div className="relative border-b-[3px] border-[#D9C08A] shadow-[0_3px_0_#E9D3A0,0_6px_0_#D9C08A]">
            <div className="book-stage relative h-[460px] sm:h-[420px]" style={stageStyle}>
              {wide ? (
                <Spread current={current} target={target} flip={flip} index={index} total={total} onNext={() => go('next')} onPrev={() => go('prev')} />
              ) : (
                <SingleSheet current={current} target={target} flip={flip} index={index} total={total} onNext={() => go('next')} />
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <PixelButton variant="primary" size="sm" onClick={() => go('prev')} disabled={!!flip || total < 2}>
            ‹ <span className="sm:hidden">Anterior</span><span className="hidden sm:inline">Carta anterior</span>
          </PixelButton>
          <span className="whitespace-nowrap font-pixel text-sm text-highlight" aria-live="polite">
            Carta {shownNumber} de {total}
          </span>
          <PixelButton variant="primary" size="sm" onClick={() => go('next')} disabled={!!flip || total < 2} data-autofocus>
            <span className="sm:hidden">Próxima</span><span className="hidden sm:inline">Próxima carta</span> ›
          </PixelButton>
        </div>
      </div>
    </BaseModal>
  );
}

/* ------------------------------------------------------------------
 * Livro aberto (duas páginas)
 * ------------------------------------------------------------------ */

interface SpreadProps {
  current: Letter;
  target: Letter;
  flip: Flip;
  index: number;
  total: number;
  onNext: () => void;
  onPrev: () => void;
}

function Spread({ current, target, flip, index, total, onNext, onPrev }: SpreadProps) {
  const targetIndex = flip ? flip.to : index;
  // O que fica parado embaixo da folha que gira:
  const baseLeft = flip?.dir === 'prev' ? target : current;
  const baseLeftIndex = flip?.dir === 'prev' ? targetIndex : index;
  const baseRight = flip?.dir === 'next' ? target : current;

  return (
    <div className="absolute inset-0 grid grid-cols-2" style={{ transformStyle: 'preserve-3d' }}>
      {/* páginas paradas */}
      <div className="relative">
        <LeftPage letter={baseLeft} number={baseLeftIndex + 1} total={total} />
        {!flip && total > 1 && <Corner side="left" onClick={onPrev} />}
        {flip?.dir === 'prev' && <div className="book-cast-shadow left-0 w-full bg-[linear-gradient(to_left,rgb(70_53_63/.45),transparent_60%)]" />}
      </div>
      <div className="relative">
        <RightPage letter={baseRight} />
        {!flip && total > 1 && <Corner side="right" onClick={onNext} />}
        {flip?.dir === 'next' && <div className="book-cast-shadow left-0 w-full bg-[linear-gradient(to_right,rgb(70_53_63/.45),transparent_60%)]" />}
      </div>

      {/* lombada */}
      <div aria-hidden="true" className="book-spine pointer-events-none absolute inset-y-0 left-1/2 z-20 w-10 -translate-x-1/2" />

      {/* folha girando (e se curvando) */}
      {flip?.dir === 'next' && (
        <PageLeaf
          turn="next"
          hinge="left"
          className="book-leaf-next z-30"
          front={<RightPage letter={current} />}
          back={<LeftPage letter={target} number={targetIndex + 1} total={total} />}
        />
      )}
      {flip?.dir === 'prev' && (
        <PageLeaf
          turn="prev"
          hinge="right"
          className="book-leaf-prev z-30"
          front={<LeftPage letter={current} number={index + 1} total={total} />}
          back={<RightPage letter={target} />}
        />
      )}
    </div>
  );
}

function LeftPage({ letter, number, total }: { letter: Letter; number: number; total: number }) {
  return (
    <div className="relative flex h-full flex-col gap-3 border-r-[3px] border-[#D9C08A] bg-[#FBEFD6] p-8 text-ink">
      <span className="font-pixel text-sm text-plum">
        Carta {number} de {total}
      </span>
      <h3 className="font-pixel text-[30px] font-semibold leading-tight">{letter.title}</h3>
      <span className="text-sm text-muted">{letter.date}</span>
      <Envelope className="mt-auto" />
      <PageNumber n={number * 2 - 1} side="left" />
    </div>
  );
}

function RightPage({ letter }: { letter: Letter }) {
  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto bg-[#FFF6E3] p-8 text-ink">
      <p className="whitespace-pre-line text-[17px] leading-relaxed">{letter.body}</p>
      <p className="mt-auto font-pixel text-lg">— {letter.author}</p>
    </div>
  );
}

/* ------------------------------------------------------------------
 * Celular (uma página por vez)
 * ------------------------------------------------------------------ */

interface SingleSheetProps {
  current: Letter;
  target: Letter;
  flip: Flip;
  index: number;
  total: number;
  onNext: () => void;
}

function SingleSheet({ current, target, flip, index, total, onNext }: SingleSheetProps) {
  const targetIndex = flip ? flip.to : index;
  // Próxima: a página atual vira e revela a nova embaixo.
  // Anterior: a página antiga volta virando por cima da atual.
  const base = flip?.dir === 'next' ? target : current;
  const baseIndex = flip?.dir === 'next' ? targetIndex : index;

  return (
    <div className="absolute inset-0" style={{ transformStyle: 'preserve-3d' }}>
      <div className="relative h-full">
        <FullPage letter={base} number={baseIndex + 1} total={total} />
        {!flip && total > 1 && <Corner side="right" onClick={onNext} />}
        {flip && <div className="book-cast-shadow left-0 w-full bg-[linear-gradient(to_right,rgb(70_53_63/.4),transparent_70%)]" />}
      </div>
      {flip && (
        <PageLeaf
          turn={flip.dir === 'next' ? 'next' : 'in'}
          hinge="left"
          className={`z-30 ${flip.dir === 'next' ? 'book-leaf-single-next' : 'book-leaf-single-prev'}`}
          front={flip.dir === 'next' ? <FullPage letter={current} number={index + 1} total={total} /> : <FullPage letter={target} number={targetIndex + 1} total={total} />}
          back={<div className="h-full bg-[#F3E4C4]" />}
        />
      )}
    </div>
  );
}

function FullPage({ letter, number, total }: { letter: Letter; number: number; total: number }) {
  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto bg-[#FFF6E3] p-6 text-ink">
      <span className="font-pixel text-sm text-plum">
        Carta {number} de {total}
      </span>
      <h3 className="font-pixel text-2xl font-semibold leading-tight">{letter.title}</h3>
      <span className="text-sm text-muted">{letter.date}</span>
      <p className="whitespace-pre-line text-base leading-relaxed">{letter.body}</p>
      <p className="mt-auto font-pixel text-lg">— {letter.author}</p>
    </div>
  );
}

/* ------------------------------------------------------------------
 * Detalhes
 * ------------------------------------------------------------------ */

/** Cantinho dobrado: clicar vira a página. */
function Corner({ side, onClick }: { side: 'left' | 'right'; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === 'right' ? 'Virar para a próxima carta' : 'Voltar para a carta anterior'}
      title={side === 'right' ? 'Virar página' : 'Voltar página'}
      className={`page-corner absolute bottom-0 z-10 size-8 cursor-pointer border-0 p-0 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-rug ${
        side === 'right' ? 'right-0' : 'page-corner-left left-0'
      }`}
    />
  );
}

function PageNumber({ n, side }: { n: number; side: 'left' | 'right' }) {
  return (
    <span aria-hidden="true" className={`absolute bottom-3 font-pixel text-xs text-muted ${side === 'left' ? 'left-12' : 'right-12'}`}>
      {n}
    </span>
  );
}

function Envelope({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="96" height="72" viewBox="0 0 16 12" shapeRendering="crispEdges" aria-hidden="true">
      <rect x="1" y="2" width="14" height="9" fill="#F4D9C6" />
      <polygon points="1,2 8,7 15,2" fill="#E7BCAC" />
      <path d="M6 6h1v-1h1v1h1v-1h1v1h1v1h-1v1h-1v1h-1v-1h-1v-1h-1z" fill="#C98190" />
      <rect x="1" y="2" width="14" height="1" fill="#A7755B" />
    </svg>
  );
}
