import { useId } from 'react';
import type { ReactNode } from 'react';
import { getOption, str } from '../../data/catalog';
import type { HouseAppearance, PeriodTheme } from '../../types/house';
import { IsoBox, OnLeftWall, shade, URect } from './iso';

type Shape = 'classic' | 'tall' | 'single' | 'arched' | 'round';

/** Área de vidro de cada modelo, em coordenadas da parede (u = c, v = altura). */
const GLASS: Record<Shape, { u: [number, number]; v: [number, number] }> = {
  classic: { u: [50, 86], v: [32, 64] },
  tall: { u: [56, 80], v: [24, 68] },
  single: { u: [48, 88], v: [34, 62] },
  arched: { u: [52, 84], v: [30, 70] },
  round: { u: [51, 85], v: [33, 67] },
};

/**
 * Lua crescente em pixel art, como aparece na tela ("#" = pixel aceso).
 * A parede esquerda espelha u e inverte v, então cada pixel é convertido
 * para u = 80 - coluna e v = 60 - linha.
 */
const MOON = ['..####..', '.####...', '####....', '###.....', '###.....', '####....', '.####...', '..####..'];
const MOON_PATH = MOON.flatMap((row, r) => [...row].map((c, col) => (c === '#' ? `M${79 - col} ${59 - r}h1v1h-1z` : ''))).join('');

/** Forma do vidro (ou da moldura, se `grow` > 0). */
function GlassShape({ shape, grow, fill }: { shape: Shape; grow: number; fill: string }) {
  const g = GLASS[shape];
  if (shape === 'round') return <circle cx={68} cy={50} r={17 + grow} fill={fill} />;
  if (shape === 'arched') {
    const [u1, u2] = g.u;
    const r = (u2 - u1) / 2 + grow;
    const base = 54;
    return <path d={`M ${u1 - grow} ${g.v[0] - grow} L ${u2 + grow} ${g.v[0] - grow} L ${u2 + grow} ${base} A ${r} ${r} 0 0 1 ${u1 - grow} ${base} Z`} fill={fill} />;
  }
  return <URect u={[g.u[0] - grow, g.u[1] + grow]} v={[g.v[0] - grow, g.v[1] + grow]} fill={fill} />;
}

/**
 * Janela da parede esquerda: modelo, cortina, cor da cortina e o céu
 * (que segue o horário do visitante quando a janela dinâmica está ativa).
 */
export function DynamicWindow({ appearance, theme }: { appearance: HouseAppearance; theme: PeriodTheme }) {
  const rawId = useId();
  const clipId = `sky-${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const shape = str(getOption('windowModel', appearance.environment.windowModel), 'shape', 'classic') as Shape;
  const curtain = str(getOption('curtainStyle', appearance.environment.curtainStyle), 'style', 'sides');
  const cColor = str(getOption('curtainColor', appearance.environment.curtainColor), 'color');
  const g = GLASS[shape];
  const [u1, u2] = g.u;
  const [v1, v2] = g.v;
  const mid = (u1 + u2) / 2;
  const rodV = Math.min(76, v2 + 5);
  const wood = '#A7755B';
  const woodDark = '#8A5D46';

  return (
    <g>
      <OnLeftWall offset={0.3}>
        <defs>
          <clipPath id={clipId}>
            <GlassShape shape={shape} grow={0} fill="#fff" />
          </clipPath>
        </defs>
        {/* moldura */}
        <GlassShape shape={shape} grow={4} fill={woodDark} />
        <GlassShape shape={shape} grow={2} fill={wood} />
        {/* céu */}
        <g clipPath={`url(#${clipId})`}>
          <rect x={30} y={10} width={80} height={80} fill={theme.sky} className="transition-[fill] duration-1000" />
          {theme.sun && (
            <g>
              <URect u={[57, 63]} v={[52, 58]} fill="#FFE27A" />
              <URect u={[56, 64]} v={[53, 57]} fill="#FFE27A" />
            </g>
          )}
          {theme.moon && <path d={MOON_PATH} fill="#F8F0D8" />}
          {theme.stars &&
            [[54, 60], [66, 58], [72, 48], [82, 62], [58, 46], [80, 44], [64, 50], [60, 66], [76, 68]].map(([u, v], i) => (
              <URect key={i} className={`twinkle twinkle-${i % 3}`} u={[u, u + 1]} v={[v, v + 1]} fill="#FFF6D8" />
            ))}
          {theme.cloud && (
            <g className="cloud-drift">
              <URect u={[69, 79]} v={[51, 53]} fill="#FFFFFF" />
              <URect u={[71, 76]} v={[53, 55]} fill="#FFFFFF" />
            </g>
          )}
          <polygon points="30,20 30,40 50,40 58,44 66,41 74,45 86,38 110,40 110,20" fill={theme.hill1} />
          <polygon points="30,20 30,36 50,36 62,38 72,35 86,36 110,35 110,20" fill={theme.hill2} />
          {/* caixilhos */}
          {shape !== 'single' && <URect u={[mid - 1, mid + 1]} v={[v1, v2 + 4]} fill={wood} />}
          {(shape === 'classic' || shape === 'tall' || shape === 'round') && <URect u={[u1, u2]} v={[(v1 + v2) / 2 - 1, (v1 + v2) / 2 + 1]} fill={wood} />}
          {shape === 'arched' && <URect u={[u1, u2]} v={[53, 55]} fill={wood} />}
        </g>
      </OnLeftWall>

      {/* parapeito */}
      <IsoBox a={[0, 4]} c={[u1 - 4, u2 + 4]} z={[v1 - 6, v1 - 4]} color={wood} top="#C08C6E" side={woodDark} outline={false} />

      {/* cortinas */}
      {curtain !== 'none' && (
        <OnLeftWall offset={1.4}>
          <Curtains style={curtain} color={cColor} u1={u1} u2={u2} v1={v1} v2={v2} rodV={rodV} />
        </OnLeftWall>
      )}
    </g>
  );
}

function Curtains({ style, color, u1, u2, v1, v2, rodV }: { style: string; color: string; u1: number; u2: number; v1: number; v2: number; rodV: number }) {
  const dark = shade(color, 0.14);
  const rod = (from: number, to: number, v: number): ReactNode => <URect u={[from, to]} v={[v, v + 1.5]} fill="#6E4836" />;

  if (style === 'valance') {
    const scallops = [];
    for (let u = u1 - 6; u < u2 + 6; u += 4) scallops.push(<URect key={u} u={[u, u + 2]} v={[rodV - 11, rodV - 9]} fill={color} />);
    return (
      <g>
        <URect u={[u1 - 6, u2 + 6]} v={[rodV - 9, rodV]} fill={color} />
        <URect u={[u1 - 6, u2 + 6]} v={[rodV - 3, rodV - 2]} fill={dark} />
        {scallops}
        {rod(u1 - 8, u2 + 8, rodV)}
      </g>
    );
  }
  if (style === 'cafe') {
    const half = (v1 + v2) / 2;
    return (
      <g>
        <URect u={[u1 - 1, u2 + 1]} v={[v1 - 1, half]} fill={color} />
        {[0.2, 0.4, 0.6, 0.8].map((k) => (
          <URect key={k} u={[u1 + (u2 - u1) * k - 0.6, u1 + (u2 - u1) * k + 0.6]} v={[v1 - 1, half]} fill={dark} />
        ))}
        {rod(u1 - 3, u2 + 3, half)}
      </g>
    );
  }
  const bottom = style === 'long' ? 6 : Math.max(18, v1 - 10);
  return (
    <g>
      <g className="curtain">
        <URect u={[u2, u2 + 9]} v={[bottom, rodV]} fill={color} />
        <URect u={[u2 + 5, u2 + 7]} v={[bottom, rodV]} fill={dark} />
      </g>
      <g className="curtain curtain-late">
        <URect u={[u1 - 9, u1]} v={[bottom, rodV]} fill={color} />
        <URect u={[u1 - 7, u1 - 5]} v={[bottom, rodV]} fill={dark} />
      </g>
      {rod(u1 - 12, u2 + 12, rodV)}
    </g>
  );
}
