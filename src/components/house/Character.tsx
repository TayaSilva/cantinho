import type { ReactNode } from 'react';
import { getOption, str } from '../../data/catalog';
import type { CharacterAge, CharacterAppearance, Rect } from '../../types/house';
import { boundsOf, boxPoints, FaceA, FaceC, iso, pathLength, RoundBox, shade, WrapFace, wrapPath } from './iso';
import { HairBack, HairBackView, hairDomeTop, HairFront, hairTop, HEAD_R } from './Hair';

/** Área clicável do personagem (cabeça + tronco), em unidades da cena. */
export const CHILD_SCALE = 0.86;

function scalePoint(point: [number, number], base: [number, number], age: CharacterAge = 'adult'): [number, number] {
  if (age !== 'child') return point;
  return [base[0] + (point[0] - base[0]) * CHILD_SCALE, base[1] + (point[1] - base[1]) * CHILD_SCALE];
}

/** Faixa do eixo a espelhada para quem senta de costas, com o encosto terminando em `backA`. */
const flip = (backA: number, [lo, hi]: [number, number]): [number, number] => [backA - hi, backA - lo];

/** Com `backA`, calcula a área de um personagem visto de costas (sofá da frente). */
export function characterHitbox(seat: number, age: CharacterAge = 'adult', backA?: number): Rect {
  const a: [number, number] = backA === undefined ? [6, 14] : flip(backA, [6, 14]);
  const base = iso(backA === undefined ? 13 : backA - 13, seat + 4, 0);
  const r = boundsOf(boxPoints({ a, c: [seat - 1, seat + 9], z: [12, 40] }), 0);
  const corners: [number, number][] = [[r.x, r.y], [r.x + r.w, r.y], [r.x, r.y + r.h], [r.x + r.w, r.y + r.h]];
  const points = corners.map((point) => scalePoint(point, base, age));
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
}

/** Ponto acima da cabeça, para o balão de fala. */
export function characterAnchor(seat: number, age: CharacterAge = 'adult', backA?: number): { x: number; y: number } {
  const r = characterHitbox(seat, age, backA);
  return { x: r.x + r.w / 2, y: r.y - 2 };
}

/** Arredondamento do corpo: tronco (ombros em cúpula) e braços. */
const TORSO_R = 1.6;
const TORSO_BEVEL = 2;
const LIMB_R = 1.15;

const PANTS: Record<string, string> = {
  tshirt: '#5C6E8A',
  hoodie: '#46536B',
  sweater: '#8A6D5A',
  jacket: '#46536B',
  jumpsuit: '#7E9C8E',
};

/**
 * Personagem sentado no sofá, montado a partir das opções do catálogo:
 * tom de pele, cabelo (estilo e cor), roupa (modelo e cor), acessório e expressão.
 * Todas as peças foram desenhadas para a mesma pose sentada.
 */
export function Character({ look, seat, index = 0 }: { look: CharacterAppearance; seat: number; index?: number }) {
  const cc = seat;
  const age = look.age ?? 'adult';
  const skin = str(getOption('skinTone', look.skinTone), 'color');
  const hair = str(getOption('hairColor', look.hairColor), 'color');
  const hairStyle = str(getOption('hairStyle', look.hairStyle), 'style', 'short');
  const outfit = str(getOption('outfit', look.outfit), 'style', 'tshirt');
  const color = str(getOption('outfitColor', look.outfitColor), 'color');
  const accessory = str(getOption('accessory', look.accessory), 'kind', 'none');
  const expression = str(getOption('expression', look.expression), 'kind', 'smile');

  const shirt = outfit === 'overalls' || outfit === 'jumpsuit' ? '#F4EDE4' : color;
  const pants = outfit === 'overalls' ? color : PANTS[outfit] ?? '#5C6E8A';
  const shoes = '#46353F';
  const longSleeves = outfit === 'hoodie' || outfit === 'sweater' || outfit === 'overalls' || outfit === 'jacket' || outfit === 'jumpsuit';
  const base = iso(13, cc + 4, 0);
  const transform = age === 'child' ? `translate(${base[0]} ${base[1]}) scale(${CHILD_SCALE}) translate(${-base[0]} ${-base[1]})` : undefined;

  const parts: ReactNode[] = [];
  const box = (key: string, a: [number, number], c: [number, number], z: [number, number], col: string, extra: Partial<{ top: string; side: string; outline: boolean; r: number; bevel: number }> = {}) =>
    parts.push(<RoundBox key={key} a={a} c={c} z={z} color={col} r={0.7} {...extra} />);

  /* --- cabelo de trás (antes do corpo) --- */
  if (outfit === 'hoodie') box('hood', [4.5, 7.5], [cc, cc + 8], [22, 30], shade(color, 0.12), { r: 1.5, bevel: 1.5 });

  /* --- corpo (o braço de lá vem antes do tronco, que o esconde) --- */
  parts.push(<Arm key="arm-far" a={[8.4, 12.8]} c={[cc - 2.7, cc - 0.3]} shirt={shirt} skin={skin} longSleeves={longSleeves} />);
  box('torso', [7, 13], [cc, cc + 8], [11, 26], shirt, { r: TORSO_R, bevel: TORSO_BEVEL });
  if (outfit === 'dress' || outfit === 'skirt') {
    box('skirt', [11, 21.5], [cc - 0.3, cc + 8.3], [9, 14.5], color, { r: 2, bevel: 1.6 });
    box('shin-1', [19, 22], [cc + 0.8, cc + 3.2], [0, 9], skin, { r: 1.1, bevel: 0.6 });
    box('shin-2', [19, 22], [cc + 4.8, cc + 7.2], [0, 9], skin, { r: 1.1, bevel: 0.6 });
  } else {
    // cada perna (coxa + canela) é uma peça só: primeiro o contorno das duas partes,
    // depois o preenchimento por cima, que apaga a linha do joelho entre elas
    for (const [key, c] of [['leg-1', [cc + 0.5, cc + 3.5]], ['leg-2', [cc + 4.5, cc + 7.5]]] as const) {
      const shin = { a: [19, 22] as [number, number], c: [...c] as [number, number], z: [0, 10] as [number, number], r: 1.2, bevel: 0 };
      const thigh = { a: [12, 22] as [number, number], c: [...c] as [number, number], z: [10, 14] as [number, number], r: 1.2, bevel: 1.4 };
      parts.push(
        <g key={key}>
          <RoundBox {...shin} color={pants} outlineWidth={1.6} />
          <RoundBox {...thigh} color={pants} outlineWidth={1.6} />
          <RoundBox {...shin} color={pants} outline={false} />
          <RoundBox {...thigh} color={pants} outline={false} />
        </g>,
      );
    }
  }
  box('shoe-1', [19, 24], [cc + 0.3, cc + 3.7], [0, 2], shoes, { outline: false, r: 1.5, bevel: 1 });
  box('shoe-2', [19, 24], [cc + 4.3, cc + 7.7], [0, 2], shoes, { outline: false, r: 1.5, bevel: 1 });

  /* --- detalhes da roupa (dentro da frente arredondada do tronco) --- */
  const details: ReactNode[] = [];
  const torsoPath = wrapPath([7, 13.05], [cc, cc + 8.05], TORSO_R);
  const torsoFront = pathLength(torsoPath.slice(0, 2)) + TORSO_R * Math.SQRT1_2;
  const band = (key: string, z: [number, number], front: string, side: string, upTo = pathLength(torsoPath)) => {
    details.push(<WrapFace key={`${key}-f`} path={torsoPath} s={[0, torsoFront]} z={z} fill={front} />);
    details.push(<WrapFace key={`${key}-s`} path={torsoPath} s={[torsoFront, upTo]} z={z} fill={side} />);
  };
  if (outfit === 'overalls' || outfit === 'jumpsuit') {
    details.push(<FaceA key="bib" a={13.05} c={[cc + 1.8, cc + 6.2]} z={[11, 20]} fill={color} />);
    details.push(<FaceA key="strap1" a={13.05} c={[cc + 1.8, cc + 2.8]} z={[20, 24]} fill={color} />);
    details.push(<FaceA key="strap2" a={13.05} c={[cc + 5.2, cc + 6.2]} z={[20, 24]} fill={color} />);
    details.push(<FaceA key="pocket" a={13.1} c={[cc + 3, cc + 5]} z={[15, 17.5]} fill={shade(color, 0.2)} />);
    details.push(<WrapFace key="side" path={torsoPath} s={[torsoFront + 0.3, pathLength(torsoPath)]} z={[11, 20]} fill={shade(color, 0.2)} />);
  }
  if (outfit === 'hoodie') {
    details.push(<FaceA key="pocket" a={13.05} c={[cc + 2, cc + 6]} z={[13, 16.5]} fill={shade(color, 0.15)} />);
    details.push(<FaceA key="cord1" a={13.05} c={[cc + 3, cc + 3.6]} z={[20.5, 24]} fill="#F4EDE4" />);
    details.push(<FaceA key="cord2" a={13.05} c={[cc + 4.6, cc + 5.2]} z={[20.5, 24]} fill="#F4EDE4" />);
  }
  if (outfit === 'sweater') {
    for (const z of [14.5, 19.5]) band(`s${z}`, [z, z + 1.6], shade(color, -0.4), shade(color, -0.25));
  }
  if (outfit === 'jacket') {
    details.push(<FaceA key="zip" a={13.05} c={[cc + 3.8, cc + 4.8]} z={[12, 24]} fill={shade(color, -0.25)} />);
    details.push(<FaceA key="collar-jacket" a={13.1} c={[cc + 1.8, cc + 6.2]} z={[22.4, 24]} fill={shade(color, 0.2)} />);
  }
  if (outfit === 'tshirt' || outfit === 'tank' || outfit === 'dress' || outfit === 'skirt') {
    details.push(<FaceA key="collar" a={13.05} c={[cc + 2.5, cc + 5.5]} z={[23, 24]} fill={skin} />);
  }

  /* --- cabeça --- */
  const head = <RoundBox key="head" a={[6, 14]} c={[cc - 1, cc + 9]} z={[26, 36]} r={HEAD_R} bevel={1.6} color={skin} top={skin} />;

  return (
    <g className="character" transform={transform}>
      <HairBack style={hairStyle} color={hair} cc={cc} />
      {parts}
      {details}
      <AccessoryBehind kind={accessory} cc={cc} style={hairStyle} />
      {head}
      <HairFront style={hairStyle} color={hair} cc={cc} />
      <Face cc={cc} kind={expression} late={index % 2 === 1} />
      {/* braço da frente e mão */}
      <Arm a={[8, 13]} c={[cc + 7.8, cc + 10.2]} shirt={shirt} skin={skin} longSleeves={longSleeves} hand />
      <Accessory kind={accessory} cc={cc} style={hairStyle} />
    </g>
  );
}

/**
 * Braço arredondado: manga em cima, antebraço (pele ou manga) e, se pedido, a mão no colo.
 * Como nas pernas, as partes recebem primeiro um contorno grosso e depois o preenchimento
 * por cima, então não aparece linha entre antebraço e mão (nem no meio da manga comprida).
 */
function Arm({ a, c, shirt, skin, longSleeves, hand = false }: { a: [number, number]; c: [number, number]; shirt: string; skin: string; longSleeves: boolean; hand?: boolean }) {
  const lower = { a, c, z: [15, 20.5] as [number, number], r: LIMB_R, bevel: 0, color: longSleeves ? shirt : skin };
  const upper = { a, c, z: [20, 24] as [number, number], r: LIMB_R, bevel: 1, color: shirt };
  const palm = hand ? { a: [11, 15] as [number, number], c: [c[0] + 0.25, c[1] - 0.25] as [number, number], z: [15, 17.2] as [number, number], r: 0.9, bevel: 0.7, color: skin } : null;
  const pieces = longSleeves ? [lower, upper, palm] : [lower, palm];
  return (
    <g>
      {pieces.map((piece, i) => piece && <RoundBox key={`o${i}`} {...piece} outlineWidth={1.6} />)}
      {pieces.map((piece, i) => piece && <RoundBox key={`f${i}`} {...piece} outline={false} />)}
      {/* manga curta: a barra fica visível por cima do antebraço */}
      {!longSleeves && <RoundBox {...upper} />}
    </g>
  );
}

/* ---------------- Rosto ---------------- */

function Face({ cc, kind, late }: { cc: number; kind: string; late: boolean }) {
  const at = (c: number, z: number): [number, number] => iso(14.1, c, z);
  const e1 = at(cc + 1.8, 31);
  const e2 = at(cc + 6, 31);
  const blink = `eye ${late ? 'eye-late' : ''}`;
  const blush = (
    <g fill="#E89A9A" opacity={0.8}>
      <rect x={at(cc + 2, 28.5)[0]} y={at(cc + 2, 28.5)[1]} width={1.6} height={1} />
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

type ARange = (range: [number, number]) => [number, number];
const same: ARange = (range) => range;

interface AccessoryProps { kind: string; cc: number; style: string; A?: ARange }

const PHONE = '#E3A857';
const PHONE_DARK = '#3A3340';

/**
 * Arco do fone acompanhando a cúpula do cabelo, em pedaços ao longo de c.
 * `side` escolhe a metade de trás (escondida pela cabeça) ou a da frente.
 */
function headphoneArc(cc: number, style: string, A: ARange, side: 'far' | 'near'): ReactNode[] {
  const peak = hairDomeTop(style) + 0.5;
  const [c0, c1] = [cc - 2, cc + 10];
  const steps = 14;
  const out: ReactNode[] = [];
  for (let i = 0; i < steps; i += 1) {
    if ((i < steps / 2) !== (side === 'far')) continue;
    const c: [number, number] = [c0 + (c1 - c0) * i / steps - 0.35, c0 + (c1 - c0) * (i + 1) / steps + 0.35];
    const t = ((c[0] + c[1]) / 2 - (c0 + c1) / 2) / ((c1 - c0) / 2);
    const h = 33.6 + (peak - 33.6) * Math.sqrt(Math.max(0, 1 - t * t));
    out.push(<RoundBox key={`arc-${i}`} a={A([8.6, 10.4])} c={c} z={[h - 0.6, h + 0.8]} r={0.3} bevel={0.3} color={PHONE_DARK} outline={false} />);
  }
  return out;
}

/** Partes de acessório que ficam do lado de lá da cabeça: desenhadas antes dela. */
function AccessoryBehind({ kind, cc, style, A = same }: AccessoryProps) {
  if (kind !== 'headphones') return null;
  return (
    <g>
      <RoundBox a={A([8, 11.5])} c={[cc - 2.6, cc - 0.8]} z={[28.5, 34.5]} r={0.8} bevel={0.8} color={PHONE} outline={false} />
      {headphoneArc(cc, style, A, 'far')}
    </g>
  );
}

function Accessory({ kind, cc, style, A = same }: AccessoryProps) {
  const topZ = hairTop(style);
  const front = A === same;
  switch (kind) {
    case 'glasses': {
      if (!front) return null;
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
          <FaceC a={[9, 12.7]} c={cc + 9.1} z={[30.2, 30.8]} fill="#2B2024" />
        </g>
      );
    }
    case 'cap':
      return (
        <g>
          {!front && <RoundBox r={1.4} bevel={0.4} a={A([14.6, 18.5])} c={[cc, cc + 8]} z={[topZ - 2, topZ - 1]} color="#A8456A" />}
          <RoundBox r={2.8} bevel={2.6} a={A([5, 14.8])} c={[cc - 1.8, cc + 9.8]} z={[topZ - 2, topZ + 2.5]} color="#C2577A" />
          {front && <RoundBox r={1.4} bevel={0.4} a={[14.6, 18.5]} c={[cc, cc + 8]} z={[topZ - 2, topZ - 1]} color="#A8456A" />}
          <RoundBox a={A([9, 11])} c={[cc + 3, cc + 5]} z={[topZ + 2.4, topZ + 3.1]} r={0.9} color="#A8456A" outline={false} />
        </g>
      );
    case 'bow':
      return (
        <g>
          <RoundBox a={A([7, 10])} c={[cc + 4, cc + 7]} z={[topZ - 0.5, topZ + 3]} r={1.2} bevel={1.2} color="#E7A9B4" />
          <RoundBox a={A([7, 10])} c={[cc + 8, cc + 11]} z={[topZ - 0.5, topZ + 3]} r={1.2} bevel={1.2} color="#E7A9B4" />
          <RoundBox a={A([7.3, 9.7])} c={[cc + 7, cc + 8]} z={[topZ, topZ + 2.4]} r={0.5} bevel={0.5} color="#C98190" />
        </g>
      );
    case 'headphones':
      return (
        <g>
          {headphoneArc(cc, style, A, 'near')}
          <RoundBox a={A([7.5, 12])} c={[cc + 9, cc + 11]} z={[28.5, 34.5]} r={0.9} bevel={0.9} color={PHONE} />
          {front && <FaceC a={[8.3, 11.2]} c={cc + 11.05} z={[29.5, 33.5]} fill={PHONE_DARK} />}
        </g>
      );
    default:
      return null;
  }
}

/* ---------------- Visto de costas ---------------- */

/**
 * Personagem do sofá da frente, visto de costas e virado para o sofá principal.
 * O encosto (desenhado depois) esconde as pernas; aparecem tronco, braços e nuca.
 */
export function CharacterFromBehind({ look, seat, backA }: { look: CharacterAppearance; seat: number; backA: number }) {
  const cc = seat;
  const a = (range: [number, number]) => flip(backA, range);
  const age = look.age ?? 'adult';
  const skin = str(getOption('skinTone', look.skinTone), 'color');
  const hair = str(getOption('hairColor', look.hairColor), 'color');
  const hairStyle = str(getOption('hairStyle', look.hairStyle), 'style', 'short');
  const outfit = str(getOption('outfit', look.outfit), 'style', 'tshirt');
  const color = str(getOption('outfitColor', look.outfitColor), 'color');
  const accessory = str(getOption('accessory', look.accessory), 'kind', 'none');
  const shirt = outfit === 'overalls' || outfit === 'jumpsuit' ? '#F4EDE4' : color;
  const longSleeves = outfit === 'hoodie' || outfit === 'sweater' || outfit === 'overalls' || outfit === 'jacket' || outfit === 'jumpsuit';
  const base = iso(backA - 13, cc + 4, 0);
  const transform = age === 'child' ? `translate(${base[0]} ${base[1]}) scale(${CHILD_SCALE}) translate(${-base[0]} ${-base[1]})` : undefined;
  return (
    <g className="character" transform={transform}>
      <Arm a={a([8.4, 12.8])} c={[cc - 2.7, cc - 0.3]} shirt={shirt} skin={skin} longSleeves={longSleeves} />
      <RoundBox a={a([7, 13])} c={[cc, cc + 8]} z={[11, 26]} r={TORSO_R} bevel={TORSO_BEVEL} color={shirt} />
      {(outfit === 'overalls' || outfit === 'jumpsuit') && (
        <>
          <FaceA a={backA - 6.95} c={[cc + 1.8, cc + 2.8]} z={[11, 24]} fill={color} />
          <FaceA a={backA - 6.95} c={[cc + 5.2, cc + 6.2]} z={[11, 24]} fill={color} />
        </>
      )}
      <Arm a={a([8, 12])} c={[cc + 7.8, cc + 10.2]} shirt={shirt} skin={skin} longSleeves={longSleeves} />
      <AccessoryBehind kind={accessory} cc={cc} style={hairStyle} A={a} />
      <RoundBox a={a([6, 14])} c={[cc - 1, cc + 9]} z={[26, 36]} r={HEAD_R} bevel={1.6} color={skin} top={skin} />
      {outfit === 'hoodie' && <RoundBox a={a([4.5, 7.5])} c={[cc, cc + 8]} z={[22, 30]} r={1.5} bevel={1.5} color={shade(color, 0.12)} />}
      <HairBackView style={hairStyle} color={hair} cc={cc} backA={backA} />
      <Accessory kind={accessory} cc={cc} style={hairStyle} A={a} />
    </g>
  );
}
