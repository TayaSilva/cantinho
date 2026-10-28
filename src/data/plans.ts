/**
 * Catálogo dos planos do Cantinho: preço, duração e limites de cada um.
 * É a fonte única para as telas de plano; o backend deve espelhar estes números.
 * Os limites por arquivo continuam em services/uploadRules.ts.
 */
export type PlanId = 'free' | 'mansao';

export interface PlanLimits {
  storageMb: number;
  photos: number;
  videos: number;
  audios: number;
  letters: number;
  chestTexts: number;
  characters: number;
  pets: number;
  radio: boolean;
  tv: boolean;
}

export interface PlanDefinition {
  id: PlanId;
  name: string;
  /** Preço em centavos (0 no grátis). */
  priceCents: number;
  /** Texto curto da duração ("30 dias", "6 meses"). */
  durationLabel: string;
  durationDays: number;
  limits: PlanLimits;
  customization: string;
  highlights: string[];
  missing: string[];
}

/** Dias de aviso antes do vencimento. */
export const EXPIRY_WARNINGS_DAYS = [7, 1] as const;
/** Período de segurança depois do vencimento, antes da exclusão. */
export const GRACE_PERIOD_DAYS = 7;

export const PLANS: Record<PlanId, PlanDefinition> = {
  free: {
    id: 'free',
    name: 'Cantinho Grátis',
    priceCents: 0,
    durationLabel: '30 dias',
    durationDays: 30,
    limits: { storageMb: 20, photos: 5, videos: 0, audios: 1, letters: 1, chestTexts: 1, characters: 2, pets: 0, radio: false, tv: false },
    customization: 'Personalização básica',
    highlights: ['5 fotos', '1 áudio', '1 carta', '2 personagens', 'Personalização básica'],
    missing: ['Sem vídeos', 'Sem pet'],
  },
  mansao: {
    id: 'mansao',
    name: 'Mini Mansão',
    priceCents: 1490,
    durationLabel: '6 meses',
    durationDays: 182,
    limits: { storageMb: 100, photos: 20, videos: 2, audios: 5, letters: 10, chestTexts: 10, characters: 4, pets: 1, radio: true, tv: true },
    customization: 'Personalização completa',
    highlights: ['20 fotos', '2 vídeos', '5 áudios', '10 cartas', 'Até 4 personagens e 1 pet', 'Personalização completa'],
    missing: [],
  },
};

/** Limites de seleção no rascunho: a publicação é que aplica o plano Free. */
export const DRAFT_CONTENT_LIMITS = {
  photos: PLANS.mansao.limits.photos,
  videos: PLANS.mansao.limits.videos,
  audios: PLANS.mansao.limits.audios,
  letters: PLANS.mansao.limits.letters,
  chestTexts: PLANS.mansao.limits.chestTexts,
} as const;

export const PAYMENT_METHODS = ['Pix', 'Cartão de crédito', 'Cartão de débito'] as const;

const priceFormat = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function formatPrice(cents: number): string {
  return cents === 0 ? 'R$ 0' : priceFormat.format(cents / 100);
}
