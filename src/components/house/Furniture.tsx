/**
 * Móveis e objetos da sala. Cada componente desenha um móvel em sua posição
 * fixa, com o modelo e as cores escolhidos no catálogo — por isso as áreas
 * clicáveis continuam iguais quando a aparência muda.
 */
import type { ReactNode } from 'react';
import { bool, list, str } from '../../data/catalog';
import type { AssetOption } from '../../types/house';
import { FaceA, FaceC, FloorQuad, iso, IsoBox, OnFloor, OnLeftWall, OUTLINE, pts, shade, URect } from './iso';

const WOOD = '#A7755B';
const WOOD_DARK = '#8A5D46';
const WOOD_DEEP = '#6E4836';

/** Gerador pseudoaleatório estável (mesma "bagunça" de livros sempre). */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

/** Coraçãozinho pixelado num plano achatado (u, v). */
export function PixelHeart({ u, v, color, s = 1 }: { u: number; v: number; color: string; s?: number }) {
  return (
    <g fill={color}>
      <rect x={u - 2.5 * s} y={v + 0.5 * s} width={2 * s} height={1 * s} />
      <rect x={u + 0.5 * s} y={v + 0.5 * s} width={2 * s} height={1 * s} />
      <rect x={u - 2.5 * s} y={v - 0.5 * s} width={5 * s} height={1 * s} />
      <rect x={u - 1.5 * s} y={v - 1.5 * s} width={3 * s} height={1 * s} />
      <rect x={u - 0.5 * s} y={v - 2.5 * s} width={1 * s} height={1 * s} />
    </g>
  );
}

/* ================================================================
 * Parede esquerda: quadro, polaroid, calendário
 * ================================================================ */

function MiniPhoto({ u, v, sky = '#F2B9A0' }: { u: [number, number]; v: [number, number]; sky?: string }) {
  const [u1, u2] = u;
  const [v1, v2] = v;
  const w = u2 - u1;
  const h = v2 - v1;
  return (
    <g>
      <URect u={u} v={v} fill={sky} />
      <polygon
        points={pts([
          [u1, v1],
          [u1, v1 + h * 0.3],
          [u1 + w * 0.4, v1 + h * 0.5],
          [u1 + w * 0.7, v1 + h * 0.35],
          [u2, v1 + h * 0.5],
          [u2, v1],
        ])}
        fill="#9DB98F"
      />
    </g>
  );
}

export function PhotoFrame({ opt }: { opt: AssetOption }) {
  const color = str(opt, 'color');
  const variant = str(opt, 'variant');
  if (variant === 'gallery') {
    return (
      <OnLeftWall offset={0.5}>
        <URect u={[12, 25]} v={[34, 52]} fill={color} />
        <MiniPhoto u={[13.5, 23.5]} v={[35.5, 50.5]} sky="#BFE3F0" />
        <URect u={[27, 40]} v={[44, 57]} fill={color} />
        <MiniPhoto u={[28.5, 38.5]} v={[45.5, 55.5]} />
        <URect u={[27, 40]} v={[30, 41]} fill={color} />
        <URect u={[28.5, 38.5]} v={[31.5, 39.5]} fill="#F8E6B5" />
        <PixelHeart u={33.5} v={35.5} color="#C98190" />
      </OnLeftWall>
    );
  }
  const thin = variant === 'thin';
  return (
    <OnLeftWall offset={0.5}>
      <URect u={thin ? [14, 38] : [12, 40]} v={thin ? [32, 56] : [30, 58]} fill={color} />
      <URect u={[15, 37]} v={[33, 55]} fill={thin ? '#FFFFFF' : '#F8E6B5'} />
      <URect u={[17, 35]} v={[35, 53]} fill="#F2B9A0" />
      <polygon points="17,35 17,40 24,44 30,41 35,44 35,35" fill="#9DB98F" />
      <URect u={[22, 24]} v={[38, 45]} fill="#46353F" />
      <URect u={[22, 24]} v={[45, 47]} fill="#F2C9A6" />
      <URect u={[28, 30]} v={[38, 45]} fill="#7E9C8E" />
      <URect u={[28, 30]} v={[45, 47]} fill="#F2C9A6" />
      <PixelHeart u={26} v={50} color="#C98190" />
      {variant === 'single' && color === '#D9A93F' && (
        <g fill="#F2D27A">
          <rect x={12} y={57} width={28} height={1} />
          <rect x={12} y={30} width={1} height={28} />
        </g>
      )}
    </OnLeftWall>
  );
}

export function Polaroid() {
  return (
    <OnLeftWall offset={0.5}>
      <URect u={[2, 10]} v={[40, 50]} fill="#FFF8EE" />
      <URect u={[3, 9]} v={[43, 49]} fill="#E3A857" />
    </OnLeftWall>
  );
}

export function Calendar({ opt }: { opt: AssetOption }) {
  const color = str(opt, 'color');
  const variant = str(opt, 'variant');
  if (variant === 'clock') {
    return (
      <OnLeftWall offset={0.5}>
        <circle cx={110} cy={50} r={9} fill={color} />
        <circle cx={110} cy={50} r={7.2} fill="#FFF8EE" />
        {[0, 1, 2, 3].map((k) => (
          <rect key={k} x={110 + Math.cos((k * Math.PI) / 2) * 5.5 - 0.5} y={50 + Math.sin((k * Math.PI) / 2) * 5.5 - 0.5} width={1} height={1} fill={OUTLINE} />
        ))}
        <rect x={109.5} y={50} width={1} height={5} fill={OUTLINE} />
        <rect x={110} y={49.5} width={4} height={1} fill={OUTLINE} />
        <rect x={109.5} y={49.5} width={1} height={1} fill="#C98190" />
      </OnLeftWall>
    );
  }
  if (variant === 'chalk') {
    return (
      <OnLeftWall offset={0.5}>
        <URect u={[101, 119]} v={[38, 58]} fill={WOOD} />
        <URect u={[102.5, 117.5]} v={[39.5, 56.5]} fill={color} />
        <g fill="#F4F0EA">
          <rect x={113} y={46} width={1} height={6} />
          <rect x={105} y={46} width={1} height={6} />
          <rect x={107} y={49} width={3} height={1} />
          <rect x={107} y={49} width={1} height={3} />
          <rect x={109} y={46} width={1} height={6} />
          <rect x={104} y={42} width={12} height={0.6} opacity={0.6} />
        </g>
        <PixelHeart u={115} v={43} color="#F2A7B5" s={0.6} />
      </OnLeftWall>
    );
  }
  if (variant === 'tear') {
    return (
      <OnLeftWall offset={0.5}>
        <URect u={[104, 116]} v={[40, 58]} fill="#FFF8EE" />
        <URect u={[104, 116]} v={[52, 58]} fill={color} />
        <g fill={OUTLINE}>
          <rect x={112} y={43} width={1} height={7} />
          <rect x={106} y={43} width={1} height={7} />
          <rect x={107.5} y={46} width={3} height={1} />
          <rect x={107.5} y={46} width={1} height={4} />
          <rect x={109.5} y={43} width={1} height={7} />
        </g>
        <URect u={[104, 116]} v={[40, 40.6]} fill="#D9C8B8" />
      </OnLeftWall>
    );
  }
  return (
    <OnLeftWall offset={0.5}>
      <URect u={[102, 118]} v={[38, 60]} fill={OUTLINE} />
      <URect u={[102.6, 117.4]} v={[38.6, 59.4]} fill="#FFF8EE" />
      <URect u={[102.6, 117.4]} v={[54, 59.4]} fill={color} />
      <URect u={[105.5, 106.5]} v={[59, 62]} fill={OUTLINE} />
      <URect u={[113.5, 114.5]} v={[59, 62]} fill={OUTLINE} />
      {[0, 1, 2].map((r) =>
        [0, 1, 2, 3].map((k) => (
          <rect key={`${r}-${k}`} x={104 + k * 3.4} y={48 - r * 4.3} width={2} height={2} fill={r === 1 && k === 2 ? color : '#B7A0A6'} />
        )),
      )}
    </OnLeftWall>
  );
}

/* ================================================================
 * Piso: tapete
 * ================================================================ */

export function Rug({ opt }: { opt: AssetOption }) {
  const color = str(opt, 'color');
  const accent = str(opt, 'accent');
  const detail = str(opt, 'detail');
  const variant = str(opt, 'variant');
  const fringe = (
    <g fill={detail}>
      {Array.from({ length: 18 }, (_, i) => (
        <rect key={i} x={26 + i * 4} y={102} width={1} height={2} />
      ))}
    </g>
  );
  let body: ReactNode;
  if (variant === 'round') {
    body = (
      <g>
        <circle cx={61} cy={68} r={34} fill={color} />
        <circle cx={61} cy={68} r={30} fill={accent} />
        <circle cx={61} cy={68} r={27} fill={color} />
        <circle cx={61} cy={68} r={14} fill={accent} />
        <circle cx={61} cy={68} r={5} fill={detail} />
      </g>
    );
  } else if (variant === 'stripes') {
    body = (
      <g>
        <URect u={[24, 98]} v={[34, 102]} fill={color} />
        {Array.from({ length: 9 }, (_, i) => (
          <URect key={i} u={[26 + i * 8, 30 + i * 8]} v={[34, 102]} fill={accent} />
        ))}
        {fringe}
      </g>
    );
  } else if (variant === 'checker') {
    const cells = [];
    for (let i = 0; i < 6; i++) for (let j = 0; j < 5; j++) if ((i + j) % 2 === 0) cells.push(<URect key={`${i}-${j}`} u={[26 + i * 12, 38 + i * 12]} v={[36 + j * 13, 49 + j * 13]} fill={accent} />);
    body = (
      <g>
        <URect u={[24, 98]} v={[34, 102]} fill={detail} />
        <URect u={[26, 96]} v={[36, 100]} fill={color} />
        {cells}
      </g>
    );
  } else if (variant === 'kilim') {
    body = (
      <g>
        <URect u={[24, 98]} v={[34, 102]} fill={accent} />
        <URect u={[27, 95]} v={[37, 99]} fill={color} />
        {[45, 61, 77].map((v) => (
          <g key={v}>
            <polygon points={pts([[61, v - 9], [70, v], [61, v + 9], [52, v]])} fill={accent} />
            <polygon points={pts([[61, v - 4], [65, v], [61, v + 4], [57, v]])} fill={detail} />
          </g>
        ))}
        {[33, 89].map((u) => (
          <polygon key={u} points={pts([[u, 60], [u + 4, 68], [u, 76], [u - 4, 68]])} fill={accent} />
        ))}
        {fringe}
      </g>
    );
  } else {
    body = (
      <g>
        <URect u={[24, 98]} v={[34, 102]} fill={color} />
        <URect u={[28, 94]} v={[38, 98]} fill={accent} />
        <URect u={[31, 91]} v={[41, 95]} fill={color} />
        <URect u={[49, 73]} v={[56, 80]} fill={shade(color, 0.12)} />
        <URect u={[55, 67]} v={[62, 74]} fill={detail} />
        <URect u={[59, 63]} v={[66, 70]} fill={color} />
        {fringe}
      </g>
    );
  }
  return <OnFloor z={0.2}>{body}</OnFloor>;
}

/* ================================================================
 * Plantas
 * ================================================================ */

export function Plant({ opt, origin, size }: { opt: AssetOption; origin: [number, number]; size: number }) {
  const [a0, c0] = origin;
  const s = size;
  const leaf = str(opt, 'leaf');
  const pot = str(opt, 'pot');
  const variant = str(opt, 'variant');
  const light = shade(leaf, -0.3);
  const dark = shade(leaf, 0.25);
  const potH = variant === 'succulent' ? s * 0.6 : s;
  const parts: ReactNode[] = [<IsoBox key="pot" a={[a0, a0 + s]} c={[c0, c0 + s]} z={[0, potH]} color={pot} top={shade(pot, 0.35)} />];
  const leafBox = (key: string, a: number, c: number, z: number, w: number, h = 5, col = leaf) =>
    parts.push(<IsoBox key={key} a={[a0 + a, a0 + a + w]} c={[c0 + c, c0 + c + w]} z={[potH + z, potH + z + h]} color={col} top={shade(col, -0.3)} side={shade(col, 0.25)} outline={false} />);

  if (variant === 'cactus') {
    leafBox('trunk', s * 0.3, s * 0.3, 0, s * 0.4, s * 2.2);
    leafBox('arm1', s * 0.1, s * 0.4, s * 0.9, s * 0.25, s * 0.8);
    leafBox('arm2', s * 0.65, s * 0.35, s * 1.2, s * 0.25, s * 0.6);
    leafBox('flower', s * 0.38, s * 0.38, s * 2.2, s * 0.25, 1.5, '#F2A7B5');
  } else if (variant === 'succulent') {
    leafBox('s1', s * 0.05, s * 0.05, 0, s * 0.4, 2.5);
    leafBox('s2', s * 0.55, s * 0.1, 0, s * 0.4, 3, light);
    leafBox('s3', s * 0.1, s * 0.55, 0, s * 0.4, 3.5, dark);
    leafBox('s4', s * 0.5, s * 0.5, 0, s * 0.45, 2.5);
    leafBox('s5', s * 0.3, s * 0.3, 1.5, s * 0.4, 3, light);
  } else if (variant === 'fern') {
    leafBox('f1', -s * 0.3, s * 0.1, -1, s * 0.6, 3, dark);
    leafBox('f2', s * 0.6, s * 0.1, -2, s * 0.6, 3);
    leafBox('f3', s * 0.1, s * 0.7, -2, s * 0.6, 3, dark);
    leafBox('f4', s * 0.2, s * 0.2, 1, s * 0.6, 4);
    leafBox('f5', s * 0.35, s * 0.3, 4, s * 0.4, 4, light);
  } else if (variant === 'flowers') {
    leafBox('l1', s * 0.1, s * 0.1, 0, s * 0.8, 4);
    leafBox('l2', s * 0.25, s * 0.25, 4, s * 0.5, 3, dark);
    leafBox('p1', s * 0.05, s * 0.2, 6, s * 0.3, 2.5, '#F2A7B5');
    leafBox('p2', s * 0.55, s * 0.1, 7, s * 0.3, 2.5, '#FFE27A');
    leafBox('p3', s * 0.35, s * 0.6, 8, s * 0.3, 2.5, '#C98190');
  } else {
    leafBox('k1', s * 0.15, s * 0.15, 0, s, 5, dark);
    leafBox('k2', 0, s * 0.6, 6, s * 0.85, 5);
    leafBox('k3', s * 0.45, 0, 10, s * 0.85, 5, dark);
    leafBox('k4', s * 0.15, s * 0.3, 16, s * 0.7, 5, light);
    leafBox('k5', s * 0.6, s * 0.5, 4, s * 0.7, 5, light);
  }
  return <g>{parts}</g>;
}

/* ================================================================
 * Parede direita: estante, TV, rádio
 * ================================================================ */

function BookRow({ a1, a2, c, z1, z2, palette, seed, gap }: { a1: number; a2: number; c: number; z1: number; z2: number; palette: string[]; seed: number; gap?: [number, number] }) {
  const rand = rng(seed);
  const books: ReactNode[] = [];
  let a = a1 + 0.5;
  let i = 0;
  while (a < a2 - 1) {
    const w = [1.6, 2, 2.4, 3][Math.floor(rand() * 4)];
    if (a + w > a2 - 0.4) break;
    const h = (0.6 + rand() * 0.35) * (z2 - z1);
    if (gap && a > gap[0] && a < gap[1]) {
      a += w;
      continue;
    }
    books.push(<FaceC key={i++} a={[a, a + w]} c={c} z={[z1, z1 + h]} fill={palette[Math.floor(rand() * palette.length)]} />);
    a += w + 0.3;
  }
  return <g>{books}</g>;
}

export function Bookshelf({ opt, books }: { opt: AssetOption; books: AssetOption }) {
  const color = str(opt, 'color');
  const variant = str(opt, 'variant');
  const palette = list(books, 'palette');
  const inner = shade(color, 0.35);
  const shelf = shade(color, 0.08);

  if (variant === 'low') {
    return (
      <g>
        <IsoBox a={[7, 41]} c={[0, 12]} z={[0, 32]} color={color} />
        <FaceC a={[9, 39]} c={12.1} z={[2, 30]} fill={inner} />
        <FaceC a={[9, 39]} c={12.15} z={[15, 16.4]} fill={shelf} />
        <BookRow a1={9} a2={39} c={12.2} z1={2} z2={15} palette={palette} seed={11} />
        <BookRow a1={9} a2={39} c={12.2} z1={16.4} z2={30} palette={palette} seed={23} gap={[22, 30]} />
        <IsoBox a={[12, 17]} c={[3, 8]} z={[32, 36]} color="#C47A5A" />
        <IsoBox a={[11.5, 17.5]} c={[2.5, 8.5]} z={[36, 41]} color="#7FA37A" outline={false} />
        <IsoBox a={[28, 36]} c={[3, 9]} z={[32, 34]} color={palette[0] ?? '#C98190'} />
        <IsoBox a={[28.5, 35.5]} c={[3.5, 8.5]} z={[34, 36]} color={palette[1] ?? '#7E9C8E'} />
      </g>
    );
  }
  if (variant === 'ladder') {
    const shelves = [0, 18, 36, 54];
    return (
      <g>
        <IsoBox a={[9, 10.5]} c={[0, 12]} z={[0, 58]} color={color} />
        {shelves.map((z, i) => (
          <g key={z}>
            <IsoBox a={[10.5, 33.5]} c={[1, 11]} z={[z, z + 2]} color={shelf} />
            {i < 3 && <BookRow a1={11} a2={33} c={9} z1={z + 2} z2={z + 16} palette={palette} seed={31 + i * 7} gap={i === 1 ? [20, 27] : undefined} />}
          </g>
        ))}
        <IsoBox a={[22, 26]} c={[4, 8]} z={[56, 60]} color="#C47A5A" />
        <IsoBox a={[21.5, 26.5]} c={[3.5, 8.5]} z={[60, 64]} color="#7FA37A" outline={false} />
        <IsoBox a={[33.5, 35]} c={[0, 12]} z={[0, 58]} color={color} />
      </g>
    );
  }
  if (variant === 'cubes') {
    return (
      <g>
        <IsoBox a={[9, 35]} c={[0, 12]} z={[0, 50]} color={color} />
        <FaceC a={[11, 33]} c={12.1} z={[2, 48]} fill={inner} />
        <FaceC a={[21.3, 22.7]} c={12.15} z={[2, 48]} fill={shelf} />
        <FaceC a={[11, 33]} c={12.15} z={[16, 17.4]} fill={shelf} />
        <FaceC a={[11, 33]} c={12.15} z={[32, 33.4]} fill={shelf} />
        <BookRow a1={11} a2={21.3} c={12.2} z1={2} z2={16} palette={palette} seed={5} />
        <BookRow a1={22.7} a2={33} c={12.2} z1={17.4} z2={32} palette={palette} seed={9} />
        <BookRow a1={11} a2={21.3} c={12.2} z1={33.4} z2={48} palette={palette} seed={17} />
        <FaceC a={[24, 31]} c={12.2} z={[2, 9]} fill={palette[2] ?? '#E3A857'} />
        <FaceC a={[13, 19]} c={12.2} z={[17.4, 22]} fill={palette[3] ?? '#8C7BB0'} />
        <FaceC a={[25, 30]} c={12.2} z={[33.4, 40]} fill="#7FA37A" />
      </g>
    );
  }
  return (
    <g>
      <IsoBox a={[9, 35]} c={[0, 12]} z={[0, 58]} color={color} />
      <FaceC a={[11, 33]} c={12.1} z={[2, 56]} fill={inner} />
      {[3, 17, 31, 45].map((z, i) => (
        <g key={z}>
          <FaceC a={[11, 33]} c={12.15} z={[z - 1.2, z]} fill={shelf} />
          <BookRow a1={11} a2={33} c={12.2} z1={z} z2={z + 13} palette={palette} seed={7 + i * 13} />
        </g>
      ))}
    </g>
  );
}

function ScreenContent({ a1, a2, z1, z2, c, on }: { a1: number; a2: number; z1: number; z2: number; c: number; on: boolean }) {
  const w = a2 - a1;
  const h = z2 - z1;
  return (
    <g>
      <FaceC a={[a1, a2]} c={c} z={[z1, z2]} fill={on ? '#9FC3D6' : '#2B2F3F'} className={on ? 'tvscreen' : undefined} />
      {on ? (
        <g>
          <FaceC a={[a1 + w * 0.15, a1 + w * 0.42]} c={c + 0.05} z={[z1 + h * 0.65, z1 + h * 0.85]} fill="#FFFFFF" opacity={0.35} />
          <FaceC a={[a1 + w * 0.1, a1 + w * 0.9]} c={c + 0.05} z={[z1 + h * 0.12, z1 + h * 0.28]} fill="#7FA37A" />
          <FaceC a={[a1 + w * 0.6, a1 + w * 0.8]} c={c + 0.05} z={[z1 + h * 0.55, z1 + h * 0.8]} fill="#FFE27A" />
        </g>
      ) : (
        <FaceC a={[a1 + w * 0.1, a1 + w * 0.3]} c={c + 0.05} z={[z1 + h * 0.7, z1 + h * 0.85]} fill="#FFFFFF" opacity={0.12} />
      )}
    </g>
  );
}

export function TV({ opt, on }: { opt: AssetOption; on: boolean }) {
  const color = str(opt, 'color');
  const variant = str(opt, 'variant');
  const antenna = (a: number, c: number, z: number, len = 10): ReactNode => {
    const [x, y] = iso(a, c, z);
    return (
      <g stroke={OUTLINE} strokeWidth={0.8}>
        <line x1={x} y1={y} x2={x - len * 0.6} y2={y - len} />
        <line x1={x} y1={y} x2={x + len * 0.7} y2={y - len * 0.9} />
      </g>
    );
  };
  let tv: ReactNode;
  if (variant === 'small') {
    tv = (
      <g>
        <IsoBox a={[54, 70]} c={[3, 10]} z={[14, 30]} color={color} />
        <FaceC a={[55.5, 66]} c={10.1} z={[16, 28]} fill={shade(color, 0.4)} />
        <ScreenContent a1={56.3} a2={65.2} z1={16.8} z2={27.2} c={10.2} on={on} />
        <FaceC a={[67, 68.5]} c={10.1} z={[24, 25.5]} fill="#F8E6B5" />
        <FaceC a={[67, 68.5]} c={10.1} z={[20, 21.5]} fill="#F8E6B5" />
        {antenna(62, 6, 30, 7)}
      </g>
    );
  } else if (variant === 'flat') {
    tv = (
      <g>
        <IsoBox a={[60, 64]} c={[3, 9]} z={[14, 15]} color={color} />
        <IsoBox a={[61, 63]} c={[5, 7]} z={[15, 18]} color={color} outline={false} />
        <IsoBox a={[47, 77]} c={[5, 7]} z={[18, 36]} color={color} />
        <ScreenContent a1={48} a2={76} z1={19} z2={35} c={7.1} on={on} />
      </g>
    );
  } else if (variant === 'portable') {
    tv = (
      <g>
        <IsoBox a={[54, 72]} c={[3, 10]} z={[14, 29]} color={color} />
        <IsoBox a={[60, 66]} c={[5.5, 7]} z={[29, 33]} color="#46353F" outline={false} />
        <FaceC a={[55.5, 66]} c={10.1} z={[16, 27.5]} fill="#46353F" />
        <ScreenContent a1={56.3} a2={65.2} z1={16.8} z2={26.7} c={10.2} on={on} />
        {[17, 19, 21, 23, 25].map((z) => (
          <FaceC key={z} a={[67.5, 71]} c={10.1} z={[z, z + 0.8]} fill={shade(color, 0.35)} />
        ))}
      </g>
    );
  } else {
    tv = (
      <g>
        <IsoBox a={[50, 74]} c={[3, 10]} z={[14, 36]} color={color} />
        <FaceC a={[52, 72]} c={10.1} z={[16.5, 34]} fill={shade(color, 0.4)} />
        <ScreenContent a1={53} a2={71} z1={17.5} z2={33} c={10.2} on={on} />
        {antenna(62, 6, 36)}
      </g>
    );
  }
  return (
    <g>
      <IsoBox a={[44, 80]} c={[0, 14]} z={[0, 14]} color={WOOD} />
      <FaceC a={[46, 61]} c={14.1} z={[2, 12]} fill={WOOD} />
      <FaceC a={[63, 78]} c={14.1} z={[2, 12]} fill={WOOD} />
      <polygon points={pts([iso(61, 14.1, 2), iso(61, 14.1, 12)])} stroke={OUTLINE} strokeWidth={0.5} />
      <FaceC a={[58.6, 59.6]} c={14.2} z={[6.5, 7.5]} fill="#F8E6B5" />
      <FaceC a={[64.6, 65.6]} c={14.2} z={[6.5, 7.5]} fill="#F8E6B5" />
      {tv}
    </g>
  );
}

export function Radio({ opt }: { opt: AssetOption }) {
  const color = str(opt, 'color');
  const variant = str(opt, 'variant');
  const antenna = (a: number, c: number, z: number): ReactNode => {
    const [x, y] = iso(a, c, z);
    return <line x1={x} y1={y} x2={x + 8} y2={y - 12} stroke={OUTLINE} strokeWidth={0.8} />;
  };
  let radio: ReactNode;
  if (variant === 'portable') {
    radio = (
      <g>
        <IsoBox a={[90, 103]} c={[3, 9]} z={[16, 25]} color={color} />
        <IsoBox a={[92, 101]} c={[5.3, 6.7]} z={[25, 28]} color="#46353F" outline={false} />
        <FaceC a={[91, 96.5]} c={9.1} z={[17, 23.5]} fill={shade(color, 0.35)} />
        <FaceC a={[92.2, 95.3]} c={9.15} z={[18.5, 22]} fill={shade(color, 0.5)} />
        <FaceC a={[97.5, 102]} c={9.1} z={[20, 23]} fill="#F8E6B5" />
        <FaceC a={[98, 99]} c={9.15} z={[17.5, 18.5]} fill="#46353F" />
        <FaceC a={[100.5, 101.5]} c={9.15} z={[17.5, 18.5]} fill="#46353F" />
      </g>
    );
  } else if (variant === 'record') {
    radio = (
      <g>
        <IsoBox a={[88.5, 104.5]} c={[1, 11]} z={[16, 20]} color={color} />
        <OnFloor z={20.05}>
          <circle cx={95.5} cy={6} r={4.6} fill="#2B2024" />
          <circle cx={95.5} cy={6} r={3} fill="#46353F" />
          <circle cx={95.5} cy={6} r={1.3} fill="#C98190" />
        </OnFloor>
        <IsoBox a={[101.5, 102.5]} c={[2, 8]} z={[20, 21]} color="#C9C6CF" outline={false} />
        <FaceC a={[90, 92]} c={11.1} z={[17, 19]} fill="#F8E6B5" />
      </g>
    );
  } else if (variant === 'boombox') {
    radio = (
      <g>
        <IsoBox a={[88.5, 104.5]} c={[2, 9]} z={[16, 25]} color={color} />
        <IsoBox a={[90, 103]} c={[5, 6]} z={[25, 28]} color="#46353F" outline={false} />
        <FaceC a={[89.3, 94.5]} c={9.1} z={[17, 24]} fill="#46353F" />
        <FaceC a={[90.6, 93.2]} c={9.15} z={[18.8, 22.2]} fill="#6B6670" />
        <FaceC a={[98.5, 103.7]} c={9.1} z={[17, 24]} fill="#46353F" />
        <FaceC a={[99.8, 102.4]} c={9.15} z={[18.8, 22.2]} fill="#6B6670" />
        <FaceC a={[95, 98]} c={9.1} z={[19, 23]} fill="#F8E6B5" />
        {antenna(103, 5, 25)}
      </g>
    );
  } else {
    radio = (
      <g>
        <IsoBox a={[89, 104]} c={[2, 9]} z={[16, 27]} color={color} />
        <FaceC a={[90, 96]} c={9.1} z={[18, 25]} fill={shade(color, 0.55)} />
        {[91, 92.6, 94.2].map((a) =>
          [19.5, 21.5, 23.5].map((z) => <FaceC key={`${a}-${z}`} a={[a, a + 1]} c={9.2} z={[z, z + 1]} fill={color} />),
        )}
        <FaceC a={[97.5, 103]} c={9.1} z={[21, 25]} fill="#F8E6B5" />
        <FaceC a={[99, 100]} c={9.2} z={[21.5, 24.5]} fill="#C98190" />
        <FaceC a={[98.5, 100]} c={9.2} z={[18, 19.5]} fill="#46353F" />
        <FaceC a={[101.5, 103]} c={9.2} z={[18, 19.5]} fill="#46353F" />
        {antenna(102, 5, 27)}
      </g>
    );
  }
  return (
    <g>
      <IsoBox a={[88, 105]} c={[0, 12]} z={[0, 16]} color={WOOD} />
      {radio}
    </g>
  );
}

/* ================================================================
 * Sofá e almofadas
 * ================================================================ */

function sofaGeometry(variant: string) {
  switch (variant) {
    case 'modern':
      return { back: 22, arm: 14, base: 3, armW: 3, legs: true };
    case 'lowback':
      return { back: 19, arm: 13, base: 2, armW: 6, legs: true };
    case 'chesterfield':
      return { back: 22, arm: 22, base: 0, armW: 6, legs: false };
    default:
      return { back: 25, arm: 17, base: 0, armW: 6, legs: false };
  }
}

/** Parte de trás do sofá (encosto, braço do fundo, assento). Os personagens sentam por cima. */
export function SofaBack({ opt, transform }: { opt: AssetOption; transform?: string }) {
  const color = str(opt, 'color');
  const variant = str(opt, 'variant');
  const g = sofaGeometry(variant);
  const cushion = shade(color, -0.12);
  const tufted = variant === 'tufted' || variant === 'chesterfield';
  return (
    <g transform={transform}>
      {g.legs &&
        [
          [1, 43],
          [17, 43],
          [1, 87],
          [17, 87],
        ].map(([a, c]) => <IsoBox key={`${a}-${c}`} a={[a, a + 2]} c={[c, c + 2]} z={[0, g.base]} color={WOOD_DEEP} outline={false} />)}
      <IsoBox a={[0, 7]} c={[42, 90]} z={[g.base, g.back]} color={color} />
      {tufted &&
        [15, 20].map((z) =>
          [50, 56, 62, 68, 74, 80].map((c) => <FaceA key={`${z}-${c}`} a={7.05} c={[c + (z === 20 ? 3 : 0), c + 1 + (z === 20 ? 3 : 0)]} z={[z, z + 1]} fill={shade(color, 0.3)} />),
        )}
      <IsoBox a={[0, 20]} c={[42, 42 + g.armW]} z={[g.base, g.arm]} color={color} />
      {variant === 'chesterfield' && <IsoBox a={[0, 20]} c={[41.5, 48.5]} z={[g.arm, g.arm + 2]} color={shade(color, -0.1)} />}
      <IsoBox a={[7, 20]} c={[42 + g.armW, 90 - g.armW]} z={[g.base, 7]} color={color} />
      <IsoBox a={[7, 20]} c={[42 + g.armW, 66]} z={[7, 11]} color={cushion} />
      <IsoBox a={[7, 20]} c={[66, 90 - g.armW]} z={[7, 11]} color={cushion} />
    </g>
  );
}

/** Braço da frente do sofá (desenhado depois dos personagens). */
export function SofaFront({ opt, transform }: { opt: AssetOption; transform?: string }) {
  const color = str(opt, 'color');
  const variant = str(opt, 'variant');
  const g = sofaGeometry(variant);
  return (
    <g transform={transform}>
      <IsoBox a={[0, 20]} c={[90 - g.armW, 90]} z={[g.base, g.arm]} color={color} />
      {variant === 'chesterfield' && <IsoBox a={[0, 20]} c={[83.5, 90.5]} z={[g.arm, g.arm + 2]} color={shade(color, -0.1)} />}
    </g>
  );
}

/*
 * Sofá da frente: o mesmo sofá espelhado no eixo a, com o encosto em `backA`,
 * virado para o sofá principal. Quem senta nele aparece de costas.
 */
const flipA = (backA: number, lo: number, hi: number): [number, number] => [backA - hi, backA - lo];

/** Assento e braço do fundo do sofá da frente (desenhados antes dos personagens). */
export function OppositeSofaSeat({ opt, backA }: { opt: AssetOption; backA: number }) {
  const color = str(opt, 'color');
  const variant = str(opt, 'variant');
  const g = sofaGeometry(variant);
  const cushion = shade(color, -0.12);
  return (
    <g>
      {g.legs &&
        [
          [1, 43],
          [17, 43],
          [1, 87],
          [17, 87],
        ].map(([a, c]) => <IsoBox key={`${a}-${c}`} a={flipA(backA, a, a + 2)} c={[c, c + 2]} z={[0, g.base]} color={WOOD_DEEP} outline={false} />)}
      <IsoBox a={flipA(backA, 0, 20)} c={[42, 42 + g.armW]} z={[g.base, g.arm]} color={color} />
      {variant === 'chesterfield' && <IsoBox a={flipA(backA, 0, 20)} c={[41.5, 48.5]} z={[g.arm, g.arm + 2]} color={shade(color, -0.1)} />}
      <IsoBox a={flipA(backA, 7, 20)} c={[42 + g.armW, 90 - g.armW]} z={[g.base, 7]} color={color} />
      <IsoBox a={flipA(backA, 7, 20)} c={[42 + g.armW, 66]} z={[7, 11]} color={cushion} />
      <IsoBox a={flipA(backA, 7, 20)} c={[66, 90 - g.armW]} z={[7, 11]} color={cushion} />
    </g>
  );
}

/** Braço da frente e encosto do sofá da frente (desenhados depois dos personagens). */
export function OppositeSofaBack({ opt, backA }: { opt: AssetOption; backA: number }) {
  const color = str(opt, 'color');
  const variant = str(opt, 'variant');
  const g = sofaGeometry(variant);
  return (
    <g>
      <IsoBox a={flipA(backA, 0, 20)} c={[90 - g.armW, 90]} z={[g.base, g.arm]} color={color} />
      {variant === 'chesterfield' && <IsoBox a={flipA(backA, 0, 20)} c={[83.5, 90.5]} z={[g.arm, g.arm + 2]} color={shade(color, -0.1)} />}
      <IsoBox a={flipA(backA, 0, 7)} c={[42, 90]} z={[g.base, g.back]} color={color} />
    </g>
  );
}

export function Cushions({ opt }: { opt: AssetOption }) {
  const a = str(opt, 'a');
  const b = str(opt, 'b');
  const heart = bool(opt, 'heart');
  return (
    <g>
      <IsoBox a={[7, 10]} c={[48.5, 55]} z={[11, 20]} color={a} />
      <IsoBox a={[7, 10]} c={[77, 83.5]} z={[11, 20]} color={b} />
      {heart && (
        <g>
          <OnLeftWall offset={10.05}>
            <PixelHeart u={51.7} v={15.5} color="#FFFFFF" s={0.8} />
          </OnLeftWall>
          <OnLeftWall offset={10.05}>
            <PixelHeart u={80.2} v={15.5} color="#FFFFFF" s={0.8} />
          </OnLeftWall>
        </g>
      )}
    </g>
  );
}

/* ================================================================
 * Luminária
 * ================================================================ */

export function lampGlowCenter(opt: AssetOption): { x: number; y: number } {
  const variant = str(opt, 'variant');
  const z = variant === 'floor' ? 46 : variant === 'lantern' ? 19 : variant === 'mushroom' ? 25 : variant === 'globe' ? 22 : 30;
  const [x, y] = iso(8, 100, z);
  return { x, y };
}

function SideTable() {
  return (
    <g>
      <IsoBox a={[3, 5]} c={[94.5, 96]} z={[0, 12]} color={WOOD_DARK} side={WOOD_DEEP} outline={false} />
      <IsoBox a={[12, 14]} c={[94.5, 96]} z={[0, 12]} color={WOOD_DARK} side={WOOD_DEEP} outline={false} />
      <IsoBox a={[3, 5]} c={[105, 106.5]} z={[0, 12]} color={WOOD_DARK} side={WOOD_DEEP} outline={false} />
      <IsoBox a={[12, 14]} c={[105, 106.5]} z={[0, 12]} color={WOOD_DARK} side={WOOD_DEEP} outline={false} />
      <IsoBox a={[2, 15]} c={[94, 107]} z={[12, 14]} color={WOOD} />
    </g>
  );
}

export function Lamp({ opt, on }: { opt: AssetOption; on: boolean }) {
  const color = str(opt, 'color');
  const variant = str(opt, 'variant');
  const lit = on ? shade(color, -0.3) : shade(color, 0.25);
  const litSide = on ? color : shade(color, 0.35);
  const metal = '#46353F';

  if (variant === 'floor') {
    return (
      <g>
        <IsoBox a={[5, 11]} c={[97, 103]} z={[0, 1.5]} color={metal} />
        <IsoBox a={[7.5, 8.5]} c={[99.5, 100.5]} z={[1.5, 42]} color={metal} outline={false} />
        <IsoBox a={[3, 13]} c={[95, 105]} z={[42, 50]} color={litSide} top={lit} side={shade(litSide, 0.15)} />
      </g>
    );
  }
  if (variant === 'lantern') {
    return (
      <g>
        <SideTable />
        <IsoBox a={[5, 11]} c={[97, 103]} z={[14, 15.5]} color={color} />
        <IsoBox a={[5.5, 10.5]} c={[97.5, 102.5]} z={[15.5, 23]} color={on ? '#FFE9B0' : '#D9CFC4'} top={color} side={on ? '#FFD27A' : '#BFB4A8'} />
        <FaceA a={10.55} c={[99.6, 100.4]} z={[15.5, 23]} fill={color} />
        <FaceC a={[7.6, 8.4]} c={102.55} z={[15.5, 23]} fill={color} />
        <IsoBox a={[6, 10]} c={[98, 102]} z={[23, 25]} color={color} />
        <IsoBox a={[7.5, 8.5]} c={[99.5, 100.5]} z={[25, 27]} color={color} outline={false} />
      </g>
    );
  }
  if (variant === 'mushroom') {
    return (
      <g>
        <SideTable />
        <IsoBox a={[6.5, 9.5]} c={[98.5, 101.5]} z={[14, 22]} color="#F4EDE4" />
        <IsoBox a={[3, 13]} c={[95, 105]} z={[22, 28]} color={litSide} top={lit} />
        <FloorQuad a={[5, 7]} c={[97, 99]} z={28.05} fill="#FFFFFF" />
        <FloorQuad a={[9, 11]} c={[101, 103]} z={28.05} fill="#FFFFFF" />
        <FaceA a={13.05} c={[99, 101]} z={[24, 26]} fill="#FFFFFF" />
      </g>
    );
  }
  if (variant === 'globe') {
    const [x, y] = iso(8, 100, 22);
    return (
      <g>
        <SideTable />
        <IsoBox a={[6, 10]} c={[98, 102]} z={[14, 15.5]} color={WOOD_DEEP} />
        <circle cx={x} cy={y} r={6.5} fill={on ? '#FFF6DE' : '#E4DCD2'} stroke={OUTLINE} strokeWidth={0.8} />
        <rect x={x - 3.5} y={y - 4} width={2.5} height={2} fill="#FFFFFF" opacity={0.8} />
      </g>
    );
  }
  return (
    <g>
      <SideTable />
      <IsoBox a={[6, 10]} c={[98, 102]} z={[14, 16]} color={metal} />
      <IsoBox a={[7.5, 8.5]} c={[99.5, 100.5]} z={[16, 26]} color={metal} outline={false} />
      <IsoBox a={[3, 13]} c={[95, 105]} z={[26, 35]} color={litSide} top={lit} side={on ? shade(color, 0.12) : shade(color, 0.4)} />
    </g>
  );
}

/* ================================================================
 * Mesa de centro
 * ================================================================ */

export function tableTop(opt: AssetOption): number {
  const v = str(opt, 'variant');
  return v === 'low' ? 6.5 : v === 'crate' ? 9 : 9.5;
}

export function Table({ opt, items }: { opt: AssetOption; items: boolean }) {
  const color = str(opt, 'color');
  const variant = str(opt, 'variant');
  const top = tableTop(opt);
  let table: ReactNode;
  if (variant === 'round') {
    table = (
      <g>
        <OnFloor z={0.3}>
          <circle cx={40} cy={67.5} r={5} fill={shade(color, 0.35)} />
        </OnFloor>
        <IsoBox a={[39, 41]} c={[66.5, 68.5]} z={[0, 7.5]} color={shade(color, 0.2)} outline={false} />
        <OnFloor z={7.5}>
          <circle cx={40} cy={67.5} r={13.5} fill={shade(color, 0.3)} />
        </OnFloor>
        <OnFloor z={9.5}>
          <circle cx={40} cy={67.5} r={13.5} fill={color} stroke={OUTLINE} strokeWidth={0.6} vectorEffect="non-scaling-stroke" />
        </OnFloor>
      </g>
    );
  } else if (variant === 'low') {
    table = (
      <g>
        {[
          [32, 54],
          [45, 54],
          [32, 78],
          [45, 78],
        ].map(([a, c]) => (
          <IsoBox key={`${a}-${c}`} a={[a, a + 3]} c={[c, c + 3]} z={[0, 3]} color={shade(color, 0.15)} outline={false} />
        ))}
        <IsoBox a={[31, 49]} c={[53, 82]} z={[3, 6.5]} color={color} />
      </g>
    );
  } else if (variant === 'glass') {
    table = (
      <g>
        {[
          [32, 54],
          [46.5, 54],
          [32, 79.5],
          [46.5, 79.5],
        ].map(([a, c]) => (
          <IsoBox key={`${a}-${c}`} a={[a, a + 1.5]} c={[c, c + 1.5]} z={[0, 8.5]} color="#8C8A92" outline={false} />
        ))}
        <g opacity={0.75}>
          <IsoBox a={[31, 49]} c={[53, 82]} z={[8.5, 9.5]} color={color} />
        </g>
      </g>
    );
  } else if (variant === 'crate') {
    table = (
      <g>
        <IsoBox a={[32, 48]} c={[54, 81]} z={[0, 9]} color={color} />
        {[2.5, 5, 7.5].map((z) => (
          <g key={z}>
            <FaceA a={48.05} c={[54, 81]} z={[z - 0.25, z + 0.25]} fill={shade(color, 0.25)} />
            <FaceC a={[32, 48]} c={81.05} z={[z - 0.25, z + 0.25]} fill={shade(color, 0.35)} />
          </g>
        ))}
      </g>
    );
  } else {
    table = (
      <g>
        {[
          [33, 55],
          [45, 55],
          [33, 78],
          [45, 78],
        ].map(([a, c]) => (
          <IsoBox key={`${a}-${c}`} a={[a, a + 2]} c={[c, c + 2]} z={[0, 7]} color={WOOD_DARK} side={WOOD_DEEP} outline={false} />
        ))}
        <IsoBox a={[31, 49]} c={[53, 82]} z={[7, 9.5]} color={color} />
      </g>
    );
  }
  return (
    <g>
      {table}
      {items && <TableItems z={top} />}
    </g>
  );
}

/* ================================================================
 * Mesa de computador e computador da Mini Mansão
 * ================================================================ */

/** Altura do tampo da mesa de computador. */
const DESK_TOP = 23;

/** Mesa encostada na parede direita, no fundo da sala, com tapetinho para a cadeira. */
export function Desk({ opt }: { opt: AssetOption }) {
  const color = str(opt, 'color');
  const modern = str(opt, 'variant') === 'modern';
  const panel = shade(color, 0.12);
  return (
    <g>
      <OnFloor z={0.2}>
        <URect u={[113, 145]} v={[28, 52]} fill="#9CC9B4" />
        <URect u={[115, 143]} v={[30, 50]} fill="#B9DCCB" />
      </OnFloor>
      {modern ? (
        [
          [112, 3],
          [112, 23],
          [143, 3],
          [143, 23],
        ].map(([a, c]) => <IsoBox key={`${a}-${c}`} a={[a, a + 2]} c={[c, c + 2]} z={[0, DESK_TOP - 2]} color={panel} outline={false} />)
      ) : (
        <g>
          <IsoBox a={[112, 115]} c={[3, 25]} z={[0, DESK_TOP - 3]} color={panel} />
          <IsoBox a={[131, 145]} c={[3, 25]} z={[0, DESK_TOP - 3]} color={color} />
          {[1.5, 8, 14.5].map((z) => (
            <g key={z}>
              <FaceC a={[132.5, 143.5]} c={25.1} z={[z, z + 5]} fill={shade(color, -0.08)} />
              <FaceC a={[136.5, 139.5]} c={25.2} z={[z + 2, z + 3]} fill="#F8E6B5" />
            </g>
          ))}
        </g>
      )}
      <IsoBox a={[111, 146]} c={[2, 26]} z={[DESK_TOP - (modern ? 2 : 3), DESK_TOP]} color={color} />
      {modern && <FaceC a={[124, 134]} c={26.1} z={[DESK_TOP - 1.6, DESK_TOP - 0.6]} fill={shade(color, 0.2)} />}
    </g>
  );
}

/** Monitor, teclado e mouse sobre a mesa (o modelo clássico tem gabinete). */
export function Computer({ opt }: { opt: AssetOption }) {
  const color = str(opt, 'color');
  const flat = str(opt, 'variant') === 'flat';
  const z = DESK_TOP;
  return (
    <g>
      {!flat && (
        <g>
          <IsoBox a={[137, 144]} c={[4, 14]} z={[z, z + 15]} color={shade(color, 0.1)} />
          <FaceC a={[138.5, 142.5]} c={14.1} z={[z + 11, z + 12]} fill="#46353F" />
          <FaceC a={[140, 141]} c={14.1} z={[z + 3, z + 4]} fill="#7FD18B" />
        </g>
      )}
      <IsoBox a={[125, 129]} c={[4, 8]} z={[z, z + 1]} color={shade(color, 0.2)} />
      <IsoBox a={[126.5, 127.5]} c={[5, 6]} z={[z + 1, z + 4]} color={shade(color, 0.2)} outline={false} />
      {flat ? (
        <g>
          <IsoBox a={[118, 136]} c={[5, 7]} z={[z + 4, z + 16]} color={color} />
          <FaceC a={[119, 135]} c={7.1} z={[z + 5, z + 15]} fill="#BFE3F0" />
          <FaceC a={[120.5, 126]} c={7.15} z={[z + 11, z + 13.5]} fill="#FFFFFF" opacity={0.55} />
        </g>
      ) : (
        <g>
          <IsoBox a={[119, 135]} c={[3, 12]} z={[z + 3, z + 17]} color={color} />
          <FaceC a={[120.5, 133.5]} c={12.1} z={[z + 4.5, z + 15.5]} fill={shade(color, 0.35)} />
          <FaceC a={[121.5, 132.5]} c={12.15} z={[z + 5.5, z + 14.5]} fill="#8EC7D6" />
          <FaceC a={[122.5, 128]} c={12.2} z={[z + 11, z + 13]} fill="#FFFFFF" opacity={0.55} />
        </g>
      )}
      <IsoBox a={[119, 132]} c={[15, 19]} z={[z, z + 1]} color="#F4EDE4" />
      <FloorQuad a={[120, 131]} c={[16, 18]} z={z + 1.05} fill="#D9CFC4" />
      <IsoBox a={[134, 136.5]} c={[15.5, 18]} z={[z, z + 1]} color="#F4EDE4" />
    </g>
  );
}

/** Cadeira giratória de frente para a mesa (aparece junto com a mesa). */
export function DeskChair() {
  const dark = '#4F4A5E';
  return (
    <g>
      <IsoBox a={[122, 134]} c={[38, 39]} z={[0, 1.2]} color={dark} outline={false} />
      <IsoBox a={[127.5, 128.5]} c={[32, 45]} z={[0, 1.2]} color={dark} outline={false} />
      <IsoBox a={[127.3, 128.7]} c={[37.8, 39.2]} z={[1.2, 10]} color="#3B3646" outline={false} />
      <IsoBox a={[122, 134]} c={[32, 44]} z={[10, 12.5]} color={dark} />
      <IsoBox a={[123, 133]} c={[43, 45]} z={[12.5, 27]} color={dark} />
    </g>
  );
}


function TableItems({ z }: { z: number }) {
  const [fx, fy] = iso(42.5, 73.5, z + 8.5);
  const [sx, sy] = iso(42.5, 73.5, z + 4.5);
  return (
    <g>
      <IsoBox a={[36, 39]} c={[58, 61]} z={[z, z + 3.5]} color="#F2E6D8" />
      <IsoBox a={[36, 39]} c={[64, 67]} z={[z, z + 3.5]} color="#E0A58C" />
      <IsoBox a={[41, 44]} c={[72, 75]} z={[z, z + 4.5]} color="#7E9C8E" />
      <rect x={sx - 0.4} y={sy - 1} width={0.8} height={2} fill="#5E8660" />
      <rect x={fx - 1.5} y={fy} width={3} height={3} fill="#F2A7B5" />
    </g>
  );
}

/* ================================================================
 * Baú
 * ================================================================ */

export function Chest({ opt, open }: { opt: AssetOption; open: boolean }) {
  const color = str(opt, 'color');
  const trim = str(opt, 'trim');
  const variant = str(opt, 'variant');
  const basket = variant === 'basket';
  const lidColor = shade(color, -0.12);
  const weave = basket
    ? [2, 4, 6, 8, 10].map((z) => (
        <g key={z}>
          <FaceC a={[94, 112]} c={112.05} z={[z - 0.4, z + 0.4]} fill={shade(color, 0.25)} />
          <FaceA a={112.05} c={[98, 112]} z={[z - 0.4, z + 0.4]} fill={shade(color, 0.18)} />
        </g>
      ))
    : null;
  const [sx, sy] = iso(104, 105, 24);

  return (
    <g>
      <IsoBox a={[94, 112]} c={[98, 112]} z={[0, 11]} color={color} />
      {weave}
      {!basket && (
        <g>
          <FaceC a={[94, 112]} c={112.1} z={[4.5, 6]} fill={trim} />
          <FaceA a={112.1} c={[98, 112]} z={[4.5, 6]} fill={trim} />
        </g>
      )}
      {variant === 'treasure' && (
        <g>
          <FaceC a={[94, 95.5]} c={112.1} z={[0, 11]} fill={trim} />
          <FaceC a={[110.5, 112]} c={112.1} z={[0, 11]} fill={trim} />
          <FaceA a={112.1} c={[98, 99.5]} z={[0, 11]} fill={trim} />
        </g>
      )}
      {open ? (
        <g>
          <FloorQuad a={[94, 112]} c={[98, 112]} z={11.05} fill="#3A2A2E" />
          <IsoBox a={[94, 97]} c={[98, 112]} z={[11, 24]} color={lidColor} />
          <g className="sparkle">
            <rect x={sx - 0.5} y={sy - 4} width={1} height={9} fill="#FFE27A" />
            <rect x={sx - 4} y={sy - 0.5} width={9} height={1} fill="#FFE27A" />
            <rect x={sx + 6} y={sy - 8} width={2} height={2} fill="#F8E6B5" />
            <rect x={sx - 8} y={sy - 6} width={2} height={2} fill="#F8E6B5" />
          </g>
        </g>
      ) : (
        <g>
          <IsoBox a={[94, 112]} c={[98, 112]} z={[11, basket ? 13 : 15]} color={lidColor} />
          {variant === 'treasure' && <IsoBox a={[96, 110]} c={[100, 110]} z={[15, 17]} color={lidColor} />}
          {!basket && <FaceC a={[101, 105]} c={112.2} z={[7, 13]} fill={trim} />}
        </g>
      )}
    </g>
  );
}
