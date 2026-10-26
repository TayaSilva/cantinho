import type { ReactNode } from 'react';
import { getOption, str } from '../../data/catalog';
import type { CharacterAppearance, Rect } from '../../types/house';
import { boundsOf, boxPoints, FaceA, FaceC, iso, IsoBox, pts, shade } from './iso';

/** Área clicável do personagem (cabeça + tronco), em unidades da cena. */
export function characterHitbox(seat: number): Rect {
  return boundsOf(boxPoints({ a: [6, 14], c: [seat - 1, seat + 9], z: [12, 40] }), 0);
}

/** Ponto acima da cabeça, para o balão de fala. */
export function characterAnchor(seat: number): { x: number; y: number } {
  const r = characterHitbox(seat);
  return { x: r.x + r.w / 2, y: r.y - 2 };
}

const PANTS: Record<string, string> = {
  tshirt: '#5C6E8A',
  hoodie: '#46536B',
  sweater: '#8A6D5A',
};

/**
 * Personagem sentado no sofá, montado a partir das opções do catálogo:
 * tom de pele, cabelo (estilo e cor), roupa (modelo e cor), acessório e expressão.
 * Todas as peças foram desenhadas para a mesma pose sentada.
 */
export function Character({ look, seat, index = 0 }: { look: CharacterAppearance; seat: number; index?: number }) {
  const cc = seat;
  const skin = str(getOption('skinTone', look.skinTone), 'color');
  const hair = str(getOption('hairColor', look.hairColor), 'color');
  const hairStyle = str(getOption('hairStyle', look.hairStyle), 'style', 'short');
  const outfit = str(getOption('outfit', look.outfit), 'style', 'tshirt');
  const color = str(getOption('outfitColor', look.outfitColor), 'color');
  const accessory = str(getOption('accessory', look.accessory), 'kind', 'none');
  const expression = str(getOption('expression', look.expression), 'kind', 'smile');

  const shirt = outfit === 'overalls' ? '#F4EDE4' : color;
  const pants = outfit === 'overalls' ? color : PANTS[outfit] ?? '#5C6E8A';
  const shoes = '#46353F';
  const longSleeves = outfit === 'hoodie' || outfit === 'sweater' || outfit === 'overalls';
  const hairDark = shade(hair, 0.2);

  const parts: ReactNode[] = [];
  const box = (key: string, a: [number, number], c: [number, number], z: [number, number], col: string, extra: Partial<{ top: string; side: string; outline: boolean }> = {}) =>
    parts.push(<IsoBox key={key} a={a} c={c} z={z} color={col} {...extra} />);

  /* --- cabelo de trás (antes do corpo) --- */
  if (hairStyle === 'long') box('hair-back', [6, 8.5], [cc - 1, cc + 9], [15, 36], hair, { outline: false, side: hairDark });
  if (hairStyle === 'wavy') box('hair-back', [5.5, 8.5], [cc - 1.5, cc + 9.5], [22, 36], hair, { outline: false, side: hairDark });
  if (hairStyle === 'coily') box('hair-back', [3.5, 9], [cc - 3, cc + 11], [26, 44], hair, { side: hairDark });
  if (outfit === 'hoodie') box('hood', [4.5, 7.5], [cc, cc + 8], [22, 30], shade(color, 0.12));

  /* --- corpo --- */
  box('torso', [7, 13], [cc, cc + 8], [11, 26], shirt);
  if (longSleeves) box('arm-far', [8, 12], [cc - 2, cc], [15, 24], shirt);
  else {
    box('arm-far-up', [8, 12], [cc - 2, cc], [20, 24], shirt);
    box('arm-far-low', [8, 12], [cc - 2, cc], [15, 20], skin, { outline: false });
  }
  if (outfit === 'dress') {
    box('skirt', [11, 21.5], [cc - 0.3, cc + 8.3], [9, 14.5], color);
    box('shin-1', [19, 22], [cc + 0.8, cc + 3.2], [0, 9], skin);
    box('shin-2', [19, 22], [cc + 4.8, cc + 7.2], [0, 9], skin);
  } else {
    box('thigh-1', [12, 21], [cc + 0.5, cc + 3.5], [10, 14], pants);
    box('thigh-2', [12, 21], [cc + 4.5, cc + 7.5], [10, 14], pants);
    box('shin-1', [19, 22], [cc + 0.5, cc + 3.5], [0, 10], pants);
    box('shin-2', [19, 22], [cc + 4.5, cc + 7.5], [0, 10], pants);
  }
  box('shoe-1', [19, 24], [cc + 0.3, cc + 3.7], [0, 2], shoes, { outline: false });
  box('shoe-2', [19, 24], [cc + 4.3, cc + 7.7], [0, 2], shoes, { outline: false });

  /* --- detalhes da roupa --- */
  const details: ReactNode[] = [];
  if (outfit === 'overalls') {
    details.push(<FaceA key="bib" a={13.05} c={[cc + 1.5, cc + 6.5]} z={[11, 20]} fill={color} />);
    details.push(<FaceA key="strap1" a={13.05} c={[cc + 1.5, cc + 2.5]} z={[20, 26]} fill={color} />);
    details.push(<FaceA key="strap2" a={13.05} c={[cc + 5.5, cc + 6.5]} z={[20, 26]} fill={color} />);
    details.push(<FaceA key="pocket" a={13.1} c={[cc + 3, cc + 5]} z={[15, 17.5]} fill={shade(color, 0.2)} />);
    details.push(<FaceC key="side" a={[7, 13]} c={cc + 8.05} z={[11, 20]} fill={shade(color, 0.2)} />);
  }
  if (outfit === 'hoodie') {
    details.push(<FaceA key="pocket" a={13.05} c={[cc + 2, cc + 6]} z={[13, 16.5]} fill={shade(color, 0.15)} />);
    details.push(<FaceA key="cord1" a={13.05} c={[cc + 3, cc + 3.6]} z={[21, 25.5]} fill="#F4EDE4" />);
    details.push(<FaceA key="cord2" a={13.05} c={[cc + 4.6, cc + 5.2]} z={[21, 25.5]} fill="#F4EDE4" />);
  }
  if (outfit === 'sweater') {
    for (const z of [14.5, 19.5]) {
      details.push(<FaceA key={`s${z}`} a={13.05} c={[cc, cc + 8]} z={[z, z + 1.6]} fill={shade(color, -0.4)} />);
      details.push(<FaceC key={`sc${z}`} a={[7, 13]} c={cc + 8.05} z={[z, z + 1.6]} fill={shade(color, -0.25)} />);
    }
  }
  if (outfit === 'tshirt' || outfit === 'dress') {
    details.push(<FaceA key="collar" a={13.05} c={[cc + 2.5, cc + 5.5]} z={[24.8, 26]} fill={skin} />);
  }

  /* --- cabeça --- */
  const head = <IsoBox key="head" a={[6, 14]} c={[cc - 1, cc + 9]} z={[26, 36]} color={skin} top={skin} />;

  /* --- cabelo de cima --- */
  const top: ReactNode[] = [];
  if (hairStyle === 'coily') {
    top.push(<IsoBox key="afro-top" a={[5, 15]} c={[cc - 3, cc + 11]} z={[36, 45]} color={hair} side={hairDark} />);
    top.push(<IsoBox key="afro-side" a={[8, 14]} c={[cc + 9, cc + 11]} z={[29, 36]} color={hair} side={hairDark} outline={false} />);
    top.push(<FaceA key="afro-front" a={15.05} c={[cc - 3, cc + 11]} z={[36, 38]} fill={hairDark} />);
  } else {
    top.push(<IsoBox key="hair-top" a={[5.5, 14.5]} c={[cc - 1.5, cc + 9.5]} z={[36, 39]} color={hair} side={hairDark} />);
    if (hairStyle === 'curly') {
      [
        [6, cc - 1],
        [9, cc + 3],
        [6, cc + 6],
        [11, cc - 1],
        [11, cc + 6],
      ].forEach(([a, c], i) => top.push(<IsoBox key={`curl${i}`} a={[a, a + 3.5]} c={[c, c + 3.5]} z={[39, 41]} color={hair} side={hairDark} outline={false} />));
      top.push(<IsoBox key="curl-side" a={[6, 12]} c={[cc + 9, cc + 10.5]} z={[27, 36]} color={hair} side={hairDark} outline={false} />);
    }
    if (hairStyle === 'wavy') {
      top.push(<IsoBox key="wave-side" a={[6, 12]} c={[cc + 9, cc + 10]} z={[25, 36]} color={hair} side={hairDark} outline={false} />);
      top.push(<IsoBox key="wave-tip" a={[10, 13]} c={[cc + 9, cc + 10.5]} z={[25, 28]} color={hair} side={hairDark} outline={false} />);
    }
    // franja
    top.push(<FaceA key="fringe" a={14.05} c={[cc - 1, cc + 9]} z={[hairStyle === 'curly' ? 33.5 : 33, 36]} fill={hair} />);
    if (hairStyle === 'curly') {
      top.push(<FaceA key="fringe-n1" a={14.1} c={[cc + 1, cc + 2.5]} z={[33, 33.5]} fill={hair} />);
      top.push(<FaceA key="fringe-n2" a={14.1} c={[cc + 6, cc + 7.5]} z={[33, 33.5]} fill={hair} />);
    }
    // lateral
    const low = hairStyle === 'short' ? 31 : hairStyle === 'long' ? 26 : 29;
    top.push(<polygon key="side" points={pts([iso(6, cc + 9.05, 36), iso(14, cc + 9.05, 36), iso(14, cc + 9.05, 33), iso(10, cc + 9.05, 31), iso(6, cc + 9.05, low)])} fill={hair} />);
  }

  return (
    <g className="character">
      {parts}
      {details}
      {head}
      {top}
      <Face cc={cc} kind={expression} late={index % 2 === 1} />
      {/* braço da frente e mão */}
      {longSleeves ? (
        <IsoBox a={[8, 13]} c={[cc + 8, cc + 10]} z={[15, 24]} color={shirt} />
      ) : (
        <g>
          <IsoBox a={[8, 13]} c={[cc + 8, cc + 10]} z={[20, 24]} color={shirt} />
          <IsoBox a={[8, 13]} c={[cc + 8, cc + 10]} z={[15, 20]} color={skin} outline={false} />
        </g>
      )}
      <IsoBox a={[11, 15]} c={[cc + 8.2, cc + 9.8]} z={[15, 17]} color={skin} outline={false} />
      <Accessory kind={accessory} cc={cc} coily={hairStyle === 'coily'} />
    </g>
  );
}

/* ---------------- Rosto ---------------- */

function Face({ cc, kind, late }: { cc: number; kind: string; late: boolean }) {
  const at = (c: number, z: number): [number, number] => iso(14.1, c, z);
  const e1 = at(cc + 1.5, 31);
  const e2 = at(cc + 6, 31);
  const blink = `eye ${late ? 'eye-late' : ''}`;
  const blush = (
    <g fill="#E89A9A" opacity={0.8}>
      <rect x={at(cc + 0.5, 28.5)[0]} y={at(cc + 0.5, 28.5)[1]} width={1.6} height={1} />
      <rect x={at(cc + 7.5, 28.5)[0]} y={at(cc + 7.5, 28.5)[1]} width={1.6} height={1} />
    </g>
  );
  const [mx, my] = at(cc + 4, 28.2);
  const heart = ([x, y]: [number, number], key: string) => (
    <g key={key} fill="#C2577A">
      <rect x={x - 0.3} y={y} width={0.8} height={0.8} />
      <rect x={x + 0.9} y={y} width={0.8} height={0.8} />
      <rect x={x - 0.3} y={y + 0.8} width={2} height={0.8} />
      <rect x={x + 0.3} y={y + 1.6} width={0.8} height={0.7} />
    </g>
  );

  switch (kind) {
    case 'happy':
      return (
        <g>
          <rect x={e1[0] - 0.3} y={e1[1] + 0.6} width={2} height={0.7} fill="#2B1E24" />
          <rect x={e2[0] - 0.3} y={e2[1] + 0.6} width={2} height={0.7} fill="#2B1E24" />
          {blush}
          <rect x={mx - 0.5} y={my - 0.4} width={2.4} height={1.4} fill="#9E4A55" />
        </g>
      );
    case 'wink':
      return (
        <g>
          <rect className={blink} x={e1[0]} y={e1[1]} width={1.4} height={2.2} fill="#2B1E24" />
          <rect x={e2[0] - 0.3} y={e2[1] + 1} width={2} height={0.7} fill="#2B1E24" />
          {blush}
          <rect x={mx - 0.3} y={my} width={2} height={0.8} fill="#9E5A5A" />
        </g>
      );
    case 'surprised':
      return (
        <g>
          <rect className={blink} x={e1[0] - 0.2} y={e1[1] - 0.5} width={1.7} height={2.8} fill="#2B1E24" />
          <rect className={blink} x={e2[0] - 0.2} y={e2[1] - 0.5} width={1.7} height={2.8} fill="#2B1E24" />
          <rect x={mx + 0.1} y={my - 0.4} width={1.3} height={1.6} fill="#9E4A55" />
        </g>
      );
    case 'love':
      return (
        <g>
          {heart(e1, 'h1')}
          {heart(e2, 'h2')}
          {blush}
          <rect x={mx - 0.3} y={my} width={2} height={0.8} fill="#9E5A5A" />
        </g>
      );
    default:
      return (
        <g>
          <rect className={blink} x={e1[0]} y={e1[1]} width={1.4} height={2.2} fill="#2B1E24" />
          <rect className={blink} x={e2[0]} y={e2[1]} width={1.4} height={2.2} fill="#2B1E24" />
          {blush}
          <rect x={mx - 0.3} y={my} width={2} height={0.8} fill="#9E5A5A" />
        </g>
      );
  }
}

/* ---------------- Acessórios ---------------- */

function Accessory({ kind, cc, coily }: { kind: string; cc: number; coily: boolean }) {
  const topZ = coily ? 45 : 39;
  switch (kind) {
    case 'glasses': {
      const lens = (c: number, key: string) => (
        <g key={key}>
          <FaceA a={14.2} c={[c - 0.7, c + 2.1]} z={[28.2, 31.8]} fill="#2B2024" />
          <FaceA a={14.25} c={[c - 0.2, c + 1.6]} z={[28.7, 31.3]} fill="#BFE3F0" opacity={0.55} />
        </g>
      );
      return (
        <g>
          {lens(cc + 1.5, 'l1')}
          {lens(cc + 6, 'l2')}
          <FaceA a={14.2} c={[cc + 3.4, cc + 5.3]} z={[30.2, 30.8]} fill="#2B2024" />
          <FaceC a={[9, 14.2]} c={cc + 9.1} z={[30.2, 30.8]} fill="#2B2024" />
        </g>
      );
    }
    case 'cap':
      return (
        <g>
          <IsoBox a={[5, 14.8]} c={[cc - 1.8, cc + 9.8]} z={[topZ - 2, topZ + 2.5]} color="#C2577A" />
          <IsoBox a={[14.8, 18.5]} c={[cc, cc + 8]} z={[topZ - 2, topZ - 1]} color="#A8456A" />
          <IsoBox a={[9, 11]} c={[cc + 3, cc + 5]} z={[topZ + 2.5, topZ + 3.2]} color="#A8456A" outline={false} />
        </g>
      );
    case 'bow':
      return (
        <g>
          <IsoBox a={[7, 10]} c={[cc + 4, cc + 7]} z={[topZ - 0.5, topZ + 3]} color="#E7A9B4" />
          <IsoBox a={[7, 10]} c={[cc + 8, cc + 11]} z={[topZ - 0.5, topZ + 3]} color="#E7A9B4" />
          <IsoBox a={[7.3, 9.7]} c={[cc + 7, cc + 8]} z={[topZ, topZ + 2.4]} color="#C98190" />
        </g>
      );
    case 'headphones':
      return (
        <g>
          <IsoBox a={[8, 11.5]} c={[cc - 2.5, cc - 1]} z={[28.5, 34.5]} color="#E3A857" outline={false} />
          <IsoBox a={[8.5, 10.5]} c={[cc - 2, cc + 10]} z={[topZ, topZ + 1.5]} color="#3A3340" />
          <IsoBox a={[7.5, 12]} c={[cc + 9, cc + 11]} z={[28.5, 34.5]} color="#E3A857" />
          <FaceC a={[8.3, 11.2]} c={cc + 11.05} z={[29.5, 33.5]} fill="#3A3340" />
        </g>
      );
    default:
      return null;
  }
}
