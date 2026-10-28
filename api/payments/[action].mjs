import { cors, fail, json, options, readJson } from '../_lib/http.mjs';
import { getHouseForUser, getUser, requireHouse, requestedHouseId } from '../_lib/supabase.mjs';
import { getOrder, paymentsConfigured, paymentsEnvironment, PaymentProviderError, verifyWebhookSignature } from '../_lib/mercadoPago.mjs';
import { findOrderById, findOrderByProviderId, listPayments, orderView, PaymentFlowError, paymentLog, recordEvent, shouldSync, startCheckout, syncOrder } from '../_lib/payments.mjs';

/**
 * Pagamentos da Mini Mansão (uma função só, para caber no limite da Vercel):
 *   POST /api/payments/checkout?house_id=  inicia contratação ou renovação (dono)
 *   GET  /api/payments/order?id=           estado real do pedido (dono)
 *   GET  /api/payments/history?house_id=   histórico do cantinho (dono)
 *   POST /api/payments/webhook             notificações do Mercado Pago (assinadas)
 * O plano atual continua em GET /api/houses/plan.
 */

const UUID = /^[0-9a-f-]{36}$/i;

function actionOf(req) {
  if (typeof req.query?.action === 'string') return req.query.action;
  const url = new URL(req.url || '/', 'http://localhost');
  return url.pathname.split('/').filter(Boolean).pop() || '';
}

function query(req) {
  return new URL(req.url || '/', 'http://localhost').searchParams;
}

async function requireConfirmedUser(req, res) {
  const user = await getUser(req);
  if (!user) {
    fail(res, 401, 'Login necessário.');
    return null;
  }
  if (!user.email_confirmed_at && !user.confirmed_at) {
    fail(res, 403, 'Confirme seu e-mail para contratar a Mini Mansão.');
    return null;
  }
  return user;
}

async function checkout(req, res) {
  if (req.method !== 'POST') return fail(res, 405, 'Método não permitido.');
  if (!paymentsConfigured()) return fail(res, 503, 'Pagamentos indisponíveis no momento.');
  const user = await requireConfirmedUser(req, res);
  if (!user) return;
  const houseId = requestedHouseId(req);
  if (!UUID.test(houseId)) return fail(res, 400, 'Cantinho inválido.');
  // Só o dono contrata. O corpo é lido apenas para descartar: preço, plano e
  // validade nunca vêm do navegador.
  await readJson(req, 10_000).catch(() => ({}));
  const context = await requireHouse(req, houseId, 'owner');
  if (!context) return fail(res, 403, 'Apenas o dono pode contratar a Mini Mansão para este cantinho.');
  const { order, reused } = await startCheckout(context);
  return json(res, reused ? 200 : 201, { order: orderView(order), checkoutUrl: order.checkout_url, reused, environment: paymentsEnvironment() });
}

async function orderStatus(req, res) {
  if (req.method !== 'GET') return fail(res, 405, 'Método não permitido.');
  const user = await requireConfirmedUser(req, res);
  if (!user) return;
  let order = await findOrderById(query(req).get('id'));
  if (!order) return fail(res, 404, 'Pedido não encontrado.');
  const owner = order.house_id ? await getHouseForUser(user.id, order.house_id) : null;
  const allowed = owner ? owner.membership.role === 'owner' : order.user_id === user.id;
  if (!allowed) return fail(res, 404, 'Pedido não encontrado.');

  // O retorno do Mercado Pago não libera nada sozinho: aqui o estado é
  // conferido direto na API do Mercado Pago antes de responder.
  let syncError = false;
  if (paymentsConfigured() && shouldSync(order)) {
    try {
      order = (await syncOrder(order, { source: 'sync' })).order;
    } catch (error) {
      syncError = true;
      paymentLog('sync_failed', { orderId: order.id, httpStatus: error?.status });
    }
  }
  return json(res, 200, { order: orderView(order), syncError });
}

async function history(req, res) {
  if (req.method !== 'GET') return fail(res, 405, 'Método não permitido.');
  const user = await requireConfirmedUser(req, res);
  if (!user) return;
  const houseId = requestedHouseId(req);
  if (!UUID.test(houseId)) return fail(res, 400, 'Cantinho inválido.');
  const context = await requireHouse(req, houseId, 'owner');
  if (!context) return fail(res, 403, 'Apenas o dono vê o histórico de pagamentos.');
  return json(res, 200, { payments: await listPayments(houseId) });
}

async function webhook(req, res) {
  if (req.method !== 'POST') return fail(res, 405, 'Método não permitido.');
  const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET || '';
  if (!secret || !paymentsConfigured()) {
    paymentLog('webhook_unconfigured');
    return fail(res, 503, 'Webhook não configurado.');
  }
  const params = query(req);
  const body = await readJson(req, 100_000).catch(() => ({}));
  const dataId = params.get('data.id') || params.get('id') || (typeof body?.data?.id === 'string' ? body.data.id : '');
  const type = params.get('type') || params.get('topic') || body?.type || '';

  const valid = verifyWebhookSignature({ signature: req.headers['x-signature'], requestId: req.headers['x-request-id'], dataId, secret });
  if (!valid) {
    paymentLog('webhook_invalid_signature', { reason: dataId ? 'signature' : 'missing_id' });
    return fail(res, 401, 'Assinatura inválida.');
  }
  if (type !== 'order') {
    paymentLog('webhook_ignored', { reason: `type:${String(type).slice(0, 20)}` });
    return json(res, 200, { received: true });
  }
  if (!/^[A-Za-z0-9]{1,64}$/.test(dataId)) return fail(res, 400, 'Notificação inválida.');

  // Nunca confiamos no corpo: o estado vem de GET /v1/orders/{id}.
  const remote = await getOrder(dataId);
  let order = await findOrderByProviderId(dataId);
  if (!order && typeof remote.external_reference === 'string') {
    // Webhook chegou antes de gravarmos o id do Mercado Pago no pedido.
    const candidate = await findOrderById(remote.external_reference);
    if (candidate && (!candidate.provider_order_id || candidate.provider_order_id.toUpperCase() === dataId.toUpperCase())) {
      order = candidate.provider_order_id ? candidate : { ...candidate, provider_order_id: remote.id };
    }
  }
  if (!order) {
    paymentLog('webhook_unknown_order', { providerOrderId: dataId });
    return json(res, 200, { received: true });
  }
  if (!order.provider_order_id || order.status === 'creating') {
    // Corrida com o checkout: devolve erro para o Mercado Pago tentar de novo.
    await recordEvent(order, 'webhook', 'arrived_before_checkout_saved', order.status);
    return fail(res, 409, 'Pedido ainda em criação.');
  }
  const liveMode = typeof body?.live_mode === 'boolean' ? body.live_mode : null;
  if (liveMode === true && paymentsEnvironment() !== 'production') {
    await recordEvent(order, 'webhook', 'live_event_in_test_environment', 'needs_review');
  }
  await syncOrder(order, { source: 'webhook', provider: remote, liveMode });
  return json(res, 200, { received: true });
}

const ACTIONS = { checkout, order: orderStatus, history, webhook };

export default async function handler(req, res) {
  cors(res);
  if (options(req, res)) return;
  const action = ACTIONS[actionOf(req)];
  if (!action) return fail(res, 404, 'Rota não encontrada.');
  try {
    return await action(req, res);
  } catch (error) {
    const status = error instanceof PaymentFlowError || error instanceof PaymentProviderError ? error.status : 500;
    paymentLog('request_failed', { reason: actionOf(req), httpStatus: status });
    const message = error instanceof PaymentFlowError ? error.message : error instanceof PaymentProviderError ? 'Não conseguimos falar com o Mercado Pago. Tente de novo em instantes.' : 'Erro interno.';
    if (!res.headersSent) return fail(res, status >= 400 && status < 600 ? status : 500, message);
  }
}
