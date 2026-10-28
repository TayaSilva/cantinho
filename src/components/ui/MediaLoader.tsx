import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';

/**
 * Carregamento em pixel art para fotos e vídeos.
 *
 * Três fases, sempre nesta ordem:
 *   1. "fill"  — anel de 12 blocos se preenchendo, um bloco por vez (1,2 s);
 *   2. "house" — o anel se recolhe e uma casinha se monta de baixo para cima (1,5 s);
 *   3. "spin"  — o anel volta e fica girando (bloco aceso correndo) até a mídia carregar.
 *
 * Só aparece se a mídia demorar mais de 150 ms (nada de piscar quando ela já está
 * no cache). Quando `done` vira true, o loader some com um fade curto, em qualquer
 * fase: a animação nunca segura a foto.
 */

type Phase = 'wait' | 'fill' | 'house' | 'spin' | 'out' | 'gone';

const FILL_MS = 1200;
const HOUSE_MS = 1500;
const SHOW_AFTER_MS = 150;
const FADE_MS = 220;

/** 12 blocos 2 × 2 em volta do centro de uma grade 16 × 16, começando no topo, sentido horário. */
const RING = Array.from({ length: 12 }, (_, i) => {
  const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
  return { x: Math.round(8 + 6 * Math.cos(a) - 1), y: Math.round(8 + 6 * Math.sin(a) - 1) };
});

/**
 * Casinha 16 × 13: O contorno, R telhado, r telhado claro, C chaminé,
 * W parede, w parede sombra, Y janela acesa, D porta, k maçaneta.
 */
const HOUSE = [
  '       OO OOOO  ',
  '      ORrOOCCO  ',
  '     ORrrROCCO  ',
  '    ORrRRRROCO  ',
  '   ORRRRRRRROO  ',
  '  ORRRRRRRRRRO  ',
  ' OOOOOOOOOOOOOO ',
  '  OwWWWWWWWWWO  ',
  '  OwYYWWWDDWWO  ',
  '  OwYYWWWDDWWO  ',
  '  OwWWWWWDkWWO  ',
  '  OwWWWWWDDWWO  ',
  '  OOOOOOOOOOOO  ',
];

interface Tones {
  ring: string;
  ringOff: string;
  outline: string;
  text: string;
}

const TONES: Record<'light' | 'dark', Tones> = {
  light: { ring: '#C98190', ringOff: '#EBD9D2', outline: '#46353F', text: '#6E5862' },
  dark: { ring: '#F2A7B5', ringOff: '#5A4450', outline: '#1E161D', text: '#E7BCAC' },
};

const HOUSE_COLORS = (t: Tones): Record<string, string> => ({
  O: t.outline,
  R: '#C98190',
  r: '#E3A1AE',
  C: '#A7755B',
  W: '#FFF6E8',
  w: '#F4D9C6',
  Y: '#FFD89A',
  D: '#A7755B',
  k: '#F8E6B5',
});

export function MediaLoader({ done, kind = 'foto', tone = 'light' }: { done: boolean; kind?: 'foto' | 'vídeo'; tone?: 'light' | 'dark' }) {
  const [phase, setPhase] = useState<Phase>('wait');

  // linha do tempo: espera curta → anel enchendo → casinha → anel girando
  useEffect(() => {
    if (done) return;
    const t1 = window.setTimeout(() => setPhase('fill'), SHOW_AFTER_MS);
    const t2 = window.setTimeout(() => setPhase('house'), SHOW_AFTER_MS + FILL_MS);
    const t3 = window.setTimeout(() => setPhase('spin'), SHOW_AFTER_MS + FILL_MS + HOUSE_MS);
    return () => [t1, t2, t3].forEach((t) => window.clearTimeout(t));
  }, [done]);

  // carregou: some com fade (ou nem aparece, se ainda estava esperando)
  useEffect(() => {
    if (!done) {
      setPhase((p) => (p === 'gone' || p === 'out' ? 'wait' : p));
      return;
    }
    setPhase((p) => (p === 'wait' ? 'gone' : 'out'));
    const t = window.setTimeout(() => setPhase('gone'), FADE_MS);
    return () => window.clearTimeout(t);
  }, [done]);

  if (phase === 'wait' || phase === 'gone') return null;

  const t = TONES[tone];
  const colors = HOUSE_COLORS(t);
  const label = `Carregando ${kind}…`;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`media-loader pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 ${phase === 'out' ? 'media-loader-out' : ''}`}
    >
      <svg viewBox="0 0 16 16" width={80} height={80} shapeRendering="crispEdges" aria-hidden="true" className="overflow-visible" style={{ color: t.ring }}>
        {/* anel: enchendo (fase 1), recolhido (fase 2) ou girando (fase 3) */}
        {phase !== 'house' && (
          <g className="ml-ring">
            {RING.map((b, i) => (
              <rect
                key={i}
                x={b.x}
                y={b.y}
                width={2}
                height={2}
                fill={t.ring}
                className={phase === 'fill' ? 'ml-fill' : phase === 'spin' ? 'ml-chase' : undefined}
                style={
                  {
                    '--off': t.ringOff,
                    animationDelay: phase === 'fill' ? `${(i * FILL_MS) / RING.length}ms` : phase === 'spin' ? `${-((RING.length - i) * 900) / RING.length}ms` : undefined,
                  } as CSSProperties
                }
              />
            ))}
          </g>
        )}
        {/* casinha: se monta linha por linha, de baixo para cima, e dá um pulinho */}
        {phase === 'house' && (
          <g className="ml-house" transform="translate(0 1.5)">
            {HOUSE.map((row, y) =>
              [...row].map((ch, x) =>
                colors[ch] ? (
                  <rect
                    key={`${x}-${y}`}
                    x={x}
                    y={y}
                    width={1}
                    height={1}
                    fill={colors[ch]}
                    className="ml-row"
                    style={{ animationDelay: `${(HOUSE.length - 1 - y) * 45}ms` }}
                  />
                ) : null,
              ),
            )}
          </g>
        )}
      </svg>
      <span className="font-pixel text-sm" style={{ color: t.text }}>
        {label}
      </span>
    </div>
  );
}
