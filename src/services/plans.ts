/**
 * Plano de cada cantinho e fluxo de contratação — por enquanto só o contrato
 * que as telas esperam. Não há backend de cobrança: nenhuma função aqui cobra,
 * muda plano ou exclui algo. Para integrar, troque o corpo de `fetchHousePlan`
 * e `startCheckout` pelas chamadas à API (ver comentários em cada uma).
 */
import { useEffect, useState } from 'react';
import { mockCheckoutResult, mockHousePlan, type MockPaymentOutcome, type MockPlanScenario } from '../data/mockPlans';
import { PLANS, type PlanId, type PlanLimits } from '../data/plans';
import { authFetch } from './auth';

export type PaymentMethod = 'pix' | 'credit' | 'debit';
export type PaymentStatus = 'pending' | 'approved' | 'declined';

/** Linha do histórico de pagamentos (nunca guarda dados de cartão ou banco). */
export interface PaymentRecord {
  id: string;
  createdAt: string;
  planId: PlanId;
  amountCents: number;
  method: PaymentMethod;
  status: PaymentStatus;
}

export interface HousePlan {
  houseId: string;
  planId: PlanId;
  limits: PlanLimits;
  status: 'active' | 'expired' | 'deletion_scheduled';
  startedAt?: string | null;
  /** ISO. null enquanto o backend não informar — a interface não inventa datas. */
  expiresAt: string | null;
  deletionAt: string | null;
  storageUsedBytes: number | null;
  payments: PaymentRecord[];
  /** Dados fictícios de desenvolvimento (mostra o aviso de demonstração). */
  demo?: boolean;
  legacyEntitlements?: LegacyEntitlements;
}

export interface LegacyEntitlements {
  isLegacy: boolean;
  cutoffAt: string | null;
  preservedStorageBytes: number;
  preservedPhotos: number;
  preservedVideos: number;
  preservedAudios: number;
  preservedLetters: number;
  preservedChestTexts: number;
  preservedCharacters: number;
  preservedPet: boolean;
  preservedRadio: boolean;
  preservedTv: boolean;
}

export type CheckoutResult =
  | { status: PaymentStatus }
  | { status: 'error'; message: string }
  /** Pagamentos ainda não integrados (produção, nesta etapa). */
  | { status: 'unavailable' };

/** Fase do ciclo de vida do plano, usada pelos avisos de vencimento. */
export type PlanStage = 'unknown' | 'active' | 'expiring' | 'last-day' | 'grace' | 'deletion';

const DAY = 86_400_000;
const PLAN_EVENT = 'casinha:plan-changed';
const DEV_SCENARIOS_KEY = 'casinha:dev-plan:v1';

export const plansDemoEnabled = import.meta.env.DEV;

export function planStage(plan: HousePlan, now = Date.now()): { stage: PlanStage; daysLeft: number | null } {
  if (plan.status === 'deletion_scheduled') return { stage: 'deletion', daysLeft: null };
  if (plan.status === 'expired') return { stage: 'grace', daysLeft: null };
  if (!plan.expiresAt) return { stage: 'unknown', daysLeft: null };
  const left = new Date(plan.expiresAt).getTime() - now;
  if (left <= 0) return { stage: 'grace', daysLeft: 0 };
  const daysLeft = Math.ceil(left / DAY);
  return { stage: daysLeft <= 1 ? 'last-day' : daysLeft <= 7 ? 'expiring' : 'active', daysLeft };
}

/* ---------- Cenários de desenvolvimento ---------- */

function readScenarios(): Record<string, MockPlanScenario> {
  try {
    return JSON.parse(localStorage.getItem(DEV_SCENARIOS_KEY) || '{}') as Record<string, MockPlanScenario>;
  } catch {
    return {};
  }
}

export function getDevScenario(houseId: string): MockPlanScenario | null {
  return plansDemoEnabled ? readScenarios()[houseId] ?? null : null;
}

export function setDevScenario(houseId: string, scenario: MockPlanScenario | null) {
  if (!plansDemoEnabled) return;
  const all = readScenarios();
  if (scenario) all[houseId] = scenario;
  else delete all[houseId];
  try {
    localStorage.setItem(DEV_SCENARIOS_KEY, JSON.stringify(all));
  } catch {
    // Sem armazenamento: o cenário vale só até recarregar.
  }
  window.dispatchEvent(new Event(PLAN_EVENT));
}

/* ---------- API (pontos de integração) ---------- */

/**
 * Plano atual do cantinho. Em cloud e no backend SQLite, a API devolve o plano,
 * as datas, o uso real e os limites efetivos (incluindo direitos adquiridos).
 * O fallback mantém a tela utilizável quando o backend ainda não responde.
 */
export async function fetchHousePlan(houseId: string): Promise<HousePlan> {
  const scenario = getDevScenario(houseId);
  if (scenario) return mockHousePlan(houseId, scenario);
  try {
    const response = await authFetch(`/api/houses/plan?house_id=${encodeURIComponent(houseId)}`, { cache: 'no-store' });
    const data = (await response.json().catch(() => ({}))) as Partial<HousePlan> & { error?: string };
    if (response.ok && data.planId && data.limits) return data as HousePlan;
  } catch {
    // Mantém a tela utilizável enquanto a API não responde.
  }
  return { houseId, planId: 'free', limits: PLANS.free.limits, status: 'active', startedAt: null, expiresAt: null, deletionAt: null, storageUsedBytes: null, payments: [] };
}

export function canUseFeature(plan: HousePlan, feature: 'character3' | 'character4' | 'pet' | 'radio' | 'tv'): boolean {
  if (feature === 'character3') return plan.limits.characters >= 3;
  if (feature === 'character4') return plan.limits.characters >= 4;
  if (feature === 'pet') return plan.limits.pets >= 1;
  if (feature === 'radio') return plan.limits.radio;
  return plan.limits.tv;
}

/**
 * Inicia a contratação ou renovação. Futuro: POST /api/houses/:id/checkout,
 * que devolve o link do provedor; a confirmação chega pelo webhook.
 * Em desenvolvimento, `simulate` escolhe o resultado fictício; nada é cobrado.
 */
export async function startCheckout(_houseId: string, _planId: PlanId, simulate?: MockPaymentOutcome): Promise<CheckoutResult> {
  if (plansDemoEnabled && simulate) {
    await new Promise((resolve) => window.setTimeout(resolve, 700));
    return mockCheckoutResult(simulate);
  }
  return { status: 'unavailable' };
}

/* ---------- Hooks ---------- */

export function useHousePlans(houseIds: string[]): Record<string, HousePlan> {
  const [plans, setPlans] = useState<Record<string, HousePlan>>({});
  const key = houseIds.join(',');
  useEffect(() => {
    let alive = true;
    const load = () => {
      void Promise.all(key ? key.split(',').map(fetchHousePlan) : []).then((list) => {
        if (alive) setPlans(Object.fromEntries(list.map((plan) => [plan.houseId, plan])));
      });
    };
    load();
    window.addEventListener(PLAN_EVENT, load);
    return () => {
      alive = false;
      window.removeEventListener(PLAN_EVENT, load);
    };
  }, [key]);
  return plans;
}

export function useHousePlan(houseId: string): HousePlan | null {
  return useHousePlans([houseId])[houseId] ?? null;
}
