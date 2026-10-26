import { getOption, str } from '../../data/catalog';
import type { HouseAppearance } from '../../types/house';
import { iso, OnFloor, OnLeftWall, OnRightWall, pts, shade, URect } from './iso';

/** Piso, paredes, rodapés e o acabamento das bordas da sala. */
export function Room({ appearance }: { appearance: HouseAppearance }) {
  const wall = str(getOption('wallColor', appearance.environment.wallColor), 'color');
  const floor = getOption('floor', appearance.environment.floor);
  const fColor = str(floor, 'color');
  const fLine = str(floor, 'line');
  const tiles = str(floor, 'pattern') === 'tiles';
  const wallR = shade(wall, 0.08);

  const seams: [number, number][] = [
    [20, 5], [50, 15], [80, 25], [35, 35], [65, 45], [95, 55], [15, 65], [45, 75], [75, 85], [105, 95], [30, 105], [60, 115], [90, 5], [110, 35],
  ];

  return (
    <g>
      {/* espessura do piso */}
      <polygon points={pts([iso(0, 120), [40, 160], [160, 220], iso(120, 120)])} fill={str(floor, 'edge1')} />
      <polygon points={pts([iso(120, 120), [160, 220], [280, 160], iso(120, 0)])} fill={str(floor, 'edge2')} />
      {/* piso */}
      <OnFloor>
        <URect u={[0, 120]} v={[0, 120]} fill={fColor} />
        {tiles ? (
          <g fill={fLine}>
            {[15, 30, 45, 60, 75, 90, 105].map((k) => (
              <g key={k}>
                <rect x={k - 0.35} y={0} width={0.7} height={120} />
                <rect x={0} y={k - 0.35} width={120} height={0.7} />
              </g>
            ))}
          </g>
        ) : (
          <g fill={fLine}>
            {[10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110].map((c) => (
              <rect key={c} x={0} y={c - 0.35} width={120} height={0.7} />
            ))}
            {seams.map(([a, c]) => (
              <rect key={`${a}-${c}`} x={a - 0.35} y={c} width={0.7} height={10} />
            ))}
          </g>
        )}
      </OnFloor>

      {/* paredes */}
      <polygon points={pts([iso(0, 120, 0), iso(0, 0, 0), iso(0, 0, 80), iso(0, 120, 80)])} fill={wall} className="transition-[fill] duration-300" />
      <polygon points={pts([iso(0, 0, 0), iso(120, 0, 0), iso(120, 0, 80), iso(0, 0, 80)])} fill={wallR} className="transition-[fill] duration-300" />
      {appearance.decorations.wallPattern && <WallDots wall={wall} />}

      {/* rodapés */}
      <OnLeftWall>
        <URect u={[0, 120]} v={[0, 4]} fill={shade(wall, 0.12)} />
      </OnLeftWall>
      <OnRightWall>
        <URect u={[0, 120]} v={[0, 4]} fill={shade(wallR, 0.12)} />
      </OnRightWall>

      {/* topo e laterais das paredes */}
      <polygon points={pts([iso(0, 120, 80), iso(0, 0, 80), [154, 9], [34, 69]])} fill={shade(wall, -0.45)} />
      <polygon points={pts([iso(0, 0, 80), iso(120, 0, 80), [286, 69], [166, 9]])} fill={shade(wall, -0.45)} />
      <polygon points="154,9 160,12 166,9 160,6" fill={shade(wall, -0.45)} />
      <polygon points={pts([iso(0, 120, 0), iso(0, 120, 80), [34, 69], [34, 149]])} fill={shade(wall, 0.2)} />
      <polygon points={pts([iso(120, 0, 0), iso(120, 0, 80), [286, 69], [286, 149]])} fill={shade(wall, 0.27)} />
      <polygon points="34,149 40,152 40,160 34,157" fill={shade(str(floor, 'edge1'), 0.15)} />
      <polygon points="286,149 280,152 280,160 286,157" fill={shade(str(floor, 'edge2'), 0.15)} />
    </g>
  );
}

function WallDots({ wall }: { wall: string }) {
  const dots: { u: number; v: number }[] = [];
  for (let u = 8; u < 120; u += 12) {
    for (let v = 10; v < 80; v += 12) {
      const uu = u + (Math.floor(v / 12) % 2 ? 6 : 0);
      if (uu < 118) dots.push({ u: uu, v });
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

/** Varal de luzinhas no topo das paredes. */
export function StringLights() {
  const colors = ['#FFD89A', '#F8E6B5', '#F2A7B5'];
  const walls = (['L', 'R'] as const).map((w) =>
    Array.from({ length: 12 }, (_, i) => {
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
