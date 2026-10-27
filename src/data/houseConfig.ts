/**
 * CONFIGURAÇÃO DA CENA — posições fixas, áreas clicáveis, períodos do dia
 * e aparência padrão.
 *
 * Os móveis ficam sempre nas mesmas posições (base 320 × 224). O que muda é
 * o modelo, a cor e a visibilidade, escolhidos no catálogo (catalog.ts).
 */
import type { DecorationKey, FurnitureKey, HouseAppearance, ModalId, Period, PeriodTheme, Rect } from '../types/house';

export const SCENE = { width: 320, height: 224 } as const;

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
];

/* ------------------------------------------------------------------
 * Elementos selecionáveis no editor visual
 * ------------------------------------------------------------------ */

export type EditorCategory = 'ambiente' | 'moveis' | 'personagem1' | 'personagem2' | 'personagem3' | 'personagem4' | 'animal' | 'decoracoes';

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
  character1: 'Personagem 1',
  character2: 'Personagem 2',
  character3: 'Personagem 3',
  character4: 'Personagem 4',
  pet: 'Animalzinho',
};

/** Ordem dos móveis no painel. */
export const furnitureOrder: FurnitureKey[] = ['sofa', 'sofa2', 'cushions', 'table', 'rug', 'bookshelf', 'tv', 'radio', 'frame', 'calendar', 'lamp', 'chest', 'plants'];

/** Objetos interativos: podem ser ocultados, mas o conteúdo continua salvo. */
export const interactiveFurniture: FurnitureKey[] = ['bookshelf', 'tv', 'radio', 'frame', 'calendar', 'lamp', 'chest'];

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
    wallColor: 'wall.creme',
    floor: 'floor.madeira-clara',
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
  },
  books: 'books.classicos',
  characters: [
    {
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
      name: 'Pessoa 3',
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
      name: 'Pessoa 4',
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

/** Lugar de cada personagem no sofá (eixo c da grade isométrica). */
export const CHARACTER_SEATS = [52, 68, 52, 68] as const;
// Sofá 2: mesmo modelo do principal, do outro lado da mesinha e virado para ele.
// Valor do eixo a onde termina o encosto (as pessoas 3 e 4 aparecem de costas).
export const OPPOSITE_SOFA_A = 110;

/** Posição do pet no tapete. */
export const PET_POSITION = { a: 60, c: 74 } as const;

/** Contorno da sala (limita escurecimento e brilho). */
export const ROOM_OUTLINE = '40,152 34,149 34,69 154,9 160,6 166,9 286,69 286,149 280,152 280,160 160,220 40,160';

/** Onde as notinhas aparecem quando o rádio toca. */
export const MUSIC_NOTES = { x: 252, y: 104 };
