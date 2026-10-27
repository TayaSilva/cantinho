/**
 * CATÁLOGO DE OPÇÕES VISUAIS (equivalente à tabela `asset_options`).
 *
 * Cada característica tem até 5 opções predefinidas, todas desenhadas para
 * combinar entre si (mesma escala, perspectiva e posição). O administrador só
 * escolhe entre elas — nada de enviar imagens de móveis ou personagens.
 *
 * Para desativar uma opção sem quebrar cantinhos que já a usam, troque
 * `isActive` para false: ela some do editor, mas continua desenhando onde já
 * está escolhida.
 */
import type { AssetOption, ElementType, OptionValue } from '../types/house';

let order = 0;
function o(elementType: ElementType, id: string, name: string, value: OptionValue, variantGroup?: string): AssetOption {
  order += 1;
  return { id, elementType, name, value, variantGroup, sortOrder: order, isActive: true };
}

export const catalog: AssetOption[] = [
  /* ---------------- Ambiente ---------------- */
  o('wallColor', 'wall.creme', 'Creme', { color: '#F5E6D3' }),
  o('wallColor', 'wall.rosa', 'Rosa suave', { color: '#E8C5CE' }),
  o('wallColor', 'wall.azul', 'Azul claro', { color: '#C9DCEB' }),
  o('wallColor', 'wall.salvia', 'Verde sálvia', { color: '#C9D8C3' }),
  o('wallColor', 'wall.lilas', 'Lilás', { color: '#DBD0EA' }),

  o('floor', 'floor.madeira-clara', 'Madeira clara', { pattern: 'planks', color: '#C49A76', line: '#AE8463', edge1: '#9A7255', edge2: '#86624A' }),
  o('floor', 'floor.madeira-escura', 'Madeira escura', { pattern: 'planks', color: '#8A5D46', line: '#764E3A', edge1: '#6B4535', edge2: '#5A3A2C' }),
  o('floor', 'floor.madeira-rosada', 'Madeira rosada', { pattern: 'planks', color: '#B9837A', line: '#A36F67', edge1: '#8F5F58', edge2: '#7C514B' }),
  o('floor', 'floor.bege', 'Piso bege', { pattern: 'tiles', color: '#E2D3BD', line: '#CDBBA2', edge1: '#B8A68E', edge2: '#A3927C' }),
  o('floor', 'floor.cinza', 'Piso acinzentado', { pattern: 'tiles', color: '#B9B6B3', line: '#A3A09D', edge1: '#8E8B88', edge2: '#7B7875' }),

  o('windowModel', 'window.classica', 'Clássica', { shape: 'classic' }),
  o('windowModel', 'window.alta', 'Alta', { shape: 'tall' }),
  o('windowModel', 'window.inteira', 'Vidro inteiro', { shape: 'single' }),
  o('windowModel', 'window.arco', 'Em arco', { shape: 'arched' }),
  o('windowModel', 'window.redonda', 'Redonda', { shape: 'round' }),

  o('curtainStyle', 'curtain.laterais', 'Laterais', { style: 'sides' }),
  o('curtainStyle', 'curtain.longas', 'Longas', { style: 'long' }),
  o('curtainStyle', 'curtain.bando', 'Bandô', { style: 'valance' }),
  o('curtainStyle', 'curtain.cafe', 'Café', { style: 'cafe' }),
  o('curtainStyle', 'curtain.nenhuma', 'Sem cortina', { style: 'none' }),

  o('curtainColor', 'curtainColor.rosa', 'Rosa', { color: '#C98190' }),
  o('curtainColor', 'curtainColor.salvia', 'Sálvia', { color: '#8FB08A' }),
  o('curtainColor', 'curtainColor.mostarda', 'Mostarda', { color: '#E3A857' }),
  o('curtainColor', 'curtainColor.azul', 'Azul', { color: '#8FA7C8' }),
  o('curtainColor', 'curtainColor.creme', 'Creme', { color: '#EFDDBF' }),

  o('lighting', 'light.quente', 'Luz quente', { tint: '#FFB86B', glow: '#FFD89A' }),
  o('lighting', 'light.neutra', 'Luz neutra', { tint: '#FFF1D6', glow: '#FFF6E6' }),
  o('lighting', 'light.fria', 'Luz fria', { tint: '#A9D4FF', glow: '#D6ECFF' }),
  o('lighting', 'light.rosa', 'Rosa suave', { tint: '#FF9FBF', glow: '#FFC7D8' }),
  o('lighting', 'light.lilas', 'Lilás suave', { tint: '#B79CFF', glow: '#DCCEFF' }),

  /* ---------------- Móveis ---------------- */
  o('sofa', 'sofa.classico', 'Clássico', { variant: 'classic', color: '#BA8293' }),
  o('sofa', 'sofa.moderno', 'Moderno', { variant: 'modern', color: '#8FA7C8' }),
  o('sofa', 'sofa.capitone', 'Capitonê', { variant: 'tufted', color: '#7E9C8E' }),
  o('sofa', 'sofa.retro', 'Retrô', { variant: 'lowback', color: '#E3A857' }),
  o('sofa', 'sofa.chesterfield', 'Chesterfield', { variant: 'chesterfield', color: '#9A6A55' }),

  o('table', 'table.madeira', 'Madeira', { variant: 'rect', color: '#A7755B' }),
  o('table', 'table.redonda', 'Redonda branca', { variant: 'round', color: '#F1ECE6' }),
  o('table', 'table.baixa', 'Baixa escura', { variant: 'low', color: '#6E4836' }),
  o('table', 'table.vidro', 'Vidro', { variant: 'glass', color: '#BFDDE8' }),
  o('table', 'table.caixote', 'Caixote', { variant: 'crate', color: '#C49A76' }),

  o('rug', 'rug.classico', 'Clássico', { variant: 'classic', color: '#C98190', accent: '#E7A9B4', detail: '#F8E6B5' }),
  o('rug', 'rug.redondo', 'Redondo', { variant: 'round', color: '#EAD9BF', accent: '#D6BE9C', detail: '#C98190' }),
  o('rug', 'rug.listrado', 'Listrado', { variant: 'stripes', color: '#9DB98F', accent: '#F4EDE4', detail: '#7FA37A' }),
  o('rug', 'rug.xadrez', 'Xadrez', { variant: 'checker', color: '#8FA7C8', accent: '#DCE6F2', detail: '#6F87A8' }),
  o('rug', 'rug.kilim', 'Kilim', { variant: 'kilim', color: '#E3A857', accent: '#B4533A', detail: '#F8E6B5' }),

  o('bookshelf', 'shelf.alta', 'Alta de madeira', { variant: 'tall', color: '#A7755B' }),
  o('bookshelf', 'shelf.branca', 'Alta branca', { variant: 'tall', color: '#EDE6DD' }),
  o('bookshelf', 'shelf.baixa', 'Baixa larga', { variant: 'low', color: '#A7755B' }),
  o('bookshelf', 'shelf.escada', 'Escada', { variant: 'ladder', color: '#8A5D46' }),
  o('bookshelf', 'shelf.nichos', 'Nichos', { variant: 'cubes', color: '#C9D8C3' }),

  o('books', 'books.classicos', 'Clássicos', { palette: ['#C98190', '#7E9C8E', '#E3A857', '#8C7BB0', '#F4D9C6', '#5C6E8A'], cover: '#8A5D46' }),
  o('books', 'books.pastel', 'Pastel', { palette: ['#F2B9C8', '#BFE3F0', '#F8E6B5', '#CFE5C6', '#DBD0EA', '#FFFFFF'], cover: '#D98FA6' }),
  o('books', 'books.terrosos', 'Terrosos', { palette: ['#A86E55', '#C98A6A', '#7A4B33', '#D9B26A', '#8A7A5A', '#E7BCAC'], cover: '#7A4B33' }),
  o('books', 'books.rosa', 'Tons de rosa', { palette: ['#C98190', '#E7A9B4', '#B26E7E', '#F2C9D2', '#9E5A6B', '#F8E6B5'], cover: '#B26E7E' }),
  o('books', 'books.azuis', 'Tons de azul', { palette: ['#5C6E8A', '#8FA7C8', '#BFD4EA', '#46536B', '#A9C2B5', '#F4EDE4'], cover: '#46536B' }),

  o('radio', 'radio.retro', 'Retrô mostarda', { variant: 'classic', color: '#E3A857' }),
  o('radio', 'radio.madeira', 'Madeira', { variant: 'classic', color: '#9A6A55' }),
  o('radio', 'radio.portatil', 'Portátil rosa', { variant: 'portable', color: '#E7A9B4' }),
  o('radio', 'radio.vitrola', 'Vitrola', { variant: 'record', color: '#7E9C8E' }),
  o('radio', 'radio.boombox', 'Boombox', { variant: 'boombox', color: '#8C8A92' }),

  o('tv', 'tv.tubo', 'Tubo clássica', { variant: 'crt', color: '#6B5560' }),
  o('tv', 'tv.madeira', 'Retrô de madeira', { variant: 'crt', color: '#9A6A55' }),
  o('tv', 'tv.pequena', 'Pequena rosa', { variant: 'small', color: '#E7A9B4' }),
  o('tv', 'tv.plana', 'Tela fina', { variant: 'flat', color: '#3A3340' }),
  o('tv', 'tv.portatil', 'Portátil', { variant: 'portable', color: '#F1ECE6' }),

  o('frame', 'frame.madeira', 'Madeira', { variant: 'single', color: '#8A5D46' }),
  o('frame', 'frame.dourada', 'Dourada', { variant: 'single', color: '#D9A93F' }),
  o('frame', 'frame.branca', 'Branca', { variant: 'single', color: '#F4F0EA' }),
  o('frame', 'frame.preta', 'Preta fina', { variant: 'thin', color: '#2B2024' }),
  o('frame', 'frame.galeria', 'Galeria', { variant: 'gallery', color: '#8A5D46' }),

  o('calendar', 'calendar.rosa', 'Folhinha rosa', { variant: 'grid', color: '#C98190' }),
  o('calendar', 'calendar.azul', 'Folhinha azul', { variant: 'grid', color: '#8FA7C8' }),
  o('calendar', 'calendar.relogio', 'Relógio', { variant: 'clock', color: '#E3A857' }),
  o('calendar', 'calendar.lousa', 'Lousinha', { variant: 'chalk', color: '#46536B' }),
  o('calendar', 'calendar.destacavel', 'Destacável', { variant: 'tear', color: '#7E9C8E' }),

  o('lamp', 'lamp.abajur', 'Abajur', { variant: 'table', color: '#FFE2A6' }),
  o('lamp', 'lamp.pe', 'De pé', { variant: 'floor', color: '#F4EDE4' }),
  o('lamp', 'lamp.lampiao', 'Lampião', { variant: 'lantern', color: '#46353F' }),
  o('lamp', 'lamp.cogumelo', 'Cogumelo', { variant: 'mushroom', color: '#E7A9B4' }),
  o('lamp', 'lamp.globo', 'Globo', { variant: 'globe', color: '#FFF1D6' }),

  o('chest', 'chest.madeira', 'Madeira', { variant: 'classic', color: '#A7755B', trim: '#E3B04B' }),
  o('chest', 'chest.rosa', 'Rosa pastel', { variant: 'classic', color: '#E7A9B4', trim: '#FFFFFF' }),
  o('chest', 'chest.azul', 'Azul', { variant: 'classic', color: '#8FA7C8', trim: '#F8E6B5' }),
  o('chest', 'chest.tesouro', 'Tesouro', { variant: 'treasure', color: '#7A4B33', trim: '#E3B04B' }),
  o('chest', 'chest.cesta', 'Cesta de vime', { variant: 'basket', color: '#D9B26A', trim: '#B98A45' }),

  o('plants', 'plants.costela', 'Costela-de-adão', { variant: 'leafy', leaf: '#7FA37A', pot: '#C47A5A' }),
  o('plants', 'plants.cacto', 'Cacto', { variant: 'cactus', leaf: '#6F9A6A', pot: '#E3A857' }),
  o('plants', 'plants.suculentas', 'Suculentas', { variant: 'succulent', leaf: '#9DC3A5', pot: '#F4EDE4' }),
  o('plants', 'plants.samambaia', 'Samambaia', { variant: 'fern', leaf: '#5E8660', pot: '#8FA7C8' }),
  o('plants', 'plants.flores', 'Flores', { variant: 'flowers', leaf: '#7FA37A', pot: '#C98190' }),

  o('cushions', 'cushions.creme-salvia', 'Creme e sálvia', { a: '#F8E6B5', b: '#A9C2B5' }),
  o('cushions', 'cushions.rosa-lilas', 'Rosa e lilás', { a: '#F2B9C8', b: '#C9B8E6' }),
  o('cushions', 'cushions.azul-mostarda', 'Azul e mostarda', { a: '#8FA7C8', b: '#E3A857' }),
  o('cushions', 'cushions.terra', 'Terra', { a: '#C98A6A', b: '#F4EDE4' }),
  o('cushions', 'cushions.coracao', 'Corações', { a: '#C98190', b: '#C98190', heart: true }),

  /* ---------------- Personagens ---------------- */
  o('skinTone', 'skin.1', 'Tom 1', { color: '#F6D7C3' }),
  o('skinTone', 'skin.2', 'Tom 2', { color: '#F2C9A6' }),
  o('skinTone', 'skin.3', 'Tom 3', { color: '#C68E68' }),
  o('skinTone', 'skin.4', 'Tom 4', { color: '#8D5A3B' }),
  o('skinTone', 'skin.5', 'Tom 5', { color: '#5B3A29' }),

  o('hairStyle', 'hair.curto', 'Curto liso', { style: 'short' }),
  o('hairStyle', 'hair.ondulado', 'Médio ondulado', { style: 'wavy' }),
  o('hairStyle', 'hair.cacheado', 'Cacheado', { style: 'curly' }),
  o('hairStyle', 'hair.crespo', 'Afro puff', { style: 'coily' }),
  o('hairStyle', 'hair.longo', 'Longo liso', { style: 'long' }),
  o('hairStyle', 'hair.chanel', 'Chanel', { style: 'bob' }),
  o('hairStyle', 'hair.rabo', 'Rabo de cavalo', { style: 'ponytail' }),

  o('hairColor', 'hairColor.preto', 'Preto', { color: '#2B2024' }),
  o('hairColor', 'hairColor.castanho-escuro', 'Castanho escuro', { color: '#4A2E22' }),
  o('hairColor', 'hairColor.castanho-claro', 'Castanho claro', { color: '#8A5A3B' }),
  o('hairColor', 'hairColor.loiro', 'Loiro', { color: '#D9B26A' }),
  o('hairColor', 'hairColor.ruivo', 'Ruivo', { color: '#B5562F' }),
  o('hairColor', 'hairColor.grisalho', 'Grisalho', { color: '#A3A1A8' }),
  o('hairColor', 'hairColor.branco', 'Branco', { color: '#F4EDE4' }),

  o('outfit', 'outfit.camiseta', 'Camiseta', { style: 'tshirt' }),
  o('outfit', 'outfit.moletom', 'Moletom', { style: 'hoodie' }),
  o('outfit', 'outfit.vestido', 'Vestido', { style: 'dress' }),
  o('outfit', 'outfit.jardineira', 'Jardineira', { style: 'overalls' }),
  o('outfit', 'outfit.sueter', 'Suéter listrado', { style: 'sweater' }),
  o('outfit', 'outfit.jaqueta', 'Jaqueta', { style: 'jacket' }),
  o('outfit', 'outfit.macacao', 'Macacão', { style: 'jumpsuit' }),

  o('outfitColor', 'outfitColor.salvia', 'Sálvia', { color: '#7E9C8E' }),
  o('outfitColor', 'outfitColor.mostarda', 'Mostarda', { color: '#E3A857' }),
  o('outfitColor', 'outfitColor.rosa', 'Rosa', { color: '#C98190' }),
  o('outfitColor', 'outfitColor.azul', 'Azul', { color: '#5C6E8A' }),
  o('outfitColor', 'outfitColor.lilas', 'Lilás', { color: '#9C8CC0' }),

  o('accessory', 'acc.nenhum', 'Nenhum', { kind: 'none' }),
  o('accessory', 'acc.oculos', 'Óculos', { kind: 'glasses' }),
  o('accessory', 'acc.bone', 'Boné', { kind: 'cap' }),
  o('accessory', 'acc.laco', 'Laço', { kind: 'bow' }),
  o('accessory', 'acc.fone', 'Fone de ouvido', { kind: 'headphones' }),

  o('expression', 'face.sorriso', 'Sorriso', { kind: 'smile' }),
  o('expression', 'face.feliz', 'Feliz', { kind: 'happy' }),
  o('expression', 'face.piscadinha', 'Piscadinha', { kind: 'wink' }),
  o('expression', 'face.surpresa', 'Surpresa', { kind: 'surprised' }),
  o('expression', 'face.apaixonado', 'Apaixonado', { kind: 'love' }),

  /* ---------------- Animais ---------------- */
  o('petType', 'pet.gato', 'Gato', { kind: 'cat' }),
  o('petType', 'pet.cachorro', 'Cachorro', { kind: 'dog' }),
  o('petType', 'pet.coelho', 'Coelho', { kind: 'rabbit' }),
  o('petType', 'pet.hamster', 'Hamster', { kind: 'hamster' }),
  o('petType', 'pet.passaro', 'Pássaro', { kind: 'bird' }),

  o('petAppearance', 'cat.laranja', 'Laranja', { fur: '#E9A86A', belly: '#FFF3E3' }, 'pet.gato'),
  o('petAppearance', 'cat.cinza', 'Cinza', { fur: '#9A98A0', belly: '#EFEDF2' }, 'pet.gato'),
  o('petAppearance', 'cat.preto', 'Preto', { fur: '#3A3340', belly: '#5C5466' }, 'pet.gato'),
  o('petAppearance', 'cat.branco', 'Branco', { fur: '#F4F0EA', belly: '#FFFFFF' }, 'pet.gato'),
  o('petAppearance', 'cat.siames', 'Siamês', { fur: '#E8D9C2', belly: '#6B4E3D' }, 'pet.gato'),

  o('petAppearance', 'dog.caramelo', 'Caramelo', { fur: '#D9A066', belly: '#F8E6C9' }, 'pet.cachorro'),
  o('petAppearance', 'dog.marrom', 'Marrom', { fur: '#8A5A3B', belly: '#D9B79A' }, 'pet.cachorro'),
  o('petAppearance', 'dog.preto', 'Preto', { fur: '#3A3340', belly: '#C9A27E' }, 'pet.cachorro'),
  o('petAppearance', 'dog.branco', 'Branco', { fur: '#F1ECE6', belly: '#FFFFFF' }, 'pet.cachorro'),
  o('petAppearance', 'dog.cinza', 'Cinza', { fur: '#A3A1A8', belly: '#E4E2E8' }, 'pet.cachorro'),

  o('petAppearance', 'rabbit.branco', 'Branco', { fur: '#F4F0EA', belly: '#F2B9C8' }, 'pet.coelho'),
  o('petAppearance', 'rabbit.cinza', 'Cinza', { fur: '#B4B1B8', belly: '#F2B9C8' }, 'pet.coelho'),
  o('petAppearance', 'rabbit.marrom', 'Marrom', { fur: '#A07558', belly: '#F2D6C4' }, 'pet.coelho'),
  o('petAppearance', 'rabbit.creme', 'Creme', { fur: '#EAD9BF', belly: '#FFFFFF' }, 'pet.coelho'),
  o('petAppearance', 'rabbit.preto', 'Preto', { fur: '#3A3340', belly: '#E7A9B4' }, 'pet.coelho'),

  o('petAppearance', 'hamster.dourado', 'Dourado', { fur: '#E3A857', belly: '#FFF3E3' }, 'pet.hamster'),
  o('petAppearance', 'hamster.branco', 'Branco', { fur: '#F4F0EA', belly: '#FFFFFF' }, 'pet.hamster'),
  o('petAppearance', 'hamster.cinza', 'Cinza', { fur: '#A3A1A8', belly: '#EFEDF2' }, 'pet.hamster'),
  o('petAppearance', 'hamster.caramelo', 'Caramelo', { fur: '#C98A5A', belly: '#F8E6C9' }, 'pet.hamster'),
  o('petAppearance', 'hamster.panda', 'Panda', { fur: '#3A3340', belly: '#F4F0EA' }, 'pet.hamster'),

  o('petAppearance', 'bird.azul', 'Azul', { fur: '#6FA8DC', belly: '#E8F2FA' }, 'pet.passaro'),
  o('petAppearance', 'bird.amarelo', 'Amarelo', { fur: '#F2C94C', belly: '#FFF6D8' }, 'pet.passaro'),
  o('petAppearance', 'bird.verde', 'Verde', { fur: '#7FBF7F', belly: '#F2E2A0' }, 'pet.passaro'),
  o('petAppearance', 'bird.rosa', 'Rosa', { fur: '#E7A9B4', belly: '#FFF3E3' }, 'pet.passaro'),
  o('petAppearance', 'bird.branco', 'Branco', { fur: '#F4F0EA', belly: '#FFE2A6' }, 'pet.passaro'),

  // Acessórios do pet: `fits` lista os tipos compatíveis (combinações validadas).
  o('petAccessory', 'petAcc.nenhum', 'Nenhum', { kind: 'none', fits: ['pet.gato', 'pet.cachorro', 'pet.coelho', 'pet.hamster', 'pet.passaro'] }),
  o('petAccessory', 'petAcc.coleira', 'Coleira', { kind: 'collar', fits: ['pet.gato', 'pet.cachorro', 'pet.coelho'] }),
  o('petAccessory', 'petAcc.laco', 'Laço', { kind: 'bow', fits: ['pet.gato', 'pet.cachorro', 'pet.coelho', 'pet.hamster', 'pet.passaro'] }),
  o('petAccessory', 'petAcc.bandana', 'Bandana', { kind: 'bandana', fits: ['pet.gato', 'pet.cachorro'] }),
  o('petAccessory', 'petAcc.chapeu', 'Chapéu de festa', { kind: 'hat', fits: ['pet.gato', 'pet.cachorro', 'pet.coelho', 'pet.hamster', 'pet.passaro'] }),
];

const byId = new Map(catalog.map((opt) => [opt.id, opt]));

/** Opções ativas de um tipo, na ordem de exibição. */
export function optionsFor(type: ElementType, variantGroup?: string): AssetOption[] {
  return catalog
    .filter((opt) => opt.elementType === type && opt.isActive && (variantGroup === undefined || opt.variantGroup === variantGroup))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * Busca uma opção pelo ID. Se o ID não existir (catálogo mudou), cai na
 * primeira opção do tipo — o cantinho nunca quebra.
 */
export function getOption(type: ElementType, id: string | undefined, variantGroup?: string): AssetOption {
  const found = id ? byId.get(id) : undefined;
  if (found && found.elementType === type && (variantGroup === undefined || found.variantGroup === variantGroup)) return found;
  const first = catalog.find((opt) => opt.elementType === type && (variantGroup === undefined || opt.variantGroup === variantGroup));
  if (!first) throw new Error(`Catálogo sem opções para ${type}`);
  return first;
}

/** Atalhos tipados para ler parâmetros de uma opção. */
export const str = (opt: AssetOption, key: string, fallback = ''): string => {
  const v = opt.value[key];
  return typeof v === 'string' ? v : fallback;
};
export const bool = (opt: AssetOption, key: string): boolean => opt.value[key] === true;
export const list = (opt: AssetOption, key: string): string[] => {
  const v = opt.value[key];
  return Array.isArray(v) ? v : [];
};

/** Um acessório de pet combina com o tipo escolhido? */
export function petAccessoryFits(accessoryId: string, petTypeId: string): boolean {
  const acc = byId.get(accessoryId);
  if (!acc) return false;
  return list(acc, 'fits').includes(petTypeId);
}
