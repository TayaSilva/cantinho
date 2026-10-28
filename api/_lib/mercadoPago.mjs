import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Cliente mínimo do Mercado Pago — Checkout Pro via Orders API.
 * O access token e o segredo do webhook ficam só aqui no servidor e nunca
 * aparecem em respostas ou logs.
 */

const API_URL = 'https://api.mercadopago.com';

/** 'test' (padrão) ou 'production'. Cobrança real só com 'production' explícito. */
export function paymentsEnvironment() {
  return process.env.MERCADO_PAGO_ENV === 'production' ? 'production' : 'test';
}

export function paymentsConfigured() {
  return Boolean(process.env.MERCADO_PAGO_ACCESS_TOKEN && process.env.APP_ORIGIN);
}

function accessToken() {
  const token = process.env.MERCADO_PAGO_ACCESS_TOKEN || '';
  if (!token) throw new PaymentProviderError('Pagamentos não configurados.', 503);
  // Credencial de teste não deve ir para produção, e produção exige a flag explícita.
  if (paymentsEnvironment() === 'production' && token.startsWith('TEST-')) throw new PaymentProviderError('Credencial de teste em ambiente de produção.', 503);
  return token;
}

export class PaymentProviderError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.status = status;
  }
}

export function centsToAmount(cents) {
  return (cents / 100).toFixed(2);
}

export function amountToCents(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number * 100) : null;
}

async function request(path, init = {}) {
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${accessToken()}`, 'content-type': 'application/json', ...init.headers },
      signal: AbortSignal.timeout(15_000),
    });
  } catch (error) {
    if (error instanceof PaymentProviderError) throw error;
    throw new PaymentProviderError('Não conseguimos falar com o Mercado Pago.', 502);
  }
  const data = await response.json().catch(() => null);
  if (!response.ok || !data) throw new PaymentProviderError(`Mercado Pago respondeu ${response.status}.`, response.status >= 500 ? 502 : 400);
  return data;
}

/**
 * Cria a order do Checkout Pro. `orderId` (nosso UUID) vai como
 * external_reference e como chave de idempotência: repetir a chamada para o
 * mesmo pedido não cria uma segunda cobrança.
 */
export function createCheckoutOrder({ orderId, houseId, amountCents, kind, payerEmail }) {
  const origin = String(process.env.APP_ORIGIN || '').replace(/\/$/, '');
  const back = `${origin}/admin/cantinho/${encodeURIComponent(houseId)}/plano?pedido=${encodeURIComponent(orderId)}`;
  const amount = centsToAmount(amountCents);
  const body = {
    type: 'online',
    processing_mode: 'manual',
    total_amount: amount,
    external_reference: orderId,
    description: kind === 'renewal' ? 'Renovação Mini Mansão (6 meses)' : 'Mini Mansão (6 meses)',
    items: [{ external_code: 'MINI-MANSAO-6M', title: 'Mini Mansão · Cantinho', quantity: 1, unit_price: amount }],
    config: {
      online: { success_url: back, pending_url: back, failure_url: back, auto_return: 'approved' },
      payment_method: { max_installments: 1 },
    },
  };
  if (payerEmail) body.payer = { email: payerEmail };
  return request('/v1/orders', { method: 'POST', headers: { 'X-Idempotency-Key': orderId }, body: JSON.stringify(body) });
}

export function getOrder(providerOrderId) {
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(providerOrderId)) throw new PaymentProviderError('Order inválida.', 400);
  return request(`/v1/orders/${encodeURIComponent(providerOrderId)}`);
}

/** Só aceita redirecionar o comprador para domínios do Mercado Pago. */
export function isTrustedCheckoutUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && /(^|\.)(mercadopago|mercadolivre|mercadolibre)\.com(\.[a-z]{2})?$/.test(url.hostname);
  } catch {
    return false;
  }
}

/**
 * Valida o header x-signature conforme a documentação de Webhooks:
 * HMAC-SHA256 (hex) do manifesto "id:<data.id>;request-id:<x-request-id>;ts:<ts>;"
 * com a assinatura secreta da aplicação. IDs alfanuméricos vão em minúsculas e
 * partes ausentes saem do manifesto.
 */
export function verifyWebhookSignature({ signature, requestId, dataId, secret }) {
  if (!secret || typeof signature !== 'string') return false;
  const parts = Object.fromEntries(signature.split(',').map((part) => part.split('=').map((item) => item.trim())).filter((pair) => pair.length === 2));
  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1 || !/^[0-9a-f]{64}$/i.test(v1)) return false;
  let manifest = '';
  if (dataId) manifest += `id:${String(dataId).toLowerCase()};`;
  if (requestId) manifest += `request-id:${requestId};`;
  manifest += `ts:${ts};`;
  const expected = createHmac('sha256', secret).update(manifest).digest();
  const received = Buffer.from(v1, 'hex');
  return received.length === expected.length && timingSafeEqual(received, expected);
}

function paymentMethodOf(payment) {
  const method = payment?.payment_method || {};
  if (method.id === 'pix' || method.type === 'bank_transfer') return 'pix';
  if (method.type === 'credit_card') return 'credit';
  if (method.type === 'debit_card' || method.type === 'prepaid_card') return 'debit';
  return method.type || method.id ? 'other' : null;
}

/**
 * Converte a order do Mercado Pago no estado interno. Na dúvida, fica
 * "pending" ou "needs_review" — nunca "approved".
 */
export function mapOrderStatus(order) {
  const status = String(order?.status || '').toLowerCase();
  const detail = String(order?.status_detail || '').toLowerCase();
  const payments = Array.isArray(order?.transactions?.payments) ? order.transactions.payments : [];
  const payment = payments.find((item) => String(item?.status).toLowerCase() === 'processed') || payments[0];
  const paidFromPayments = payments
    .filter((item) => String(item?.status).toLowerCase() === 'processed')
    .reduce((sum, item) => sum + (amountToCents(item.paid_amount ?? item.amount) || 0), 0);
  const paidAmountCents = amountToCents(order?.total_paid_amount) ?? paidFromPayments;

  let mapped = 'pending';
  if (detail.includes('charged_back') || detail.includes('chargeback')) mapped = 'charged_back';
  else if (detail.includes('mediation') || detail.includes('dispute') || detail === 'partially_refunded') mapped = 'needs_review';
  else if (status === 'refunded' || detail === 'refunded') mapped = 'refunded';
  else if (status === 'processed' && detail === 'accredited') mapped = 'approved';
  else if (['canceled', 'cancelled', 'expired'].includes(status)) mapped = 'canceled';
  else if (status === 'failed' || status === 'rejected' || detail.includes('rejected')) mapped = 'declined';

  return {
    status: mapped,
    providerStatus: status || null,
    providerStatusDetail: detail || null,
    paymentMethod: paymentMethodOf(payment),
    paidAmountCents,
    currency: typeof order?.currency === 'string' ? order.currency.toUpperCase() : null,
  };
}
