import type { ReactNode } from 'react';
import { PET_POSITION } from '../../data/houseConfig';
import { getOption, petAccessoryFits, str } from '../../data/catalog';
import type { PetAppearance, Rect } from '../../types/house';
import { boundsOf, boxPoints, FaceA, FaceC, iso, IsoBox, pts, shade } from './iso';

type Kind = 'cat' | 'dog' | 'rabbit' | 'hamster' | 'bird';

interface HeadSpec {
  a: [number, number];
  c: [number, number];
  z: [number, number];
}

/** Cabeça de cada tipo (relativa à posição do pet) — usada para encaixar os acessórios. */
const HEAD: Record<Kind, HeadSpec> = {
  cat: { a: [11, 18], c: [0, 8], z: [2, 10] },
  dog: { a: [11, 18], c: [0, 8], z: [2, 10] },
  rabbit: { a: [10, 17], c: [1, 8], z: [3, 11] },
  hamster: { a: [5, 13], c: [2, 10], z: [0, 7.5] },
  bird: { a: [9, 13], c: [3.5, 7.5], z: [6, 11] },
};

export function petKind(pet: PetAppearance): Kind {
  return str(getOption('petType', pet.type), 'kind', 'cat') as Kind;
}

/** Área clicável do pet, em unidades da cena. */
export function petHitbox(pet: PetAppearance): Rect {
  const { a: A, c: C } = PET_POSITION;
  const h = HEAD[petKind(pet)];
  return boundsOf(
    [
      ...boxPoints({ a: [A - 2, A + 19], c: [C, C + 11], z: [0, 0] }),
      ...boxPoints({ a: [A + h.a[0], A + h.a[1]], c: [C + h.c[0], C + h.c[1]], z: [h.z[1] + 7, h.z[1] + 7] }),
    ],
    1.5,
  );
}

export function petAnchor(pet: PetAppearance): { x: number; y: number } {
  const r = petHitbox(pet);
  return { x: r.x + r.w / 2, y: r.y + 2 };
}

interface PetProps {
  pet: PetAppearance;
  happy?: boolean;
  sleeping?: boolean;
}

/**
 * Animalzinho deitado no tapete: gato, cachorro, coelho, hamster ou pássaro,
 * com aparência e acessório do catálogo. Pisca, respira, mexe a cauda,
 * dorme à noite e pula ao ser clicado. A animação pode ser desligada.
 */
export function Pet({ pet, happy, sleeping }: PetProps) {
  const kind = petKind(pet);
  const look = getOption('petAppearance', pet.appearanceByType[pet.type], pet.type);
  const fur = str(look, 'fur');
  const belly = str(look, 'belly');
  const furTop = shade(fur, -0.15);
  const furDark = shade(fur, 0.18);
  const accessoryId = petAccessoryFits(pet.accessory, pet.type) ? pet.accessory : 'petAcc.nenhum';
  const accessory = str(getOption('petAccessory', accessoryId), 'kind', 'none');
  const { a: A, c: C } = PET_POSITION;
  const head = HEAD[kind];

  const B = (a: [number, number], c: [number, number], z: [number, number], color: string, extra: Partial<{ top: string; side: string; outline: boolean; className: string }> = {}) => (
    <IsoBox a={[A + a[0], A + a[1]]} c={[C + c[0], C + c[1]]} z={z} color={color} {...extra} />
  );
  const eyesAt = (a: number, cs: number[], z: number) =>
    cs.map((c, i) => {
      const [x, y] = iso(A + a, C + c, z);
      return sleeping ? (
        <rect key={i} x={x - 0.2} y={y + 0.8} width={1.6} height={0.6} fill="#2B1E24" />
      ) : (
        <rect key={i} className="eye eye-slow" x={x} y={y} width={1.2} height={1.6} fill="#2B1E24" />
      );
    });

  let body: ReactNode;
  switch (kind) {
    case 'rabbit':
      body = (
        <g>
          <g className="pet-tail">{B([-1, 2], [5, 8], [2, 5], '#FFFFFF', { outline: false })}</g>
          <g className="pet-body">{B([1, 12], [2, 10], [0, 7], fur, { top: furTop, side: furDark })}</g>
          {B([10, 17], [1, 8], [3, 11], fur, { top: furTop, side: furDark })}
          <g className="pet-ears">
            {B([12, 13.5], [2, 3.5], [11, 19], fur, { side: furDark })}
            {B([12, 13.5], [5.5, 7], [11, 19], fur, { side: furDark })}
            <FaceA a={A + 13.55} c={[C + 5.9, C + 6.6]} z={[12, 18]} fill={belly} />
          </g>
          {eyesAt(17.1, [2.5, 5.5], 8)}
          <rect x={iso(A + 17.1, C + 4, 6)[0]} y={iso(A + 17.1, C + 4, 6)[1]} width={1} height={0.8} fill="#E7A9B4" />
          {B([13, 17], [2, 6], [0, 1.4], belly, { outline: false })}
        </g>
      );
      break;
    case 'hamster':
      body = (
        <g>
          <g className="pet-body">{B([3, 13], [2, 10], [0, 7.5], fur, { top: furTop, side: furDark })}</g>
          <FaceA a={A + 13.05} c={[C + 4, C + 8]} z={[0.5, 4.5]} fill={belly} />
          {B([8.5, 10.5], [2.5, 4], [7.5, 9.5], fur, { side: furDark })}
          {B([8.5, 10.5], [8, 9.5], [7.5, 9.5], fur, { side: furDark })}
          {eyesAt(13.1, [3.5, 7.3], 6)}
          <FaceA a={A + 13.1} c={[C + 2.4, C + 3.4]} z={[3.4, 4.2]} fill="#F2A7B5" />
          <FaceA a={A + 13.1} c={[C + 8.4, C + 9.4]} z={[3.4, 4.2]} fill="#F2A7B5" />
          <rect x={iso(A + 13.1, C + 5.5, 4.4)[0]} y={iso(A + 13.1, C + 5.5, 4.4)[1]} width={1} height={0.7} fill="#C98190" />
        </g>
      );
      break;
    case 'bird':
      body = (
        <g>
          <g className="pet-tail">{B([2, 6], [4.5, 6.5], [3, 5], furDark, { outline: false })}</g>
          <g className="pet-body">{B([5, 12], [3, 8], [0, 7], fur, { top: furTop, side: furDark })}</g>
          <FaceA a={A + 12.05} c={[C + 4, C + 7]} z={[1, 5]} fill={belly} />
          <g className="pet-wing">{B([6, 10.5], [7.8, 8.6], [2, 6], furDark, { outline: false })}</g>
          {B([9, 13], [3.5, 7.5], [6, 11], fur, { top: furTop, side: furDark })}
          {B([13, 15], [5, 6], [8, 9], '#F2994A', { outline: false })}
          {eyesAt(13.1, [4.3, 6.5], 10.2)}
          {B([9, 10], [4.5, 5.2], [-0.5, 0.2], '#F2994A', { outline: false })}
        </g>
      );
      break;
    default: {
      const isDog = kind === 'dog';
      const [nx, ny] = iso(A + (isDog ? 20.1 : 18.1), C + 4, isDog ? 5.6 : 5.4);
      body = (
        <g>
          <g className="pet-tail">
            {isDog ? (
              B([0, 2], [4, 6], [5, 12], fur, { top: furTop, side: furDark, outline: false })
            ) : (
              <>
                {B([0, 2], [0, 10], [0, 2], fur, { side: furDark, outline: false })}
                {B([-2, 1], [8, 11], [0, 2], belly, { outline: false })}
              </>
            )}
          </g>
          <g className="pet-body">
            {B([1, 13], [2, 10], [0, 6], fur, { top: furTop, side: furDark })}
            {B([4, 12], [4, 8], [6, 6.6], fur, { side: furDark, outline: false })}
          </g>
          {B([11, 18], [0, 8], [2, 10], fur, { top: furTop, side: furDark })}
          {isDog ? (
            <>
              {B([12, 15], [-0.5, 1.5], [5, 11], furDark)}
              {B([12, 15], [6.5, 8.5], [5, 11], furDark)}
              {B([18, 20], [2.5, 5.5], [3, 6.5], belly)}
            </>
          ) : (
            <g className="pet-ears">
              {B([12, 14], [0.5, 2.5], [10, 13], fur, { side: furDark })}
              {B([12, 14], [5.5, 7.5], [10, 13], fur, { side: furDark })}
              <FaceA a={A + 18.05} c={[C + 2, C + 6]} z={[4, 6]} fill={belly} />
            </g>
          )}
          {eyesAt(18.1, [1.5, 5.5], 7)}
          <rect x={nx} y={ny} width={1} height={0.8} fill={isDog ? '#2B1E24' : '#C98190'} />
          {B([14, 19], [2, 5], [0, 1.4], belly, { outline: false })}
        </g>
      );
    }
  }

  return (
    <g className={`pet ${pet.animation ? '' : 'pet-static'} ${happy && pet.animation ? 'pet-hop' : ''}`}>
      {body}
      <PetAccessory kind={accessory} head={head} A={A} C={C} petKind={kind} />
      {sleeping && (
        <g className="pet-zzz" fill="#F8E6B5">
          <path d={`M${iso(A + head.a[1], C + head.c[0], head.z[1] + 4)[0] + 2} ${iso(A + head.a[1], C + head.c[0], head.z[1] + 4)[1]}h3v1h-2v1h-1v1h3v1h-4v-1h1v-1h1v-1h-1z`} />
        </g>
      )}
    </g>
  );
}

function PetAccessory({ kind, head, A, C, petKind: k }: { kind: string; head: HeadSpec; A: number; C: number; petKind: Kind }) {
  const a = (v: number) => A + v;
  const c = (v: number) => C + v;
  const topZ = head.z[1];
  const midA = (head.a[0] + head.a[1]) / 2;
  const midC = (head.c[0] + head.c[1]) / 2;
  const neckA = head.a[0] - 0.5;
  switch (kind) {
    case 'collar':
      return (
        <g>
          <IsoBox a={[a(neckA), a(neckA + 1.5)]} c={[c(head.c[0] - 0.3), c(head.c[1] + 0.3)]} z={[head.z[0], head.z[0] + 2]} color="#C2577A" />
          <IsoBox a={[a(neckA + 0.5), a(neckA + 1.5)]} c={[c(head.c[1] - 0.5), c(head.c[1] + 0.8)]} z={[head.z[0] - 1.5, head.z[0]]} color="#E3B04B" outline={false} />
        </g>
      );
    case 'bandana': {
      const z0 = head.z[0];
      return (
        <g>
          <IsoBox a={[a(neckA), a(neckA + 2)]} c={[c(head.c[0] - 0.3), c(head.c[1] + 0.3)]} z={[z0, z0 + 2]} color="#5C8FD6" />
          <polygon points={pts([iso(a(neckA - 1), c(head.c[1] + 0.35), z0 + 1), iso(a(neckA + 3), c(head.c[1] + 0.35), z0 + 1), iso(a(neckA + 1), c(head.c[1] + 0.35), z0 - 3)])} fill="#5C8FD6" />
          <FaceC a={[a(neckA), a(neckA + 2)]} c={c(head.c[1] + 0.4)} z={[z0 + 0.6, z0 + 1.2]} fill="#FFFFFF" />
        </g>
      );
    }
    case 'bow': {
      const z = k === 'hamster' || k === 'bird' ? topZ : topZ - 1;
      return (
        <g>
          <IsoBox a={[a(midA - 1.5), a(midA + 1)]} c={[c(head.c[1] - 3.5), c(head.c[1] - 1.5)]} z={[z, z + 2.5]} color="#E7A9B4" />
          <IsoBox a={[a(midA - 1.5), a(midA + 1)]} c={[c(head.c[1] - 0.5), c(head.c[1] + 1.5)]} z={[z, z + 2.5]} color="#E7A9B4" />
          <IsoBox a={[a(midA - 1.2), a(midA + 0.7)]} c={[c(head.c[1] - 1.5), c(head.c[1] - 0.5)]} z={[z + 0.4, z + 2.1]} color="#C98190" outline={false} />
        </g>
      );
    }
    case 'hat':
      return (
        <g>
          <IsoBox a={[a(midA - 2), a(midA + 2)]} c={[c(midC - 2), c(midC + 2)]} z={[topZ, topZ + 2]} color="#8FA7C8" />
          <IsoBox a={[a(midA - 1.3), a(midA + 1.3)]} c={[c(midC - 1.3), c(midC + 1.3)]} z={[topZ + 2, topZ + 4]} color="#F8E6B5" />
          <IsoBox a={[a(midA - 0.6), a(midA + 0.6)]} c={[c(midC - 0.6), c(midC + 0.6)]} z={[topZ + 4, topZ + 5.5]} color="#8FA7C8" />
          <IsoBox a={[a(midA - 0.8), a(midA + 0.8)]} c={[c(midC - 0.8), c(midC + 0.8)]} z={[topZ + 5.5, topZ + 7]} color="#F2A7B5" outline={false} />
        </g>
      );
    default:
      return null;
  }
}
