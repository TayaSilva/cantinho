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
  const stroke = spec.outline === false ? {} : { stroke: OUTLINE, strokeWidth: 0.8, strokeLinejoin: 'round' as const };
  return (
    <g className={spec.className}>
      <polygon points={pts([iso(a1, c2, z1), iso(a2, c2, z1), iso(a2, c2, z2), iso(a1, c2, z2)])} fill={side} {...stroke} />
      <polygon points={pts([iso(a2, c1, z1), iso(a2, c2, z1), iso(a2, c2, z2), iso(a2, c1, z2)])} fill={front} {...stroke} />
      <polygon points={pts([iso(a1, c1, z2), iso(a2, c1, z2), iso(a2, c2, z2), iso(a1, c2, z2)])} fill={top} {...stroke} />
    </g>
  );
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
