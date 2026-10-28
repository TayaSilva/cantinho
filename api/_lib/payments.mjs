import { randomUUID } from 'node:crypto';
import { dbFetch } from './supabase.mjs';
import { PLAN_DEFAULTS } from './planLimits.mjs';
import { amountToCents, createCheckoutOrder, getOrder, isTrustedCheckoutUrl, mapOrderStatus, PaymentProviderError } from './mercadoPago.mjs';

/** Um link de checkout em aberto é reaproveitado por este tempo (cliques repetidos). */
const REUSE_OPEN_ORDER_MS = 30 * 60_000;
/** Linha "creating" mais antiga que isto é de uma tentativa que caiu no meio. */
const STALE_CREATING_MS = 60_000;
/** Intervalo mínimo entre consultas ao Mercado Pago para o mesmo pedido. */
const SYNC_INTERVAL_MS = 5_000;

const ORDER_FIELDS = 'id,house_id,user_id,kind,amount_cents,currency,provider_order_id,checkout_url,status,payment_method,paid_amount_cents,approved_at,applied_at,granted_expires_at,last_synced_at,created_at';

export class PaymentFlowError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

/** Log sem tokens, e-mails ou dados bancários: só identificadores e estados. */
export function paymentLog(event, fields = {}) {
  const allowed = ['orderId', 'houseId', 'providerOrderId', 'status', 'providerStatus', 'reason', 'source', 'httpStatus', 'duplicate', 'applied'];
  const safe = Object.fromEntries(Object.entries(fields).filter(([key, value]) => allowed.includes(key) && value !== undefined));
  console.info(JSON.stringify({ scope: 'payments', event, ...safe }));
}

async function rows(response) {
  const data = await response.json().catch(() => null);
  return Array.isArray(data) ? data : [];
}

/** O preço vem sempre do servidor (plan_definitions), nunca do navegador. */
export async function mansaoPriceCents() {
  const response = await dbFetch('plan_definitions?plan_type=eq.mansao&select=price_cents&limit=1');
  const [row] = await rows(response);
  const cents = Number(row?.price_cents);
  return response.ok && Number.isInteger(cents) && cents > 0 ? cents : PLAN_DEFAULTS.mansao.priceCents;
}

async function checkoutKind(houseId) {
  const response = await dbFetch(`house_plans?house_id=eq.${encodeURIComponent(houseId)}&select=plan_type&limit=1`);
  const [row] = await rows(response);
  return row?.plan_type === 'mansao' ? 'renewal' : 'upgrade';
}

async function openOrder(houseId) {
  const response = await dbFetch(`payment_orders?house_id=eq.${encodeURIComponent(houseId)}&status=in.(creating,pending)&select=${ORDER_FIELDS}&order=created_at.desc&limit=1`);
  if (!response.ok) throw new PaymentFlowError('Não foi possível consultar seus pedidos.', 500);
  return (await rows(response))[0] || null;
}

async function patchOrder(id, fields, statusFilter = '') {
  const response = await dbFetch(`payment_orders?id=eq.${encodeURIComponent(id)}${statusFilter}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ ...fields, updated_at: new Date().toISOString() }),
  });
  if (!response.ok) throw new PaymentFlowError('Não foi possível atualizar o pedido.', 500);
  return (await rows(response))[0] || null;
}

export async function recordEvent(order, source, action, status, metadata = {}) {
  await dbFetch('payment_events', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify([{ payment_order_id: order?.id ?? null, house_id: order?.house_id ?? null, provider_order_id: order?.provider_order_id ?? null, source, action, status, metadata }]),
  }).catch(() => undefined);
}

function reusable(order, priceCents, now = Date.now()) {
  return order.status === 'pending' && order.checkout_url && order.amount_cents === priceCents && now - new Date(order.created_at).getTime() < REUSE_OPEN_ORDER_MS;
}

/** Resposta pública do pedido: sem tokens, sem dados do pagador. */
export function orderView(order) {
  const status = order.status === 'creating' ? 'pending' : order.status === 'abandoned' ? 'canceled' : order.status;
  return {
    id: order.id,
    houseId: order.house_id,
    kind: order.kind,
    status,
    amountCents: order.amount_cents,
    currency: order.currency,
    paymentMethod: order.payment_method ?? null,
    createdAt: order.created_at,
    approvedAt: order.approved_at ?? null,
    expiresAt: order.applied_at ? order.granted_expires_at ?? null : null,
    checkoutUrl: status === 'pending' ? order.checkout_url ?? null : null,
  };
}

/**
 * Inicia contratação ou renovação. O tipo (upgrade/renovação) e o valor são
 * decididos aqui; qualquer preço enviado pelo navegador é ignorado.
 */
export async function startCheckout({ user, house }) {
  const priceCents = await mansaoPriceCents();
  const kind = await checkoutKind(house.id);

  const existing = await openOrder(house.id);
  if (existing) {
    if (reusable(existing, priceCents)) return { order: existing, reused: true };
    if (existing.status === 'creating' && Date.now() - new Date(existing.created_at).getTime() < STALE_CREATING_MS) {
      throw new PaymentFlowError('Já estamos preparando um pagamento para este cantinho. Tente de novo em instantes.', 409);
    }
    // Link antigo: o pedido sai de "aberto". Se ainda for pago, o webhook
    // continua consultando o Mercado Pago e libera normalmente.
    await patchOrder(existing.id, { status: 'abandoned' }, '&status=in.(creating,pending)');
    await recordEvent(existing, 'checkout', 'order_abandoned', 'abandoned');
  }

  const id = randomUUID();
  const inserted = await dbFetch('payment_orders', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify([{ id, house_id: house.id, user_id: user.id, kind, plan_type: 'mansao', amount_cents: priceCents, currency: 'BRL', status: 'creating' }]),
  });
  if (inserted.status === 409) {
    // Outro clique ganhou a corrida (índice de um pedido aberto por cantinho).
    const winner = await openOrder(house.id);
    if (winner && reusable(winner, priceCents)) return { order: winner, reused: true };
    throw new PaymentFlowError('Já estamos preparando um pagamento para este cantinho. Tente de novo em instantes.', 409);
  }
  const [order] = await rows(inserted);
  if (!inserted.ok || !order) throw new PaymentFlowError('Não foi possível registrar o pedido.', 500);

  let provider;
  try {
    provider = await createCheckoutOrder({ orderId: id, houseId: house.id, amountCents: priceCents, kind, payerEmail: user.email });
  } catch (error) {
    await patchOrder(id, { status: 'error' }, '&status=eq.creating').catch(() => undefined);
    await recordEvent(order, 'checkout', 'provider_create_failed', 'error', { http_status: error instanceof PaymentProviderError ? error.status : null });
    paymentLog('checkout_failed', { orderId: id, houseId: house.id, httpStatus: error?.status });
    throw error;
  }

  const providerAmount = amountToCents(provider?.total_amount);
  if (!provider?.id || !isTrustedCheckoutUrl(provider.checkout_url) || provider.external_reference !== id || (providerAmount !== null && providerAmount !== priceCents)) {
    await patchOrder(id, { status: 'error', provider_order_id: provider?.id ?? null }, '&status=eq.creating').catch(() => undefined);
    await recordEvent(order, 'checkout', 'provider_response_invalid', 'error');
    paymentLog('checkout_invalid_response', { orderId: id, houseId: house.id });
    throw new PaymentFlowError('O Mercado Pago não retornou um link de pagamento válido.', 502);
  }

  const saved = await patchOrder(id, { status: 'pending', provider_order_id: provider.id, checkout_url: provider.checkout_url, provider_status: provider.status ?? null }, '&status=eq.creating');
  await recordEvent(saved ?? order, 'checkout', 'order_created', 'pending', { kind });
  paymentLog('checkout_created', { orderId: id, houseId: house.id, providerOrderId: provider.id });
  return { order: saved ?? { ...order, status: 'pending', provider_order_id: provider.id, checkout_url: provider.checkout_url }, reused: false };
}

export async function findOrderById(id) {
  if (!/^[0-9a-f-]{36}$/i.test(id || '')) return null;
  const response = await dbFetch(`payment_orders?id=eq.${encodeURIComponent(id)}&select=${ORDER_FIELDS}&limit=1`);
  return (await rows(response))[0] || null;
}

export async function findOrderByProviderId(providerOrderId) {
  const response = await dbFetch(`payment_orders?provider_order_id=ilike.${encodeURIComponent(providerOrderId)}&select=${ORDER_FIELDS}&limit=1`);
  return (await rows(response))[0] || null;
}

/**
 * Consulta a order no Mercado Pago e grava o estado confirmado. Confere
 * referência, id, moeda e valor antes de deixar o banco aplicar benefícios.
 */
export async function syncOrder(order, { source, provider = null, liveMode = null } = {}) {
  if (!order.provider_order_id) return { order, result: null };
  const remote = provider ?? await getOrder(order.provider_order_id);
  if (remote?.external_reference !== order.id || String(remote?.id || '').toUpperCase() !== String(order.provider_order_id).toUpperCase()) {
    paymentLog('sync_reference_mismatch', { orderId: order.id, providerOrderId: order.provider_order_id, source });
    await recordEvent(order, source, 'reference_mismatch', 'ignored');
    return { order, result: null };
  }
  const mapped = mapOrderStatus(remote);
  const expected = amountToCents(remote.total_amount);
  if (mapped.status === 'approved' && (expected !== order.amount_cents || mapped.currency !== order.currency)) mapped.status = 'needs_review';

  const response = await dbFetch('rpc/sync_payment_order', {
    method: 'POST',
    body: JSON.stringify({
      p_order_id: order.id,
      p_status: mapped.status,
      p_provider_status: mapped.providerStatus,
      p_provider_status_detail: mapped.providerStatusDetail,
      p_payment_method: mapped.paymentMethod,
      p_paid_amount_cents: mapped.paidAmountCents,
      p_currency: mapped.currency,
      p_live_mode: liveMode,
      p_source: source,
      p_event_key: `state:${order.provider_order_id}:${mapped.providerStatus}:${mapped.providerStatusDetail}`,
    }),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) throw new PaymentFlowError('Não foi possível registrar o estado do pagamento.', 500);
  paymentLog('sync_done', { orderId: order.id, houseId: order.house_id, providerOrderId: order.provider_order_id, status: result?.status, providerStatus: mapped.providerStatus, duplicate: result?.duplicate, applied: result?.applied, source });
  return { order: (await findOrderById(order.id)) ?? order, result };
}

/** Pedido ainda aberto e sem consulta recente: vale perguntar ao Mercado Pago. */
export function shouldSync(order, now = Date.now()) {
  if (!order.provider_order_id) return false;
  if (!['pending', 'approved'].includes(order.status)) return false;
  if (order.status === 'approved' && order.applied_at) return false;
  return !order.last_synced_at || now - new Date(order.last_synced_at).getTime() > SYNC_INTERVAL_MS;
}

/** Histórico do cantinho: só pedidos que chegaram ao Mercado Pago. */
export async function listPayments(houseId) {
  const response = await dbFetch(`payment_orders?house_id=eq.${encodeURIComponent(houseId)}&status=not.in.(creating,error,abandoned)&select=${ORDER_FIELDS}&order=created_at.desc&limit=50`);
  if (!response.ok) return [];
  return (await rows(response)).map((row) => {
    const view = orderView(row);
    return { id: view.id, createdAt: view.createdAt, planId: 'mansao', kind: view.kind, amountCents: view.amountCents, method: view.paymentMethod, status: view.status, expiresAt: view.expiresAt };
  });
}
