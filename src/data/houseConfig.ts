/**
 * CONFIGURAÇÃO DA CENA — posições fixas, áreas clicáveis, períodos do dia
 * e aparência padrão.
 *
 * Os móveis ficam sempre nas mesmas posições (base 320 × 224). O que muda é
 * o modelo, a cor e a visibilidade, escolhidos no catálogo (catalog.ts).
 */
import type { DecorationKey, FurnitureKey, HouseAppearance, ModalId, Period, PeriodTheme, Rect } from '../types/house';

export const SCENE = { width: 320, height: 224 } as const;
export const MANSION_SCENE = { width: 320, height: 256 } as const;
export type SceneVariant = 'free' | 'mansao';
export const sceneFor = (variant: SceneVariant) => variant === 'mansao' ? MANSION_SCENE : SCENE;

/** Camadas HTML sobre a cena. */
export const Z = {
  hotspots: 100,
  bubble: 120,
} as const;

/* ------------------------------------------------------------------
 * Objetos interativos para o visitante
 * ------------------------------------------------------------------ */

export type VisitorAction =
  | { kind: 'modal'; modal: ModalId }
  | { kind: 'toggle-lamp' }
  | { kind: 'open-chest' }
  | { kind: 'window' };

export interface VisitorHotspot {
  id: string;
  label: string;
  ariaLabel: string;
  hitbox: Rect;
  action: VisitorAction;
  /** Móvel que precisa estar visível para o objeto existir. */
  requires?: FurnitureKey;
  labelPosition?: 'top' | 'bottom' | 'inside';
}

export const visitorHotspots: VisitorHotspot[] = [
  { id: 'window', label: 'Janela', ariaLabel: 'Janela: ver o período do dia', hitbox: { x: 70, y: 40, w: 44, h: 69 }, action: { kind: 'window' } },
  { id: 'photos', label: 'Quadro de fotos', ariaLabel: 'Abrir galeria de fotos', hitbox: { x: 120, y: 40, w: 37, h: 42 }, action: { kind: 'modal', modal: 'photos' }, requires: 'frame' },
  { id: 'calendar', label: 'Calendário', ariaLabel: 'Abrir datas especiais', hitbox: { x: 42, y: 83, w: 17, h: 30 }, action: { kind: 'modal', modal: 'calendar' }, requires: 'calendar' },
  { id: 'lamp', label: 'Luminária', ariaLabel: 'Acender ou apagar a luminária', hitbox: { x: 56, y: 100, w: 25, h: 52 }, action: { kind: 'toggle-lamp' }, requires: 'lamp' },
  { id: 'bookshelf', label: 'Estante de cartas', ariaLabel: 'Abrir livro de cartas', hitbox: { x: 157, y: 38, w: 35, h: 77 }, action: { kind: 'modal', modal: 'book' }, requires: 'bookshelf', labelPosition: 'inside' },
  { id: 'tv', label: 'TV', ariaLabel: 'Abrir vídeos na TV', hitbox: { x: 193, y: 79, w: 44, h: 60 }, action: { kind: 'modal', modal: 'tv' }, requires: 'tv' },
  { id: 'radio', label: 'Rádio', ariaLabel: 'Abrir playlist no rádio', hitbox: { x: 238, y: 100, w: 29, h: 50 }, action: { kind: 'modal', modal: 'radio' }, requires: 'radio' },
  { id: 'chest', label: 'Baú de surpresas', ariaLabel: 'Abrir o baú de surpresas', hitbox: { x: 142, y: 170, w: 32, h: 34 }, action: { kind: 'open-chest' }, requires: 'chest', labelPosition: 'bottom' },
  { id: 'computer', label: 'Computador', ariaLabel: 'Abrir o quiz no computador', hitbox: { x: 222, y: 158, w: 38, h: 42 }, action: { kind: 'modal', modal: 'quiz' }, requires: 'computer', labelPosition: 'inside' },
];

/* ------------------------------------------------------------------
 * Elementos selecionáveis no editor visual
 * ------------------------------------------------------------------ */

export type EditorCategory = 'ambiente' | 'moveis' | 'personagem1' | 'personagem2' | 'personagem3' | 'personagem4' | 'animal' | 'decoracoes' | 'quiz';

export type EditorTarget =
  | 'walls'
  | 'floor'
  | 'window'
  | 'lighting'
  | FurnitureKey
  | 'character1'
  | 'character2'
  | 'character3'
  | 'character4'
  | 'pet';

export function categoryOf(target: EditorTarget): EditorCategory {
  if (target === 'walls' || target === 'floor' || target === 'window' || target === 'lighting') return 'ambiente';
  if (target === 'character1') return 'personagem1';
  if (target === 'character2') return 'personagem2';
  if (target === 'character3') return 'personagem3';
  if (target === 'character4') return 'personagem4';
  if (target === 'pet') return 'animal';
  return 'moveis';
}

export const targetLabels: Record<EditorTarget, string> = {
  walls: 'Paredes',
  floor: 'Piso',
  window: 'Janela',
  lighting: 'Iluminação',
  sofa: 'Sofá',
  sofa2: 'Sofá 2',
  table: 'Mesa',
  rug: 'Tapete',
  bookshelf: 'Estante',
  radio: 'Rádio',
  tv: 'Televisão',
  frame: 'Quadro',
  calendar: 'Calendário',
  lamp: 'Luminária',
  chest: 'Baú',
  plants: 'Plantas',
  cushions: 'Almofadas',
  desk: 'Mesa de computador',
  computer: 'Computador',
  character1: 'Personagem 1',
  character2: 'Personagem 2',
  character3: 'Personagem 3',
  character4: 'Personagem 4',
  pet: 'Animalzinho',
};

/** Ordem dos móveis no painel. */
export const furnitureOrder: FurnitureKey[] = ['sofa', 'sofa2', 'cushions', 'table', 'rug', 'bookshelf', 'desk', 'computer', 'tv', 'radio', 'frame', 'calendar', 'lamp', 'chest', 'plants'];

/** Objetos interativos: podem ser ocultados, mas o conteúdo continua salvo. */
export const interactiveFurniture: FurnitureKey[] = ['bookshelf', 'tv', 'radio', 'frame', 'calendar', 'lamp', 'chest', 'computer'];

/** Áreas clicáveis de cada móvel no editor (unidades da cena). */
export const editorHitboxes: Partial<Record<EditorTarget, Rect[]>> = {
  window: [{ x: 64, y: 30, w: 59, h: 92 }],
  frame: [{ x: 119, y: 37, w: 41, h: 47 }],
  calendar: [{ x: 40, y: 78, w: 21, h: 38 }],
  rug: [{ x: 84, y: 128, w: 138, h: 60 }],
  plants: [{ x: 150, y: 60, w: 20, h: 42 }, { x: 255, y: 118, w: 21, h: 40 }],
  bookshelf: [{ x: 156, y: 30, w: 40, h: 87 }],
  tv: [{ x: 189, y: 72, w: 52, h: 68 }],
  radio: [{ x: 235, y: 98, w: 31, h: 54 }],
  sofa: [{ x: 69, y: 87, w: 70, h: 58 }],
  sofa2: [{ x: 160, y: 133, w: 68, h: 59 }],
  cushions: [{ x: 92, y: 92, w: 14, h: 18 }, { x: 122, y: 84, w: 14, h: 18 }],
  lamp: [{ x: 52, y: 92, w: 30, h: 62 }],
  table: [{ x: 108, y: 120, w: 49, h: 37 }],
  chest: [{ x: 140, y: 160, w: 36, h: 45 }],
};

/* ------------------------------------------------------------------
 * Períodos do dia
 * ------------------------------------------------------------------ */

export const periods: Record<Period, PeriodTheme> = {
  manha: { label: 'Manhã', from: 6, to: 12, sky: '#BFE3F0', hill1: '#9DB98F', hill2: '#7FA37A', sun: true, moon: false, stars: false, cloud: true, dim: 0 },
  tarde: { label: 'Tarde', from: 12, to: 18, sky: '#F6C58F', hill1: '#C98A6A', hill2: '#A86E55', sun: true, moon: false, stars: false, cloud: false, dim: 0.04 },
  noite: { label: 'Noite', from: 18, to: 24, sky: '#2C3566', hill1: '#3E3F6B', hill2: '#2F2F55', sun: false, moon: true, stars: true, cloud: false, dim: 0.2 },
  madrugada: { label: 'Madrugada', from: 0, to: 6, sky: '#151A3A', hill1: '#24264A', hill2: '#1B1C3A', sun: false, moon: true, stars: true, cloud: false, dim: 0.32 },
};

/** Período usado quando a janela dinâmica está desligada. */
export const STATIC_PERIOD: Period = 'tarde';

/* ------------------------------------------------------------------
 * Aparência padrão (botão "Restaurar padrão")
 * ------------------------------------------------------------------ */

export const decorationLabels: Record<DecorationKey, string> = {
  stringLights: 'Varal de luzinhas',
  wallPattern: 'Bolinhas na parede',
  polaroid: 'Polaroid na parede',
  tableItems: 'Xícaras e vaso na mesa',
  backPlant: 'Planta no canto',
};

export const defaultAppearance: HouseAppearance = {
  version: 1,
  environment: {
    layout: 'free',
    wallColor: 'wall.creme',
    floor: 'floor.madeira-clara',
    wallPattern: 'pattern.none',
    windowModel: 'window.classica',
    curtainStyle: 'curtain.laterais',
    curtainColor: 'curtainColor.rosa',
    dynamicWindow: true,
    lighting: 'light.quente',
  },
  furniture: {
    sofa: { model: 'sofa.classico', visible: true },
    sofa2: { model: 'sofa.classico', visible: false },
    table: { model: 'table.madeira', visible: true },
    rug: { model: 'rug.classico', visible: true },
    bookshelf: { model: 'shelf.alta', visible: true },
    radio: { model: 'radio.retro', visible: true },
    tv: { model: 'tv.tubo', visible: true },
    frame: { model: 'frame.madeira', visible: true },
    calendar: { model: 'calendar.rosa', visible: true },
    lamp: { model: 'lamp.abajur', visible: true },
    chest: { model: 'chest.madeira', visible: true },
    plants: { model: 'plants.costela', visible: true },
    cushions: { model: 'cushions.creme-salvia', visible: true },
    desk: { model: 'desk.madeira', visible: true },
    computer: { model: 'computer.rosa', visible: true },
  },
  books: 'books.classicos',
  characters: [
    {
      enabled: true,
      name: 'Lia',
      age: 'adult',
      skinTone: 'skin.2',
      hairStyle: 'hair.longo',
      hairColor: 'hairColor.preto',
      outfit: 'outfit.camiseta',
      outfitColor: 'outfitColor.salvia',
      accessory: 'acc.nenhum',
      expression: 'face.sorriso',
    },
    {
      enabled: true,
      name: 'Théo',
      age: 'adult',
      skinTone: 'skin.3',
      hairStyle: 'hair.curto',
      hairColor: 'hairColor.castanho-escuro',
      outfit: 'outfit.camiseta',
      outfitColor: 'outfitColor.mostarda',
      accessory: 'acc.nenhum',
      expression: 'face.sorriso',
    },
    {
      enabled: false,
      name: '',
      age: 'adult',
      skinTone: 'skin.1',
      hairStyle: 'hair.chanel',
      hairColor: 'hairColor.branco',
      outfit: 'outfit.jaqueta',
      outfitColor: 'outfitColor.azul',
      accessory: 'acc.nenhum',
      expression: 'face.sorriso',
    },
    {
      enabled: false,
      name: '',
      age: 'adult',
      skinTone: 'skin.4',
      hairStyle: 'hair.rabo',
      hairColor: 'hairColor.castanho-claro',
      outfit: 'outfit.macacao',
      outfitColor: 'outfitColor.rosa',
      accessory: 'acc.nenhum',
      expression: 'face.sorriso',
    },
  ],
  pet: {
    enabled: true,
    name: 'Biscoito',
    type: 'pet.gato',
    appearanceByType: { 'pet.gato': 'cat.laranja' },
    accessory: 'petAcc.nenhum',
    animation: true,
  },
  decorations: {
    stringLights: true,
    wallPattern: true,
    polaroid: true,
    tableItems: true,
    backPlant: true,
  },
};

/** Lugar de cada personagem no sofá (eixo c da grade isométrica), por layout. */
const SEATS = { free: [52, 68, 52, 68], mansao: [72, 88, 36, 52] } as const;
export const seatsFor = (variant: SceneVariant): readonly number[] => SEATS[variant];
/** Lugares do Cantinho (usados nas miniaturas do editor). */
export const CHARACTER_SEATS = SEATS.free;
/*
 * Sofá 2 (só na Mini Mansão): mesmo modelo do principal, encostado na borda da
 * frente e formando um L com ele. É desenhado como o sofá 'de costas' (encosto em
 * a = OPPOSITE_SOFA_A, assento deslocado no eixo c por SOFA2_SHIFT) e depois
 * espelhado na tela (SOFA2_MIRROR), o que troca os eixos a e c. Quem senta nele
 * (pessoas 3 e 4) aparece de costas.
 */
export const OPPOSITE_SOFA_A = 146;
export const SOFA2_SHIFT = 'translate(16 -8)';
export const SOFA2_MIRROR = 'matrix(-1 0 0 1 320 0)';
/** Leva um retângulo desenhado antes do espelho para a posição na tela. */
export const mirrorRect = (r: Rect): Rect => ({ ...r, x: 320 - r.x - r.w });
export const mirrorX = (x: number) => 320 - x;

/** Posição do pet no tapete (o pet só aparece na Mini Mansão). */
export const PET_POSITION = { a: 66, c: 84 } as const;

/** Contorno da sala (limita escurecimento e brilho). */
export function roomOutline(variant: SceneVariant): string {
  const s = variant === 'mansao' ? 150 : 120;
  const l = 160 - s;
  const r = 160 + s;
  const y = 92 + s / 2;
  return `${l},${y} ${l - 6},${y - 3} ${l - 6},${y - 83} 154,9 160,6 166,9 ${r + 6},${y - 83} ${r + 6},${y - 3} ${r},${y} ${r},${y + 8} 160,${92 + s + 8} ${l},${y + 8}`;
}

/** Onde as notinhas aparecem quando o rádio toca. */
export const MUSIC_NOTES = { x: 252, y: 104 };

/* ------------------------------------------------------------------
 * Layout da Mini Mansão
 *
 * Os móveis do Cantinho são desenhados nas posições do Cantinho; na Mini
 * Mansão cada um é deslocado ao longo dos eixos (a, c) para ocupar a sala
 * maior. Mesa de computador e computador já são desenhados no
 * lugar da Mini Mansão.
 * ------------------------------------------------------------------ */

export type LayoutKey = 'window' | 'frame' | 'polaroid' | 'calendar' | 'rug' | 'table' | 'sofa' | 'lamp' | 'tv' | 'radio' | 'chest';

const MANSION_SHIFT: Record<LayoutKey, [number, number]> = {
  window: [0, -34],
  frame: [0, 54],
  polaroid: [0, 98],
  calendar: [0, 18],
  rug: [6, 22],
  table: [6, 22],
  sofa: [0, 20],
  lamp: [0, 34],
  tv: [4, 0],
  radio: [-2, 0],
  chest: [36, 4],
};

/** Deslocamento na tela (x, y) de um objeto no layout. */
export function layoutOffset(variant: SceneVariant, key: LayoutKey): { x: number; y: number } {
  if (variant !== 'mansao') return { x: 0, y: 0 };
  const [da, dc] = MANSION_SHIFT[key];
  return { x: da - dc, y: (da + dc) / 2 };
}

/** `transform` SVG que leva o objeto até o lugar dele no layout. */
export function layoutTransform(variant: SceneVariant, key: LayoutKey): string | undefined {
  const { x, y } = layoutOffset(variant, key);
  return x || y ? `translate(${x} ${y})` : undefined;
}

const shiftRect = (r: Rect, key: LayoutKey): Rect => {
  const { x, y } = layoutOffset('mansao', key);
  return { ...r, x: r.x + x, y: r.y + y };
};

/** Origem (a, c) da planta ao lado da TV e da planta grande do canto da frente. */
export const MANSION_PLANTS = { tv: [38, 3] as [number, number], front: [132, 132] as [number, number] };

const HOTSPOT_LAYOUT: Partial<Record<string, LayoutKey>> = { window: 'window', photos: 'frame', calendar: 'calendar', lamp: 'lamp', tv: 'tv', radio: 'radio', chest: 'chest' };

const MANSION_COMPUTER: Rect = { x: 258, y: 111, w: 45, h: 42 };

/** Objetos interativos do visitante no layout escolhido (o computador só existe na Mini Mansão). */
export function visitorHotspotsFor(variant: SceneVariant): VisitorHotspot[] {
  if (variant !== 'mansao') return visitorHotspots.filter((h) => h.id !== 'computer');
  return visitorHotspots.map((h) => {
    if (h.id === 'computer') return { ...h, hitbox: MANSION_COMPUTER };
    const key = HOTSPOT_LAYOUT[h.id];
    return key ? { ...h, hitbox: shiftRect(h.hitbox, key) } : h;
  });
}

const TARGET_LAYOUT: Partial<Record<EditorTarget, LayoutKey>> = {
  window: 'window',
  frame: 'frame',
  calendar: 'calendar',
  rug: 'rug',
  tv: 'tv',
  radio: 'radio',
  sofa: 'sofa',
  cushions: 'sofa',
  lamp: 'lamp',
  table: 'table',
  chest: 'chest',
};

const MANSION_HITBOXES: Partial<Record<EditorTarget, Rect[]>> = {
  plants: [{ x: 150, y: 60, w: 20, h: 42 }, { x: 185, y: 82, w: 20, h: 41 }, { x: 148, y: 187, w: 24, h: 49 }],
  sofa2: [{ x: 40, y: 143, w: 68, h: 59 }],
  desk: [{ x: 218, y: 121, w: 87, h: 72 }],
  computer: [MANSION_COMPUTER],
};

/** Áreas clicáveis de cada móvel no editor, no layout escolhido. */
export function editorHitboxesFor(variant: SceneVariant): Partial<Record<EditorTarget, Rect[]>> {
  if (variant !== 'mansao') return editorHitboxes;
  const out: Partial<Record<EditorTarget, Rect[]>> = {};
  for (const [target, rects] of Object.entries(editorHitboxes) as [EditorTarget, Rect[]][]) {
    const key = TARGET_LAYOUT[target];
    out[target] = key ? rects.map((r) => shiftRect(r, key)) : rects;
  }
  return { ...out, ...MANSION_HITBOXES };
}
