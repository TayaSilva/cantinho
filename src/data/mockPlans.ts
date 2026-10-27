/**
 * Cenários FICTÍCIOS de plano e pagamento, usados só em desenvolvimento
 * (import.meta.env.DEV) para revisar as telas. Nada aqui representa
 * cobrança, transação ou data real — a interface marca esses dados como demonstração.
 */
import type { CheckoutResult, HousePlan } from '../services/plans';

export type MockPlanScenario = 'free' | 'free-expiring' | 'mansao' | 'mansao-7d' | 'mansao-1d' | 'grace' | 'deletion';
export type MockPaymentOutcome = 'pending' | 'approved' | 'declined' | 'error';

export const MOCK_PLAN_SCENARIOS: { id: MockPlanScenario; label: string }[] = [
  { id: 'free', label: 'Grátis · ativo' },
  { id: 'free-expiring', label: 'Grátis · faltam 7 dias' },
  { id: 'mansao', label: 'Mini Mansão · ativo' },
  { id: 'mansao-7d', label: 'Mini Mansão · faltam 7 dias' },
  { id: 'mansao-1d', label: 'Mini Mansão · falta 1 dia' },
  { id: 'grace', label: 'Vencido · período de segurança' },
  { id: 'deletion', label: 'Exclusão programada' },
];

export const MOCK_PAYMENT_OUTCOMES: { id: MockPaymentOutcome; label: string }[] = [
  { id: 'pending', label: 'Pendente' },
  { id: 'approved', label: 'Aprovado' },
  { id: 'declined', label: 'Recusado' },
  { id: 'error', label: 'Erro de comunicação' },
];

const DAY = 86_400_000;
const MB = 1024 * 1024;

export function mockHousePlan(houseId: string, scenario: MockPlanScenario, now = Date.now()): HousePlan {
  const at = (days: number) => new Date(now + days * DAY).toISOString();
  const base = { houseId, demo: true, payments: [] };
  switch (scenario) {
    case 'free':
      return { ...base, planId: 'free', status: 'active', expiresAt: at(23), deletionAt: null, storageUsedBytes: 12.4 * MB };
    case 'free-expiring':
      return { ...base, planId: 'free', status: 'active', expiresAt: at(6.5), deletionAt: null, storageUsedBytes: 18.1 * MB };
    case 'mansao':
      return { ...base, planId: 'mansao', status: 'active', expiresAt: at(140), deletionAt: null, storageUsedBytes: 61 * MB };
    case 'mansao-7d':
      return { ...base, planId: 'mansao', status: 'active', expiresAt: at(6.5), deletionAt: null, storageUsedBytes: 74 * MB };
    case 'mansao-1d':
      return { ...base, planId: 'mansao', status: 'active', expiresAt: at(0.6), deletionAt: null, storageUsedBytes: 92 * MB };
    case 'grace':
      return { ...base, planId: 'mansao', status: 'expired', expiresAt: at(-2), deletionAt: at(5), storageUsedBytes: 88 * MB };
    case 'deletion':
      return { ...base, planId: 'mansao', status: 'deletion_scheduled', expiresAt: at(-6), deletionAt: at(1), storageUsedBytes: 88 * MB };
  }
}

export function mockCheckoutResult(outcome: MockPaymentOutcome): CheckoutResult {
  return outcome === 'error' ? { status: 'error', message: 'Não conseguimos falar com o serviço de pagamento.' } : { status: outcome };
}
