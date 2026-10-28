/**
 * Miniaturas de seleção: cada opção do catálogo é desenhada com os mesmos
 * componentes do cantinho, recortada em volta do objeto. Assim a miniatura é
 * sempre fiel ao que vai aparecer na cena.
 */
import type { ReactNode } from 'react';
import { CHARACTER_SEATS, periods } from '../../data/houseConfig';
import { getOption, str } from '../../data/catalog';
import type { CharacterAppearance, ElementType, HouseAppearance, PetAppearance } from '../../types/house';
import { Character } from '../house/Character';
import { DynamicWindow } from '../house/DynamicWindow';
import { Bookshelf, Calendar, Chest, Computer, Cushions, Desk, Lamp, PhotoFrame, Plant, Radio, Rug, SofaBack, SofaFront, Table, TV } from '../house/Furniture';
import { boundsOf, boxPoints } from '../house/iso';
import { Pet, petHitbox } from '../house/Pet';
import { Room } from '../house/Room';
import { hairTop } from '../house/Hair';

/** Recorte quadrado em volta de um retângulo da cena. */
function squareView(r: { x: number; y: number; w: number; h: number }, pad = 2): string {
  const size = Math.max(r.w, r.h) + pad * 2;
  return `${r.x + r.w / 2 - size / 2} ${r.y + r.h / 2 - size / 2} ${size} ${size}`;
}

function Crop({ viewBox, children }: { viewBox: string; children: ReactNode }) {
  return (
    <svg viewBox={viewBox} className="size-full" shapeRendering="crispEdges" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      {children}
    </svg>
  );
}

interface ThumbProps {
  type: ElementType;
  optionId: string;
  appearance: HouseAppearance;
  /** Personagem 0 ou 1 (para miniaturas de personagem). */
  slot?: 0 | 1 | 2 | 3;
}

export function OptionThumb({ type, optionId, appearance, slot = 0 }: ThumbProps) {
  const opt = getOption(type, optionId, type === 'petAppearance' ? appearance.pet.type : undefined);
  const withEnv = (patch: Partial<HouseAppearance['environment']>): HouseAppearance => ({ ...appearance, environment: { ...appearance.environment, ...patch } });

  switch (type) {
    case 'wallPattern':
      return (
        <Crop viewBox="0 0 120 80">
          <rect width="120" height="80" fill={str(getOption('wallColor', appearance.environment.wallColor), 'color')} />
          <Room appearance={withEnv({ layout: 'mansao', wallPattern: optionId })} variant="mansao" />
        </Crop>
      );
    case 'floor':
      return (
        <Crop viewBox="122 128 76 46">
          <Room appearance={withEnv({ floor: optionId })} />
        </Crop>
      );
    case 'windowModel':
    case 'curtainStyle':
      return (
        <Crop viewBox="56 24 76 102">
          <rect x="0" y="0" width="320" height="224" fill="#F5EFE8" />
          <DynamicWindow appearance={withEnv(type === 'windowModel' ? { windowModel: optionId } : { curtainStyle: optionId })} theme={periods.manha} />
        </Crop>
      );
    case 'sofa':
      return (
        <Crop viewBox="64 80 80 70">
          <SofaBack opt={opt} />
          <SofaFront opt={opt} />
        </Crop>
      );
    case 'cushions':
      return (
        <Crop viewBox="88 82 54 34">
          <SofaBack opt={getOption('sofa', appearance.furniture.sofa.model)} />
          <Cushions opt={opt} />
        </Crop>
      );
    case 'table':
      return (
        <Crop viewBox="104 112 58 48">
          <Table opt={opt} items={false} />
        </Crop>
      );
    case 'rug':
      return (
        <Crop viewBox="80 116 152 80">
          <Rug opt={opt} />
        </Crop>
      );
    case 'bookshelf':
      return (
        <Crop viewBox="150 18 52 102">
          <Bookshelf opt={opt} books={getOption('books', appearance.books)} />
        </Crop>
      );
    case 'books':
      return (
        <Crop viewBox="154 52 40 52">
          <Bookshelf opt={getOption('bookshelf', 'shelf.alta')} books={opt} />
        </Crop>
      );
    case 'radio':
      return (
        <Crop viewBox="230 88 42 66">
          <Radio opt={opt} />
        </Crop>
      );
    case 'tv':
      return (
        <Crop viewBox="184 64 62 78">
          <TV opt={opt} on={false} />
        </Crop>
      );
    case 'frame':
      return (
        <Crop viewBox="114 32 50 56">
          <PhotoFrame opt={opt} />
        </Crop>
      );
    case 'calendar':
      return (
        <Crop viewBox="36 74 30 44">
          <Calendar opt={opt} />
        </Crop>
      );
    case 'lamp':
      return (
        <Crop viewBox="46 78 42 78">
          <Lamp opt={opt} on />
        </Crop>
      );
    case 'chest':
      return (
        <Crop viewBox="136 156 44 52">
          <Chest opt={opt} open={false} />
        </Crop>
      );
    case 'plants':
      return (
        <Crop viewBox="248 104 34 58">
          <Plant opt={opt} origin={[108, 3]} size={9} />
        </Crop>
      );
    case 'desk':
      return (
        <Crop viewBox="216 112 90 90">
          <Desk opt={opt} />
        </Crop>
      );
    case 'computer':
      return (
        <Crop viewBox="256 106 50 50">
          <Computer opt={opt} />
        </Crop>
      );
    case 'hairStyle':
    case 'accessory':
    case 'expression':
    case 'outfit': {
      const look: CharacterAppearance = { ...appearance.characters[slot], [type]: optionId };
      const cc = CHARACTER_SEATS[0];
      const selectedHairStyle = type === 'hairStyle'
        ? str(getOption('hairStyle', optionId), 'style', 'short')
        : str(getOption('hairStyle', appearance.characters[slot].hairStyle), 'style', 'short');
      const hairHigh = Math.max(45, hairTop(selectedHairStyle) + 3);
      const area =
        type === 'outfit'
          ? boundsOf(boxPoints({ a: [7, 22], c: [cc - 2, cc + 10], z: [0, 27] }), 0)
          : type === 'expression'
            ? boundsOf(boxPoints({ a: [14, 14], c: [cc - 1, cc + 9], z: [26, 36] }), 0)
            : boundsOf(boxPoints({ a: [4, 15], c: [cc - 3, cc + 11], z: [26, hairHigh] }), 0);
      const seat = cc;
      const view = squareView(area, type === 'expression' ? 1 : 1.5);
      return (
        <Crop viewBox={view}>
          <Character look={look} seat={seat} />
        </Crop>
      );
    }
    case 'petType':
    case 'petAppearance':
    case 'petAccessory': {
      const pet: PetAppearance = { ...appearance.pet, animation: false };
      if (type === 'petType') pet.type = optionId;
      if (type === 'petAppearance') pet.appearanceByType = { ...pet.appearanceByType, [pet.type]: optionId };
      if (type === 'petAccessory') pet.accessory = optionId;
      return (
        <Crop viewBox={squareView(petHitbox(pet), 1)}>
          <Pet pet={pet} />
        </Crop>
      );
    }
    default:
      return null;
  }
}
