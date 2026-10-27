import type { ReactNode } from 'react';
import { FaceA, FaceC, IsoBox, shade } from './iso';

export type HairStyle = 'short' | 'wavy' | 'curly' | 'coily' | 'long' | 'bob' | 'ponytail';

export interface HairSpec {
  top: number;
  cap?: number;
  a: [number, number];
  c: [number, number];
  fringe: readonly number[];
  side: readonly number[];
  back?: number;
}

export const SPECS: Record<HairStyle, HairSpec> = {
  short: { top: 38.6, a: [5.3, 14.6], c: [-1.6, 9.6], fringe: [31.5, 33, 33.5, 34, 34, 34.5, 35, 35, 34.5, 33.5, 32], side: [30, 30, 30.5, 31, 31, 31.5, 32.5, 33, 33.5] },
  wavy: { top: 38.8, a: [5, 14.7], c: [-2, 10], back: 22, fringe: [29.5, 31.5, 33, 34, 34.8, 35.2, 34.8, 34, 33, 31.5, 29.5], side: [24, 23, 24.5, 23.5, 25, 24.5, 26.5, 28, 30] },
  curly: { top: 39.2, a: [4.8, 14.9], c: [-2.2, 10.2], back: 26, fringe: [32.5, 33.8, 32.8, 34.2, 33.2, 34.5, 33.2, 34.2, 32.8, 33.8, 32.5], side: [27, 28.2, 27, 28.5, 27.5, 29, 29.5, 31, 32] },
  coily: { top: 48, cap: 38, a: [5.3, 14.6], c: [-1.6, 9.6], fringe: [34.6, 35.1, 34.7, 35.3, 34.9, 35.3, 34.9, 35.3, 34.7, 35.1, 34.6], side: [31.5, 32, 32.5, 32.5, 33, 33.5, 34, 34.3, 34.6] },
  long: { top: 38.6, a: [5.2, 14.6], c: [-1.8, 9.8], back: 15, fringe: [32.5, 33.2, 33.8, 34, 34, 34, 34, 34, 33.8, 33.2, 32.5], side: [16, 16.5, 17, 17.5, 18, 18.5, 19.5, 21, 23] },
  bob: { top: 38.9, a: [5, 14.8], c: [-2.1, 10.1], back: 26.5, fringe: [27.2, 32.6, 32.6, 32.6, 32.6, 32.6, 32.6, 32.6, 32.6, 32.6, 27.2], side: [26.8, 26.8, 26.8, 26.8, 26.8, 27, 27.3, 27.6, 28] },
  ponytail: { top: 38.3, a: [5.3, 14.6], c: [-1.6, 9.6], fringe: [33, 34.6, 35, 35.3, 35.5, 35.5, 35.3, 35, 34.6, 34.2, 33.6], side: [31, 31.5, 32, 32.5, 33, 33.5, 34, 34.2, 34.5] },
};

export function normalizeHairStyle(value: string): HairStyle {
  return value in SPECS ? value as HairStyle : 'short';
}

export function hairTop(style: string): number {
  return SPECS[normalizeHairStyle(style)].top;
}

interface HairProps {
  style: string;
  color: string;
  cc: number;
}

interface HairPalette {
  base: string;
  top: string;
  mid: string;
  light: string;
  shine: string;
  side: string;
  deep: string;
}

function palette(color: string): HairPalette {
  return {
    base: color,
    top: shade(color, -0.12),
    mid: shade(color, 0.07),
    light: shade(color, -0.35),
    shine: shade(color, -0.55),
    side: shade(color, 0.18),
    deep: shade(color, 0.42),
  };
}

function colRange(start: number, end: number, index: number, count: number): [number, number] {
  return [start + (end - start) * index / count, start + (end - start) * (index + 1) / count];
}

function fringeColumns(spec: HairSpec, p: HairPalette, cc: number): ReactNode[] {
  const out: ReactNode[] = [];
  const start = cc - 1;
  const end = cc + 9;
  spec.fringe.forEach((tip, index) => {
    const c = colRange(start, end, index, spec.fringe.length);
    const base = spec === SPECS.wavy && index % 2 === 1 ? p.mid : index % 3 === 1 ? p.mid : p.base;
    out.push(<FaceA key={`fringe-deep-${index}`} a={14.09} c={c} z={[tip - 0.7, tip]} fill={p.deep} />);
    out.push(<FaceA key={`fringe-${index}`} a={14.13} c={c} z={[tip, Math.max(tip, 35.45)]} fill={base} />);
    if (index % 4 === 1) out.push(<FaceA key={`fringe-light-${index}`} a={14.16} c={[c[0] + 0.08, c[1] - 0.12]} z={[Math.min(tip + 0.4, 34.8), 35.3]} fill={p.light} opacity={0.55} />);
  });
  return out;
}

function sideColumns(spec: HairSpec, p: HairPalette, cc: number): ReactNode[] {
  const out: ReactNode[] = [];
  const start = 6;
  const end = 14;
  spec.side.forEach((tip, index) => {
    const a = colRange(start, end, index, spec.side.length);
    const fill = spec === SPECS.wavy && index % 2 === 1 ? shade(p.side, -0.08) : p.side;
    out.push(<FaceC key={`side-deep-${index}`} a={a} c={cc + 9.08} z={[tip - 0.7, tip]} fill={p.deep} />);
    out.push(<FaceC key={`side-${index}`} a={a} c={cc + 9.12} z={[tip, 35.45]} fill={fill} />);
  });
  return out;
}

function afroPuff(p: HairPalette, cc: number): ReactNode {
  const insets = [2.6, 1.4, 0.6, 0.2, 0, 0, 0.2, 0.6, 1.3, 2.4];
  const layers = insets.map((inset, index) => (
    <IsoBox
      key={`afro-layer-${index}`}
      a={[5.4 + inset, 14.2 - inset]}
      c={[cc - 0.4 + inset * 0.55, cc + 8.4 - inset * 0.55]}
      z={[38 + index, 39 + index]}
      color={index % 3 === 0 ? p.top : p.base}
      side={p.side}
      outline={false}
    />
  ));
  const dots: ReactNode[] = [];
  [39.2, 41.1, 43, 44.9].forEach((z, row) => {
    [cc + 0.4, cc + 2.2, cc + 4, cc + 5.8, cc + 7.6].forEach((c, index) => {
      dots.push(<FaceA key={`afro-dot-${row}-${index}`} a={14.22} c={[c, c + 0.7]} z={[z, z + 0.7]} fill={(row + index) % 2 ? p.deep : p.light} opacity={0.8} />);
    });
  });
  return (
    <g>
      {layers}
      <FaceA a={14.24} c={[cc - 0.25, cc + 8.15]} z={[37.6, 38.8]} fill="#C2577A" />
      <FaceC a={[5.4, 14.2]} c={cc + 8.3} z={[37.8, 38.6]} fill="#C2577A" />
      {dots}
      <FaceA a={14.25} c={[cc + 1.2, cc + 3.8]} z={[47, 47.5]} fill={p.shine} opacity={0.55} />
    </g>
  );
}

export function HairBack({ style: styleValue, color, cc }: HairProps) {
  const style = normalizeHairStyle(styleValue);
  const spec = SPECS[style];
  const p = palette(color);
  return (
    <g className="hair-back">
      {spec.back !== undefined && <IsoBox a={[5.5, 8.8]} c={[cc - 1.4, cc + 9.4]} z={[spec.back, 36]} color={p.base} side={p.side} outlineColor={p.deep} />}
      {style === 'ponytail' && (
        <>
          <IsoBox a={[2.5, 6.5]} c={[cc - 3, cc + 1]} z={[37.2, 40]} color={p.base} side={p.side} outlineColor={p.deep} />
          <IsoBox a={[2.4, 6.1]} c={[cc - 2.6, cc + 0.8]} z={[29, 37.5]} color={p.base} side={p.side} outlineColor={p.deep} outline={false} />
          <IsoBox a={[2.8, 5.5]} c={[cc - 2.1, cc + 0.5]} z={[24.5, 29]} color={p.base} side={p.side} outlineColor={p.deep} outline={false} />
        </>
      )}
    </g>
  );
}

export function HairFront({ style: styleValue, color, cc }: HairProps) {
  const style = normalizeHairStyle(styleValue);
  const spec = SPECS[style];
  const p = palette(color);
  const volumeTop = spec.cap ?? spec.top;
  const volume = (
    <>
      <IsoBox a={spec.a} c={[cc + spec.c[0], cc + spec.c[1]]} z={[35.5, volumeTop]} color={p.base} top={p.top} side={p.side} outline={false} />
      <IsoBox a={[spec.a[0] + 0.55, spec.a[1] - 0.55]} c={[cc + spec.c[0] + 0.6, cc + spec.c[1] - 0.6]} z={[volumeTop - 1.1, volumeTop]} color={p.base} top={p.top} side={p.side} outlineColor={p.deep} />
    </>
  );
  return (
    <g className="hair-front">
      {volume}
      {style === 'coily' && afroPuff(p, cc)}
      {fringeColumns(spec, p, cc)}
      {sideColumns(spec, p, cc)}
      {style === 'ponytail' && <FaceA a={14.3} c={[cc - 0.5, cc + 1.8]} z={[36.5, 37.4]} fill="#C2577A" />}
    </g>
  );
}

/** Cabelo visto de costas (sofá da frente): o eixo a é espelhado a partir de `backA`. */
export function HairBackView({ style: styleValue, color, cc, backA }: HairProps & { backA: number }) {
  const style = normalizeHairStyle(styleValue);
  const spec = SPECS[style];
  const p = palette(color);
  const a = ([lo, hi]: readonly [number, number]): [number, number] => [backA - hi, backA - lo];
  return (
    <g className="hair-back">
      <IsoBox a={a(spec.a)} c={[cc + spec.c[0], cc + spec.c[1]]} z={[29, spec.cap ?? spec.top]} color={p.base} top={p.top} side={p.side} outlineColor={p.deep} />
      {style === 'coily' && (
        <>
          <IsoBox a={a([5.4, 14.2])} c={[cc - 0.4, cc + 8.4]} z={[38, 48]} color={p.base} top={p.top} side={p.side} outlineColor={p.deep} />
          <FaceA a={backA - 5.35} c={[cc - 0.4, cc + 8.4]} z={[37.6, 38.8]} fill="#C2577A" />
        </>
      )}
      {spec.back !== undefined && <IsoBox a={a([5.5, 8.8])} c={[cc - 1.4, cc + 9.4]} z={[spec.back, 36]} color={p.base} top={p.top} side={p.side} outlineColor={p.deep} />}
      {style === 'ponytail' && (
        <>
          <IsoBox a={a([2.4, 6.1])} c={[cc + 2.3, cc + 5.7]} z={[26, 37.5]} color={p.base} side={p.side} outlineColor={p.deep} />
          <FaceA a={backA - 2.35} c={[cc + 2.3, cc + 5.7]} z={[36, 37]} fill="#C2577A" />
        </>
      )}
    </g>
  );
}
