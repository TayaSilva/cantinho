/**
 * Tipos centrais do cantinho.
 * Coordenadas de cena usam a resolução base da arte (320 × 224) e são
 * convertidas para porcentagem na hora de desenhar.
 */

export type Period = 'manha' | 'tarde' | 'noite' | 'madrugada';

export type CharacterAge = 'adult' | 'child';

export type ModalId = 'radio' | 'tv' | 'photos' | 'book' | 'calendar' | 'chest';

/** Retângulo em unidades da cena (base 320 × 224). */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PeriodTheme {
  label: string;
  from: number;
  to: number;
  sky: string;
  hill1: string;
  hill2: string;
  sun: boolean;
  moon: boolean;
  stars: boolean;
  cloud: boolean;
  dim: number;
}

/* ================================================================
 * Catálogo de opções visuais (equivalente à tabela asset_options)
 * ================================================================ */

export type ElementType =
  | 'wallColor'
  | 'floor'
  | 'windowModel'
  | 'curtainStyle'
  | 'curtainColor'
  | 'lighting'
  | 'sofa'
  | 'table'
  | 'rug'
  | 'bookshelf'
  | 'books'
  | 'radio'
  | 'tv'
  | 'frame'
  | 'calendar'
  | 'lamp'
  | 'chest'
  | 'plants'
  | 'cushions'
  | 'skinTone'
  | 'hairStyle'
  | 'hairColor'
  | 'outfit'
  | 'outfitColor'
  | 'accessory'
  | 'expression'
  | 'petType'
  | 'petAppearance'
  | 'petAccessory';

export type OptionValue = Record<string, string | number | boolean | string[]>;

export interface AssetOption {
  /** Identificador estável (ex.: "wall.creme"). Nunca mude depois de publicado. */
  id: string;
  elementType: ElementType;
  /** Subgrupo opcional (ex.: aparência por tipo de animal). */
  variantGroup?: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  /** Parâmetros de desenho (cores, variante do modelo...). */
  value: OptionValue;
}

/* ================================================================
 * Aparência do cantinho (equivale a house_appearance, house_characters
 * e house_pet) — guardada como JSON versionado.
 * ================================================================ */

export type FurnitureKey =
  | 'sofa'
  | 'sofa2'
  | 'table'
  | 'rug'
  | 'bookshelf'
  | 'radio'
  | 'tv'
  | 'frame'
  | 'calendar'
  | 'lamp'
  | 'chest'
  | 'plants'
  | 'cushions';

export type DecorationKey = 'stringLights' | 'wallPattern' | 'polaroid' | 'tableItems' | 'backPlant';

export interface FurnitureSetting {
  model: string;
  visible: boolean;
}

export interface CharacterAppearance {
  /** Personagem 1 sempre aparece; 2, 3 e 4 podem ser ocultados (ausente = visível). */
  enabled?: boolean;
  name: string;
  age?: CharacterAge;
  skinTone: string;
  hairStyle: string;
  hairColor: string;
  outfit: string;
  outfitColor: string;
  accessory: string;
  expression: string;
}

export interface PetAppearance {
  enabled: boolean;
  name: string;
  type: string;
  /** Uma aparência escolhida por tipo — trocar de tipo e voltar restaura a escolha. */
  appearanceByType: Record<string, string>;
  accessory: string;
  animation: boolean;
}

export interface HouseAppearance {
  version: 1;
  environment: {
    wallColor: string;
    floor: string;
    windowModel: string;
    curtainStyle: string;
    curtainColor: string;
    dynamicWindow: boolean;
    lighting: string;
  };
  furniture: Record<FurnitureKey, FurnitureSetting>;
  /** Capa e cor dos livros (estante e livro de cartas). */
  books: string;
  characters: [CharacterAppearance, CharacterAppearance, CharacterAppearance, CharacterAppearance];
  pet: PetAppearance;
  decorations: Record<DecorationKey, boolean>;
}

/* ================================================================
 * Conteúdo
 * ================================================================ */

export interface Track {
  id: string;
  title: string;
  artist: string;
  /** URL ou referência de mídia enviada ("media:<id>"). */
  src: string;
  license: string;
}

export interface Video {
  id: string;
  title: string;
  src: string;
  poster?: string;
  description?: string;
}

export interface Photo {
  id: string;
  src: string;
  alt: string;
  caption?: string;
}

export interface Letter {
  id: string;
  title: string;
  date: string;
  body: string;
  author: string;
}

export interface SpecialDate {
  id: string;
  title: string;
  /** AAAA-MM-DD */
  date: string;
  description: string;
}

export interface ChestMessage {
  id: string;
  text: string;
}

export interface HouseContent {
  houseName: string;
  welcome: { title: string; description: string; button: string; note: string };
  hint: string;
  /** Frases dos balões: personagem 1, personagem 2 e pet. */
  phrases: { character1: string; character2: string; character3: string; character4: string; pet: string };
  playlist: { name: string; tracks: Track[]; keepPlayingOnClose: boolean };
  videos: Video[];
  photos: Photo[];
  letters: Letter[];
  togetherSince: { date: string; label: string };
  specialDates: SpecialDate[];
  chestMessages: ChestMessage[];
}

/** Um "pacote" completo da casa — usado tanto no rascunho quanto no publicado. */
export interface HouseDocument {
  schemaVersion: 1;
  appearance: HouseAppearance;
  content: HouseContent;
  updatedAt: string;
}

/** Estado em tempo de execução da cena (não é salvo). */
export interface SceneRuntime {
  lampOn: boolean;
  chestOpen: boolean;
  tvOn: boolean;
  musicPlaying: boolean;
  petHappy: boolean;
}
