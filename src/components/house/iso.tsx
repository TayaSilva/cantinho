/**
 * Ferramentas de desenho isométrico (grade 2:1).
 *
 * Coordenadas do mundo:
 *   a = ao longo da parede direita (0 = canto do fundo, 120 = canto direito)
 *   c = ao longo da parede esquerda (0 = canto do fundo, 120 = canto esquerdo)
 *   z = altura
 *
 * Também há transformações para desenhar "achatado" sobre uma parede ou o piso:
 * dentro desses grupos, desenhe retângulos e círculos normais em (u, v).
 */
import type { ReactNode, SVGProps } from 'react';
import type { Rect } from '../../types/house';

export type Pt = [number, number];

export const iso = (a: number, c: number, z = 0): Pt => [160 + a - c, 92 + 0.5 * a + 0.5 * c - z];

export const pts = (list: Pt[]) => list.map(([x, y]) => `${+x.toFixed(2)},${+y.toFixed(2)}`).join(' ');

/** Escurece (amount > 0) ou clareia (amount < 0) uma cor hex. */
export function shade(hex: string, amount: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) =>
    Math.round(amount >= 0 ? v * (1 - amount) : v + (255 - v) * -amount),
  );
  return `#${ch.map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('')}`;
}

export const OUTLINE = '#4A3540';

export interface IsoBoxSpec {
  a: [number, number];
  c: [number, number];
  z: [number, number];
  color: string;
  top?: string;
  side?: string;
  front?: string;
  outline?: boolean;
  outlineColor?: string;
  className?: string;
}

export function boxPoints({ a, c, z }: Pick<IsoBoxSpec, 'a' | 'c' | 'z'>): Pt[] {
  const out: Pt[] = [];
  for (const aa of a) for (const cc of c) for (const zz of z) out.push(iso(aa, cc, zz));
  return out;
}

/** Caixa isométrica com as 3 faces visíveis. */
export function IsoBox(spec: IsoBoxSpec) {
  const [a1, a2] = spec.a;
  const [c1, c2] = spec.c;
  const [z1, z2] = spec.z;
  const top = spec.top ?? shade(spec.color, -0.15);
  const side = spec.side ?? shade(spec.color, 0.2);
  const front = spec.front ?? spec.color;
  const stroke = spec.outline === false ? {} : { stroke: spec.outlineColor ?? OUTLINE, strokeWidth: 0.8, strokeLinejoin: 'round' as const };
  return (
    <g className={spec.className}>
      <polygon points={pts([iso(a1, c2, z1), iso(a2, c2, z1), iso(a2, c2, z2), iso(a1, c2, z2)])} fill={side} {...stroke} />
      <polygon points={pts([iso(a2, c1, z1), iso(a2, c2, z1), iso(a2, c2, z2), iso(a2, c1, z2)])} fill={front} {...stroke} />
      <polygon points={pts([iso(a1, c1, z2), iso(a2, c1, z2), iso(a2, c2, z2), iso(a1, c2, z2)])} fill={top} {...stroke} />
    </g>
  );
}

/** Mistura duas cores hex (t = 0 → a, t = 1 → b). */
export function mix(a: string, b: string, t: number): string {
  const ca = parseInt(a.replace('#', ''), 16);
  const cb = parseInt(b.replace('#', ''), 16);
  const ch = [16, 8, 0].map((s) => Math.round(((ca >> s) & 255) * (1 - t) + ((cb >> s) & 255) * t));
  return `#${ch.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

type AC = [number, number];

/** Octógono no plano (a, c): retângulo com os quatro cantos chanfrados em `k`. */
function octagon([a1, a2]: AC, [c1, c2]: AC, k: number): AC[] {
  return [[a2, c1 + k], [a2, c2 - k], [a2 - k, c2], [a1 + k, c2], [a1, c2 - k], [a1, c1 + k], [a1 + k, c1], [a2 - k, c1]];
}

/** Normais das arestas do octógono, na mesma ordem dos vértices. */
const OCT_NORMALS: AC[] = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];

interface HullPt { x: number; y: number; bottom: boolean }

function hull(points: HullPt[]): HullPt[] {
  const p = [...points].sort((u, v) => u.x - v.x || u.y - v.y);
  const cross = (o: HullPt, u: HullPt, v: HullPt) => (u.x - o.x) * (v.y - o.y) - (u.y - o.y) * (v.x - o.x);
  const half = (list: HullPt[]) => {
    const out: HullPt[] = [];
    for (const q of list) {
      while (out.length >= 2 && cross(out[out.length - 2], out[out.length - 1], q) <= 1e-9) out.pop();
      out.push(q);
    }
    out.pop();
    return out;
  };
  return [...half(p), ...half(p.reverse())];
}

export interface RoundBoxSpec extends IsoBoxSpec {
  /** Chanfro das quinas verticais. */
  r?: number;
  /** Chanfro das bordas de cima. */
  bevel?: number;
  /** Sem contorno na base (para peças que continuam para baixo, como o cabelo). */
  openBottom?: boolean;
  /** Espessura do contorno (padrão 0.8). */
  outlineWidth?: number;
}

/**
 * Caixa com quinas chanfradas: deixa personagens e cabelos menos quadrados.
 * Só as faces voltadas para a câmera são desenhadas, e o contorno segue a silhueta.
 */
export function RoundBox(spec: RoundBoxSpec) {
  const [a1, a2] = spec.a;
  const [c1, c2] = spec.c;
  const [z1, z2] = spec.z;
  const r = Math.max(0, Math.min(spec.r ?? 1, (a2 - a1) / 2, (c2 - c1) / 2));
  const b = Math.max(0, Math.min(spec.bevel ?? r, z2 - z1, (a2 - a1) / 2 - 0.05, (c2 - c1) / 2 - 0.05));
  const top = spec.top ?? shade(spec.color, -0.15);
  const side = spec.side ?? shade(spec.color, 0.2);
  const front = spec.front ?? spec.color;
  const zm = z2 - b;
  const low = octagon(spec.a, spec.c, r);
  const up = octagon([a1 + b, a2 - b], [c1 + b, c2 - b], Math.max(0, r - b * (2 - Math.SQRT2)));
  const lateral = [front, mix(front, side, 0.5), side];
  const seam = (fill: string) => ({ fill, stroke: fill, strokeWidth: 0.25, strokeLinejoin: 'round' as const });

  const faces: ReactNode[] = [];
  lateral.forEach((fill, i) => {
    const [p, q] = [low[i], low[i + 1]];
    faces.push(<polygon key={`l${i}`} points={pts([iso(p[0], p[1], z1), iso(q[0], q[1], z1), iso(q[0], q[1], zm), iso(p[0], p[1], zm)])} {...seam(fill)} />);
  });
  if (b > 0) {
    [7, 0, 1, 2, 3].forEach((i) => {
      const j = (i + 1) % 8;
      const fill = i < 3 ? mix(top, lateral[i], 0.5) : mix(top, OCT_NORMALS[i][0] > 0 ? front : side, 0.25);
      faces.push(<polygon key={`b${i}`} points={pts([iso(low[i][0], low[i][1], zm), iso(low[j][0], low[j][1], zm), iso(up[j][0], up[j][1], z2), iso(up[i][0], up[i][1], z2)])} {...seam(fill)} />);
    });
  }
  faces.push(<polygon key="top" points={pts(up.map(([a, c]) => iso(a, c, z2)))} {...seam(top)} />);

  let outline: ReactNode = null;
  if (spec.outline !== false) {
    const ring = (list: AC[], z: number, bottom: boolean) => list.map(([a, c]) => { const [x, y] = iso(a, c, z); return { x, y, bottom }; });
    const h = hull([...ring(low, z1, true), ...ring(low, zm, false), ...ring(up, z2, false)]);
    const stroke = { fill: 'none', stroke: spec.outlineColor ?? OUTLINE, strokeWidth: spec.outlineWidth ?? 0.8, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };
    if (spec.openBottom) {
      const segs = h.map((p, i) => [p, h[(i + 1) % h.length]] as const).filter(([p, q]) => !p.bottom && !q.bottom);
      outline = <path d={segs.map(([p, q]) => `M${+p.x.toFixed(2)},${+p.y.toFixed(2)}L${+q.x.toFixed(2)},${+q.y.toFixed(2)}`).join('')} {...stroke} />;
    } else {
      outline = <polygon points={pts(h.map((p) => [p.x, p.y]))} {...stroke} />;
    }
  }
  return <g className={spec.className}>{faces}{outline}</g>;
}

/** Caminho visível em volta de uma peça chanfrada: canto direito → frente → quina → lateral. */
export function wrapPath([a1, a2]: AC, [c1, c2]: AC, r: number): AC[] {
  return [[a2, c1 + r], [a2, c2 - r], [a2 - r, c2], [a1 + r, c2]];
}

export function pathLength(path: AC[]): number {
  let total = 0;
  for (let i = 1; i < path.length; i += 1) total += Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]);
  return total;
}

/** Faixa "colada" num caminho de wrapPath, entre os comprimentos s0 e s1, da altura z0 a z1. */
export function WrapFace({ path, s, z, fill, opacity }: { path: AC[]; s: [number, number]; z: [number, number]; fill: string; opacity?: number }) {
  const along: AC[] = [];
  let walked = 0;
  for (let i = 1; i < path.length; i += 1) {
    const [p, q] = [path[i - 1], path[i]];
    const len = Math.hypot(q[0] - p[0], q[1] - p[1]);
    const at = (d: number): AC => [p[0] + (q[0] - p[0]) * d / len, p[1] + (q[1] - p[1]) * d / len];
    const from = Math.max(s[0], walked);
    const to = Math.min(s[1], walked + len);
    if (len > 0 && to > from) {
      if (along.length === 0) along.push(at(from - walked));
      along.push(at(to - walked));
    }
    walked += len;
  }
  if (along.length < 2) return null;
  const upper = along.map(([a, c]) => iso(a, c, z[1]));
  const lower = along.map(([a, c]) => iso(a, c, z[0])).reverse();
  return <polygon opacity={opacity} points={pts([...upper, ...lower])} fill={fill} stroke={opacity === undefined ? fill : undefined} strokeWidth={0.2} />;
}

/** Retângulo numa face de "a" constante (frente de personagens/pet, lateral dos móveis). */
export function FaceA({ a, c, z, fill, className, opacity }: { a: number; c: [number, number]; z: [number, number]; fill: string; className?: string; opacity?: number }) {
  return <polygon className={className} opacity={opacity} points={pts([iso(a, c[0], z[1]), iso(a, c[1], z[1]), iso(a, c[1], z[0]), iso(a, c[0], z[0])])} fill={fill} />;
}

/** Retângulo numa face de "c" constante (frente dos móveis da parede direita). */
export function FaceC({ a, c, z, fill, className, opacity }: { a: [number, number]; c: number; z: [number, number]; fill: string; className?: string; opacity?: number }) {
  return <polygon className={className} opacity={opacity} points={pts([iso(a[0], c, z[1]), iso(a[1], c, z[1]), iso(a[1], c, z[0]), iso(a[0], c, z[0])])} fill={fill} />;
}

/** Retângulo deitado (plano horizontal na altura z). */
export function FloorQuad({ a, c, z = 0, fill, opacity }: { a: [number, number]; c: [number, number]; z?: number; fill: string; opacity?: number }) {
  return <polygon opacity={opacity} points={pts([iso(a[0], c[0], z), iso(a[1], c[0], z), iso(a[1], c[1], z), iso(a[0], c[1], z)])} fill={fill} />;
}

/* ---------- Planos achatados ---------- */

/** Parede esquerda (plano a = offset). Dentro: u = c, v = z (para cima). */
export function OnLeftWall({ offset = 0.4, children, ...rest }: { offset?: number; children: ReactNode } & SVGProps<SVGGElement>) {
  return (
    <g transform={`matrix(-1 0.5 0 -1 ${160 + offset} ${92 + 0.5 * offset})`} {...rest}>
      {children}
    </g>
  );
}

/** Parede direita (plano c = offset). Dentro: u = a, v = z. */
export function OnRightWall({ offset = 0.4, children, ...rest }: { offset?: number; children: ReactNode } & SVGProps<SVGGElement>) {
  return (
    <g transform={`matrix(1 0.5 0 -1 ${160 - offset} ${92 + 0.5 * offset})`} {...rest}>
      {children}
    </g>
  );
}

/** Piso (ou qualquer plano horizontal na altura z). Dentro: u = a, v = c. */
export function OnFloor({ z = 0, children, ...rest }: { z?: number; children: ReactNode } & SVGProps<SVGGElement>) {
  return (
    <g transform={`matrix(1 0.5 -1 0.5 160 ${92 - z})`} {...rest}>
      {children}
    </g>
  );
}

/** Retângulo de (u1, v1) a (u2, v2) para usar dentro dos planos achatados. */
export function URect({ u, v, fill, opacity, className }: { u: [number, number]; v: [number, number]; fill: string; opacity?: number; className?: string }) {
  return <rect className={className} x={Math.min(u[0], u[1])} y={Math.min(v[0], v[1])} width={Math.abs(u[1] - u[0])} height={Math.abs(v[1] - v[0])} fill={fill} opacity={opacity} />;
}

export function boundsOf(points: Pt[], pad = 1): Rect {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const x = Math.min(...xs) - pad;
  const y = Math.min(...ys) - pad;
  return { x, y, w: Math.max(...xs) + pad - x, h: Math.max(...ys) + pad - y };
}
