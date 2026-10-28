import type { ReactNode } from 'react';
import { FaceA, FloorQuad, iso, pathLength, pts, RoundBox, shade, WrapFace } from './iso';

export type HairStyle =
  | 'short' | 'wavy' | 'curly' | 'coily' | 'long' | 'bob' | 'ponytail' | 'braids'
  | 'buzz' | 'sidepart' | 'quiff' | 'spiky' | 'fade' | 'manbun' | 'bald';

export interface HairSpec {
  top: number;
  cap?: number;
  /** Ponto mais alto quando há volume extra (topete, espetos, coque). */
  peak?: number;
  a: [number, number];
  c: [number, number];
  fringe: readonly number[];
  side: readonly number[];
  back?: number;
  /** Careca: não desenha cabelo. */
  none?: boolean;
}

export const SPECS: Record<HairStyle, HairSpec> = {
  short: { top: 38.6, a: [5.3, 14.6], c: [-1.6, 9.6], fringe: [31.5, 33, 33.5, 34, 34, 34.5, 35, 35, 34.5, 33.5, 32], side: [30, 30, 30.5, 31, 31, 31.5, 32.5, 33, 33.5] },
  wavy: { top: 38.8, a: [5, 14.7], c: [-2, 10], back: 22, fringe: [29.5, 31.5, 33, 34, 34.8, 35.2, 34.8, 34, 33, 31.5, 29.5], side: [24, 23, 24.5, 23.5, 25, 24.5, 26.5, 28, 30] },
  curly: { top: 39.2, a: [4.8, 14.9], c: [-2.2, 10.2], back: 26, fringe: [32.5, 33.8, 32.8, 34.2, 33.2, 34.5, 33.2, 34.2, 32.8, 33.8, 32.5], side: [27, 28.2, 27, 28.5, 27.5, 29, 29.5, 31, 32] },
  coily: { top: 48, cap: 38, a: [5.3, 14.6], c: [-1.6, 9.6], fringe: [34.6, 35.1, 34.7, 35.3, 34.9, 35.3, 34.9, 35.3, 34.7, 35.1, 34.6], side: [31.5, 32, 32.5, 32.5, 33, 33.5, 34, 34.3, 34.6] },
  long: { top: 38.6, a: [5.2, 14.6], c: [-1.8, 9.8], back: 15, fringe: [32.5, 33.2, 33.8, 34, 34, 34, 34, 34, 33.8, 33.2, 32.5], side: [16, 16.5, 17, 17.5, 18, 18.5, 19.5, 21, 23] },
  bob: { top: 38.9, a: [5, 14.8], c: [-2.1, 10.1], back: 26.5, fringe: [27.2, 32.6, 32.6, 32.6, 32.6, 32.6, 32.6, 32.6, 32.6, 32.6, 27.2], side: [26.8, 26.8, 26.8, 26.8, 26.8, 27, 27.3, 27.6, 28] },
  ponytail: { top: 38.3, a: [5.3, 14.6], c: [-1.6, 9.6], fringe: [33, 34.6, 35, 35.3, 35.5, 35.5, 35.3, 35, 34.6, 34.2, 33.6], side: [31, 31.5, 32, 32.5, 33, 33.5, 34, 34.2, 34.5] },
  braids: { top: 39, a: [5.2, 14.7], c: [-1.8, 9.8], back: 16, fringe: [32.5, 33.2, 33.8, 34, 34, 34, 33.8, 33.2, 32.5, 32, 31.5], side: [24, 24.5, 25, 25.5, 26, 27, 28, 29, 30] },
  buzz: { top: 37.1, a: [5.8, 14.25], c: [-1.15, 9.25], fringe: [34.6, 34.9, 35, 35, 35, 35, 35, 35, 35, 34.9, 34.6], side: [32, 32.2, 32.5, 32.8, 33.2, 33.6, 34, 34.4, 34.7] },
  sidepart: { top: 39.2, a: [5.2, 14.7], c: [-1.8, 9.8], fringe: [33.2, 33.6, 34, 34.4, 34.8, 35, 35.1, 35.1, 35, 34.4, 33.6], side: [30, 30.3, 30.6, 31, 31.4, 31.8, 32.4, 33, 33.6] },
  quiff: { top: 39.2, peak: 42, a: [5.4, 14.5], c: [-1.5, 9.5], fringe: [34.4, 34.9, 35.2, 35.3, 35.3, 35.3, 35.3, 35.3, 35.2, 34.9, 34.4], side: [31.5, 31.8, 32.2, 32.6, 33, 33.4, 33.8, 34.2, 34.5] },
  spiky: { top: 38.6, peak: 42, a: [5.3, 14.6], c: [-1.6, 9.6], fringe: [33.6, 34.6, 33.9, 34.8, 34.1, 35, 34.1, 34.8, 33.9, 34.6, 33.6], side: [30.5, 31, 31.2, 31.8, 32, 32.6, 33, 33.6, 34] },
  fade: { top: 41, a: [5.6, 14.3], c: [-1.3, 9.3], fringe: [34.7, 34.9, 34.9, 34.9, 34.9, 34.9, 34.9, 34.9, 34.9, 34.9, 34.7], side: [33.6, 33.7, 33.8, 33.9, 34, 34.1, 34.2, 34.4, 34.6] },
  manbun: { top: 38.4, peak: 42, a: [5.4, 14.5], c: [-1.5, 9.5], fringe: [34, 34.7, 35.1, 35.3, 35.4, 35.4, 35.4, 35.3, 35.1, 34.7, 34], side: [30.5, 31, 31.5, 32, 32.5, 33, 33.5, 34, 34.3] },
  bald: { top: 36, a: [6, 14], c: [-1, 9], fringe: [], side: [], none: true },
};

/** Cabeça: a [6, 14], c [cc - 1, cc + 9], quinas chanfradas em HEAD_R (ver Character). */
export const HEAD_R = 1.3;

export function normalizeHairStyle(value: string): HairStyle {
  return value in SPECS ? value as HairStyle : 'short';
}

/** Topo da cúpula do cabelo, sem topete, espetos ou coque. */
export function hairDomeTop(style: string): number {
  const spec = SPECS[normalizeHairStyle(style)];
  return spec.cap ?? spec.top;
}

export function hairTop(style: string): number {
  const spec = SPECS[normalizeHairStyle(style)];
  return spec.peak ?? spec.top;
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

const BAND = '#C2577A';

/**
 * Contorno da cabeça visto pela câmera, um pouco afastado da pele:
 * canto direito → frente → quina arredondada → lateral até a nuca.
 */
function headPath(cc: number): { path: [number, number][]; front: number } {
  const a2 = 14.13;
  const c1 = cc - 1;
  const c2 = cc + 9.12;
  const path: [number, number][] = [[a2, c1 + HEAD_R], [a2, c2 - HEAD_R], [a2 - HEAD_R, c2], [6, c2]];
  return { path, front: pathLength(path.slice(0, 3)) };
}

function fringeColumns(spec: HairSpec, p: HairPalette, cc: number): ReactNode[] {
  const out: ReactNode[] = [];
  const { path, front } = headPath(cc);
  const n = spec.fringe.length;
  spec.fringe.forEach((tip, index) => {
    const s: [number, number] = [front * index / n, front * (index + 1) / n];
    const base = spec === SPECS.wavy && index % 2 === 1 ? p.mid : index % 3 === 1 ? p.mid : p.base;
    out.push(<WrapFace key={`fringe-deep-${index}`} path={path} s={s} z={[tip - 0.7, tip]} fill={p.deep} />);
    out.push(<WrapFace key={`fringe-${index}`} path={path} s={s} z={[tip, Math.max(tip, 35.6)]} fill={base} />);
    if (index % 4 === 1) out.push(<WrapFace key={`fringe-light-${index}`} path={path} s={[s[0] + 0.1, s[1] - 0.12]} z={[Math.min(tip + 0.4, 34.8), 35.3]} fill={p.light} opacity={0.55} />);
  });
  return out;
}

function sideColumns(spec: HairSpec, p: HairPalette, cc: number): ReactNode[] {
  const out: ReactNode[] = [];
  const { path, front } = headPath(cc);
  const total = pathLength(path);
  const n = spec.side.length;
  // a lista vai da nuca para a frente; o caminho, da frente para a nuca
  spec.side.forEach((tip, index) => {
    const k = n - 1 - index;
    const s: [number, number] = [front + (total - front) * k / n, front + (total - front) * (k + 1) / n];
    const fill = spec === SPECS.wavy && index % 2 === 1 ? shade(p.side, -0.08) : p.side;
    out.push(<WrapFace key={`side-deep-${index}`} path={path} s={s} z={[tip - 0.7, tip]} fill={p.deep} />);
    out.push(<WrapFace key={`side-${index}`} path={path} s={s} z={[tip, 35.6]} fill={fill} />);
  });
  return out;
}

type ARange = (range: [number, number]) => [number, number];
const same: ARange = (range) => range;

/**
 * Volume principal (a "touca" de cabelo sobre a cabeça), em cúpula: o corpo tem
 * bordas bem inclinadas e uma coroa menor por cima, sem tampa reta aparente.
 */
function volume(spec: HairSpec, p: HairPalette, cc: number, A: ARange, z0: number, openBottom: boolean): ReactNode {
  const top = spec.cap ?? spec.top;
  const [a1, a2] = spec.a;
  const c: [number, number] = [cc + spec.c[0], cc + spec.c[1]];
  const crown = 2.2;
  return (
    <>
      <RoundBox a={A(spec.a)} c={c} z={[z0, top - 0.6]} r={2.6} bevel={2.2} color={p.base} top={p.base} side={p.side} outlineColor={p.deep} openBottom={openBottom} />
      <RoundBox a={A([a1 + crown, a2 - crown])} c={[c[0] + crown, c[1] - crown]} z={[top - 1.6, top]} r={1.8} bevel={1.2} color={p.base} top={p.mid} side={p.side} outline={false} />
    </>
  );
}

function afroPuff(p: HairPalette, cc: number, A: ARange, dots: boolean): ReactNode {
  const insets = [2.6, 1.4, 0.6, 0.2, 0, 0, 0.2, 0.6, 1.3, 2.4];
  const layers = insets.map((inset, index) => (
    <RoundBox
      key={`afro-layer-${index}`}
      a={A([5.4 + inset, 14.2 - inset])}
      c={[cc - 0.4 + inset * 0.55, cc + 8.4 - inset * 0.55]}
      z={[38 + index, 39 + index]}
      r={2.6 - inset * 0.3}
      bevel={index === insets.length - 1 ? 1 : 0}
      color={index % 3 === 0 ? p.top : p.base}
      top={p.top}
      side={p.side}
      outline={false}
    />
  ));
  const texture: ReactNode[] = [];
  if (dots) {
    [39.2, 41.1, 43, 44.9].forEach((z, row) => {
      [cc + 2.2, cc + 4, cc + 5.8].forEach((c, index) => {
        texture.push(<FaceA key={`afro-dot-${row}-${index}`} a={14.22} c={[c, c + 0.7]} z={[z, z + 0.7]} fill={(row + index) % 2 ? p.deep : p.light} opacity={0.8} />);
      });
    });
  }
  const band = A([5.4, 14.24]);
  return (
    <g>
      <RoundBox a={band} c={[cc - 0.45, cc + 8.45]} z={[37.6, 38.8]} r={2.2} bevel={0} color={BAND} outline={false} />
      {layers}
      {texture}
      {dots && <FaceA a={14.25} c={[cc + 2.6, cc + 4.6]} z={[47, 47.5]} fill={p.shine} opacity={0.55} />}
    </g>
  );
}

/** Espetos em forma de pirâmide sobre o topo da cabeça. */
function spikes(p: HairPalette, cc: number, A: ARange): ReactNode {
  const list: { a: [number, number]; c: [number, number]; h: number }[] = [];
  const heights = [2.6, 3.2, 2.4, 3.4, 3, 3.6, 2.8, 3.4, 3];
  [7, 9.4, 11.8].forEach((a, row) => {
    [cc + 0.2, cc + 3, cc + 5.8].forEach((c, col) => {
      list.push({ a: A([a, a + 2.8]), c: [c, c + 2.8], h: heights[row * 3 + col] });
    });
  });
  list.sort((u, v) => u.a[0] + u.c[0] - (v.a[0] + v.c[0]));
  const z = SPECS.spiky.top - 0.3;
  return (
    <g>
      {list.map(({ a, c, h }, index) => {
        const apex = iso((a[0] + a[1]) / 2 + 0.4, (c[0] + c[1]) / 2 + 0.4, z + h);
        const stroke = { stroke: p.deep, strokeWidth: 0.45, strokeLinejoin: 'round' as const };
        return (
          <g key={`spike-${index}`}>
            <polygon points={pts([iso(a[0], c[1], z), iso(a[1], c[1], z), apex])} fill={p.side} {...stroke} />
            <polygon points={pts([iso(a[1], c[0], z), iso(a[1], c[1], z), apex])} fill={index % 2 ? p.base : p.top} {...stroke} />
          </g>
        );
      })}
    </g>
  );
}

/** Peças por cima do volume: topete, espetos, coque, risca, textura. */
function topExtras(style: HairStyle, spec: HairSpec, p: HairPalette, cc: number, A: ARange, front: boolean): ReactNode {
  switch (style) {
    case 'quiff':
      return (
        <RoundBox a={A([10.4, 14.9])} c={[cc - 0.6, cc + 8.6]} z={[38.2, 42]} r={2.2} bevel={2.4} color={p.mid} top={p.top} side={p.side} outlineColor={p.deep} openBottom />
      );
    case 'spiky':
      return spikes(p, cc, A);
    case 'manbun':
      return (
        <>
          <RoundBox a={A([6.2, 9.6])} c={[cc + 2.3, cc + 5.7]} z={[38, 42]} r={1.3} bevel={1.2} color={p.base} top={p.top} side={p.side} outlineColor={p.deep} />
          <RoundBox a={A([6.4, 9.4])} c={[cc + 2.5, cc + 5.5]} z={[38, 38.9]} r={1.1} bevel={0} color={p.deep} outline={false} />
        </>
      );
    case 'sidepart': {
      const [a0, a1] = A([spec.a[0] + 2.2, spec.a[1] - 1.8]);
      return <FloorQuad a={[a0, a1]} c={[cc + 6.1, cc + 6.6]} z={spec.top} fill={p.deep} opacity={0.7} />;
    }
    case 'fade':
      if (!front) return null;
      return (
        <g>
          {[36.4, 38, 39.6].map((z, row) =>
            [cc + 1.2, cc + 3.2, cc + 5.2].map((c, index) => (
              <FaceA key={`fade-${row}-${index}`} a={spec.a[1] + 0.03} c={[c + (row % 2) * 0.9, c + (row % 2) * 0.9 + 0.7]} z={[z, z + 0.7]} fill={(row + index) % 2 ? p.deep : p.light} opacity={0.6} />
            )),
          )}
        </g>
      );
    case 'buzz':
      if (!front) return null;
      return [cc + 1.4, cc + 3.6, cc + 5.8].map((c, index) => (
        <FaceA key={`buzz-${index}`} a={spec.a[1] + 0.03} c={[c, c + 0.6]} z={[36.1 + (index % 2) * 0.5, 36.7 + (index % 2) * 0.5]} fill={p.light} opacity={0.45} />
      ));
    default:
      return null;
  }
}

export function HairBack({ style: styleValue, color, cc }: HairProps) {
  const style = normalizeHairStyle(styleValue);
  const spec = SPECS[style];
  const p = palette(color);
  if (spec.none) return null;
  const piece = { color: p.base, top: p.top, side: p.side, outlineColor: p.deep };
  return (
    <g className="hair-back">
      {spec.back !== undefined && <RoundBox a={[5.5, 8.8]} c={[cc - 1.4, cc + 9.4]} z={[spec.back, 36]} r={1.5} bevel={0.8} {...piece} />}
      {style === 'ponytail' && (
        <>
          <RoundBox a={[2.5, 6.5]} c={[cc - 3, cc + 1]} z={[37.2, 40]} r={1.4} bevel={1.2} {...piece} />
          <RoundBox a={[2.4, 6.1]} c={[cc - 2.6, cc + 0.8]} z={[29, 37.5]} r={1.4} bevel={0} {...piece} outline={false} />
          <RoundBox a={[2.8, 5.5]} c={[cc - 2.1, cc + 0.5]} z={[24.5, 29]} r={1.1} bevel={0} {...piece} outline={false} />
        </>
      )}
      {style === 'braids' && (
        <>
          <RoundBox a={[2.4, 5.2]} c={[cc - 3, cc + 0.5]} z={[22, 36]} r={1.2} bevel={0.8} {...piece} />
          <RoundBox a={[2.4, 5.2]} c={[cc + 8.5, cc + 12]} z={[22, 36]} r={1.2} bevel={0.8} {...piece} />
        </>
      )}
    </g>
  );
}

export function HairFront({ style: styleValue, color, cc }: HairProps) {
  const style = normalizeHairStyle(styleValue);
  const spec = SPECS[style];
  const p = palette(color);
  if (spec.none) return null;
  return (
    <g className="hair-front">
      {volume(spec, p, cc, same, 35.5, true)}
      {style === 'coily' && afroPuff(p, cc, same, true)}
      {topExtras(style, spec, p, cc, same, true)}
      {fringeColumns(spec, p, cc)}
      {sideColumns(spec, p, cc)}
      {style === 'ponytail' && <FaceA a={14.62} c={[cc + 0.9, cc + 2.9]} z={[36.6, 37.5]} fill={BAND} />}
      {style === 'braids' && (
        <>
          <FaceA a={14.3} c={[cc - 1.2, cc + 0.8]} z={[34.5, 35.5]} fill={p.deep} />
          <FaceA a={14.3} c={[cc + 9.2, cc + 11.2]} z={[34.5, 35.5]} fill={p.deep} />
        </>
      )}
    </g>
  );
}

/** Cabelo visto de costas (sofá da frente): o eixo a é espelhado a partir de `backA`. */
export function HairBackView({ style: styleValue, color, cc, backA }: HairProps & { backA: number }) {
  const style = normalizeHairStyle(styleValue);
  const spec = SPECS[style];
  const p = palette(color);
  if (spec.none) return null;
  const a = ([lo, hi]: readonly [number, number]): [number, number] => [backA - hi, backA - lo];
  const piece = { color: p.base, top: p.top, side: p.side, outlineColor: p.deep };
  const nape = style === 'buzz' || style === 'fade' ? 32.5 : style === 'quiff' || style === 'spiky' || style === 'sidepart' || style === 'manbun' ? 30.5 : 29;
  return (
    <g className="hair-back">
      {/* visto de costas, o topete fica atrás do volume */}
      {style === 'quiff' && topExtras(style, spec, p, cc, a, false)}
      {volume(spec, p, cc, a, nape, false)}
      {style === 'coily' && afroPuff(p, cc, a, false)}
      {style !== 'quiff' && topExtras(style, spec, p, cc, a, false)}
      {spec.back !== undefined && <RoundBox a={a([5.5, 8.8])} c={[cc - 1.4, cc + 9.4]} z={[spec.back, spec.top - 0.8]} r={1.6} bevel={1.6} {...piece} />}
      {style === 'ponytail' && (
        <>
          <RoundBox a={a([2.4, 6.1])} c={[cc + 2.3, cc + 5.7]} z={[26, 37.5]} r={1.4} bevel={1} {...piece} />
          <FaceA a={backA - 2.35} c={[cc + 2.6, cc + 5.4]} z={[36, 37]} fill={BAND} />
        </>
      )}
    </g>
  );
}
