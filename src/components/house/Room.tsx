import { getOption, str } from '../../data/catalog';
import type { SceneVariant } from '../../data/houseConfig';
import type { HouseAppearance } from '../../types/house';
import { iso, OnFloor, OnLeftWall, OnRightWall, pts, shade, URect } from './iso';

/** Piso, paredes, rodapés e o acabamento das bordas da sala. */
export function Room({ appearance, variant = appearance.environment.layout }: { appearance: HouseAppearance; variant?: SceneVariant }) {
  const side = variant === 'mansao' ? 150 : 120;
  const wall = str(getOption('wallColor', appearance.environment.wallColor), 'color');
  const floor = getOption('floor', appearance.environment.floor);
  const fColor = str(floor, 'color');
  const fLine = str(floor, 'line');
  const tiles = str(floor, 'pattern') === 'tiles';
  const wallR = shade(wall, 0.08);
  const floorMarks = Array.from({ length: Math.floor(side / 15) - 1 }, (_, i) => (i + 1) * 15);
  const leftBottom = iso(0, side);
  const centerBottom = iso(side, side);
  const rightBottom = iso(side, 0);
  const leftTop = iso(0, side, 80);
  const centerTop = iso(0, 0, 80);
  const rightTop = iso(side, 0, 80);

  const seams: [number, number][] = [
    [20, 5], [50, 15], [80, 25], [35, 35], [65, 45], [95, 55], [15, 65], [45, 75], [75, 85], [105, 95], [30, 105], [60, 115], [90, 5], [110, 35],
  ];

  return (
    <g>
      {/* espessura do piso */}
      <polygon points={pts([leftBottom, [leftBottom[0], leftBottom[1] + 8], [centerBottom[0], centerBottom[1] + 8], centerBottom])} fill={str(floor, 'edge1')} />
      <polygon points={pts([centerBottom, [centerBottom[0], centerBottom[1] + 8], [rightBottom[0], rightBottom[1] + 8], rightBottom])} fill={str(floor, 'edge2')} />
      {/* piso */}
      <OnFloor>
        <URect u={[0, side]} v={[0, side]} fill={fColor} />
        {tiles ? (
          <g fill={fLine}>
            {floorMarks.map((k) => (
              <g key={k}>
                <rect x={k - 0.35} y={0} width={0.7} height={side} />
                <rect x={0} y={k - 0.35} width={side} height={0.7} />
              </g>
            ))}
          </g>
        ) : (
          <g fill={fLine}>
            {Array.from({ length: Math.floor(side / 10) - 1 }, (_, i) => (i + 1) * 10).map((c) => (
              <rect key={c} x={0} y={c - 0.35} width={side} height={0.7} />
            ))}
            {seams.map(([a, c]) => (
              <rect key={`${a}-${c}`} x={a - 0.35} y={c} width={0.7} height={10} />
            ))}
          </g>
        )}
      </OnFloor>

      {/* paredes */}
      <polygon points={pts([iso(0, side, 0), iso(0, 0, 0), iso(0, 0, 80), iso(0, side, 80)])} fill={wall} className="transition-[fill] duration-300" />
      <polygon points={pts([iso(0, 0, 0), iso(side, 0, 0), iso(side, 0, 80), iso(0, 0, 80)])} fill={wallR} className="transition-[fill] duration-300" />
      {variant === 'mansao' && appearance.environment.wallPattern !== 'pattern.none'
        ? <WallPattern patternId={appearance.environment.wallPattern} side={side} />
        : appearance.environment.wallPattern === 'legacy.dots' ? <WallDots wall={wall} side={side} /> : null}

      {/* rodapés */}
      <OnLeftWall>
        <URect u={[0, side]} v={[0, 4]} fill={shade(wall, 0.12)} />
      </OnLeftWall>
      <OnRightWall>
        <URect u={[0, side]} v={[0, 4]} fill={shade(wallR, 0.12)} />
      </OnRightWall>

      {/* topo e laterais das paredes */}
      <polygon points={pts([leftTop, centerTop, [centerTop[0] - 6, centerTop[1] - 3], [leftTop[0] - 6, leftTop[1] - 3]])} fill={shade(wall, -0.45)} />
      <polygon points={pts([centerTop, rightTop, [rightTop[0] + 6, rightTop[1] - 3], [centerTop[0] + 6, centerTop[1] - 3]])} fill={shade(wall, -0.45)} />
      <polygon points="154,9 160,12 166,9 160,6" fill={shade(wall, -0.45)} />
      <polygon points={pts([leftBottom, leftTop, [leftTop[0] - 6, leftTop[1] - 3], [leftBottom[0] - 6, leftBottom[1] - 3]])} fill={shade(wall, 0.2)} />
      <polygon points={pts([rightBottom, rightTop, [rightTop[0] + 6, rightTop[1] - 3], [rightBottom[0] + 6, rightBottom[1] - 3]])} fill={shade(wall, 0.27)} />
      <polygon points={pts([[leftBottom[0] - 6, leftBottom[1] - 3], leftBottom, [leftBottom[0], leftBottom[1] + 8], [leftBottom[0] - 6, leftBottom[1] + 5]])} fill={shade(str(floor, 'edge1'), 0.15)} />
      <polygon points={pts([[rightBottom[0] + 6, rightBottom[1] - 3], rightBottom, [rightBottom[0], rightBottom[1] + 8], [rightBottom[0] + 6, rightBottom[1] + 5]])} fill={shade(str(floor, 'edge2'), 0.15)} />
    </g>
  );
}

function WallDots({ wall, side }: { wall: string; side: number }) {
  const dots: { u: number; v: number }[] = [];
  for (let u = 8; u < side; u += 12) {
    for (let v = 10; v < 80; v += 12) {
      const uu = u + (Math.floor(v / 12) % 2 ? 6 : 0);
      if (uu < side - 2) dots.push({ u: uu, v });
    }
  }
  return (
    <g>
      <OnLeftWall offset={0.2}>
        {dots.map((d) => (
          <rect key={`l${d.u}-${d.v}`} x={d.u} y={d.v} width={1} height={1} fill={shade(wall, 0.06)} />
        ))}
      </OnLeftWall>
      <OnRightWall offset={0.2}>
        {dots.map((d) => (
          <rect key={`r${d.u}-${d.v}`} x={d.u} y={d.v} width={1} height={1} fill={shade(wall, 0.15)} />
        ))}
      </OnRightWall>
    </g>
  );
}

function WallPattern({ patternId, side }: { patternId: string; side: number }) {
  const opt = getOption('wallPattern', patternId);
  const pattern = str(opt, 'pattern');
  const color = str(opt, 'color');
  const accent = str(opt, 'accent');
  const columns = Math.max(1, Math.floor(side / 24));
  const spots = Array.from({ length: columns * 3 }, (_, i) => ({
    u: 10 + (i % columns) * 24 + (Math.floor(i / columns) % 2) * 8,
    v: 16 + Math.floor(i / columns) * 18,
  })).filter((p) => p.u < side - 8 && p.v < 72);
  const mark = (d: { u: number; v: number }, key: string) => {
    if (pattern === 'hearts') return <g key={key}><rect x={d.u} y={d.v + 1} width={5} height={3} fill={color} /><rect x={d.u + 1} y={d.v} width={3} height={5} fill={color} /></g>;
    if (pattern === 'stars') return <path key={key} d={'M' + (d.u + 2) + ' ' + d.v + 'l1.5 2h2l-1.6 1.4.6 2.2-2.5-1.2-2.5 1.2.6-2.2L' + d.u + ' ' + (d.v + 2) + 'h2z'} fill={accent} />;
    if (pattern === 'clouds') return <g key={key} fill={color}><rect x={d.u} y={d.v + 2} width={8} height={3} /><rect x={d.u + 2} y={d.v} width={4} height={4} /></g>;
    if (pattern === 'checker') return <g key={key}><rect x={d.u} y={d.v} width={8} height={8} fill={color} /><rect x={d.u + 4} y={d.v + 4} width={4} height={4} fill={accent} /></g>;
    if (pattern === 'floral') return <g key={key} fill={accent}><rect x={d.u + 2} y={d.v} width={2} height={6} /><rect x={d.u} y={d.v + 2} width={6} height={2} /><rect x={d.u + 2} y={d.v + 2} width={2} height={2} fill={color} /></g>;
    return <circle key={key} cx={d.u + 2} cy={d.v + 2} r={2} fill={accent} />;
  };
  return (
    <g opacity={0.72}>
      <OnLeftWall offset={0.25}>{spots.map((d, i) => mark(d, 'l-' + i))}</OnLeftWall>
      <OnRightWall offset={0.25}>{spots.map((d, i) => mark(d, 'r-' + i))}</OnRightWall>
    </g>
  );
}

/** Varal de luzinhas no topo das paredes. */
export function StringLights({ variant = 'free' }: { variant?: SceneVariant }) {
  const colors = ['#FFD89A', '#F8E6B5', '#F2A7B5'];
  const count = variant === 'mansao' ? 15 : 12;
  const walls = (['L', 'R'] as const).map((w) =>
    Array.from({ length: count }, (_, i) => {
      const u = 6 + i * 10;
      const z = 73 - (i % 2 ? 2 : 0);
      return w === 'L' ? iso(0, u, z) : iso(u, 0, z);
    }),
  );
  return (
    <g>
      {walls.map((line, w) => (
        <g key={w}>
          <polyline points={pts(line)} fill="none" stroke="#7a5a62" strokeWidth={0.6} />
          {line.map(([x, y], i) => (
            <rect key={i} className={`twinkle twinkle-${i % 3}`} x={x - 1} y={y} width={2} height={2} fill={colors[i % 3]} />
          ))}
        </g>
      ))}
    </g>
  );
}
