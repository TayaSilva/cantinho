/**
 * Plano de cada cantinho e fluxo de contratação. A cobrança acontece no
 * Mercado Pago (Checkout Pro): aqui só pedimos ao servidor o link de pagamento
 * e consultamos o estado confirmado. Nada no navegador aprova pagamentos,
 * define preço ou muda a validade do plano.
 */
import { useEffect, useState } from 'react';
import { mockCheckoutResult, mockHousePlan, type MockPaymentOutcome, type MockPlanScenario } from '../data/mockPlans';
import { PLANS, type PlanId, type PlanLimits } from '../data/plans';
import { authFetch } from './auth';

export type PaymentMethod = 'pix' | 'credit' | 'debit' | 'other';
export type PaymentStatus = 'pending' | 'approved' | 'declined' | 'canceled' | 'refunded' | 'charged_back' | 'needs_review' | 'error';

/** Linha do histórico de pagamentos (nunca guarda dados de cartão ou banco). */
export interface PaymentRecord {
  id: string;
  createdAt: string;
  planId: PlanId;
  kind?: 'upgrade' | 'renewal';
  amountCents: number;
  /** null enquanto o Mercado Pago não informar o meio usado. */
  method: PaymentMethod | null;
  status: PaymentStatus;
  expiresAt?: string | null;
}

/** Pedido como a API devolve: o estado já conferido no Mercado Pago. */
export interface PaymentOrder {
  id: string;
  houseId: string | null;
  kind: 'upgrade' | 'renewal';
  status: PaymentStatus;
  amountCents: number;
  currency: string;
  paymentMethod: PaymentMethod | null;
  createdAt: string;
  approvedAt: string | null;
  expiresAt: string | null;
  checkoutUrl: string | null;
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
  /** Link do Mercado Pago pronto: o navegador segue para lá. */
  | { status: 'redirect'; checkoutUrl: string; orderId: string }
  | { status: Exclude<PaymentStatus, 'error'>; order?: PaymentOrder }
  | { status: 'error'; message: string }
  /** Pagamentos não configurados neste ambiente. */
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

/** Só redireciona para domínios do Mercado Pago. */
export function isTrustedCheckoutUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && /(^|\.)(mercadopago|mercadolivre|mercadolibre)\.com(\.[a-z]{2})?$/.test(url.hostname);
  } catch {
    return false;
  }
}

/** Avisa as telas para recarregar o plano (ex.: depois de um pagamento aprovado). */
export function notifyPlanChanged() {
  window.dispatchEvent(new Event(PLAN_EVENT));
}

/**
 * Inicia a contratação ou renovação: o servidor cria a order no Mercado Pago
 * (com o valor definido por ele) e devolve o link de pagamento. A confirmação
 * chega depois pelo webhook. Em desenvolvimento, `simulate` escolhe um
 * resultado fictício; nada é cobrado.
 */
export async function startCheckout(houseId: string, simulate?: MockPaymentOutcome): Promise<CheckoutResult> {
  if (plansDemoEnabled && simulate) {
    await new Promise((resolve) => window.setTimeout(resolve, 700));
    return mockCheckoutResult(simulate);
  }
  const response = await authFetch(`/api/payments/checkout?house_id=${encodeURIComponent(houseId)}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{}',
  });
  const data = (await response.json().catch(() => ({}))) as { error?: string; checkoutUrl?: string; order?: PaymentOrder };
  if (response.status === 503) return { status: 'unavailable' };
  if (!response.ok) return { status: 'error', message: data.error || 'Não foi possível iniciar o pagamento.' };
  if (!data.checkoutUrl || !data.order?.id || !isTrustedCheckoutUrl(data.checkoutUrl)) return { status: 'error', message: 'O link de pagamento recebido não é válido.' };
  return { status: 'redirect', checkoutUrl: data.checkoutUrl, orderId: data.order.id };
}

/**
 * Estado real do pedido. O servidor confere direto no Mercado Pago; os
 * parâmetros da URL de retorno nunca são usados para liberar nada.
 */
export async function fetchPaymentOrder(orderId: string): Promise<PaymentOrder> {
  const response = await authFetch(`/api/payments/order?id=${encodeURIComponent(orderId)}`, { cache: 'no-store' });
  const data = (await response.json().catch(() => ({}))) as { error?: string; order?: PaymentOrder };
  if (!response.ok || !data.order) throw new Error(data.error || 'Não foi possível consultar o pagamento.');
  return data.order;
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
