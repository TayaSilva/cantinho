import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { Readable } from 'node:stream';

// Integração dos endpoints de pagamento com Supabase e Mercado Pago simulados
// por um fetch falso. As regras de banco (aplicação única, renovação,
// reembolso, RLS) são executadas de verdade em tests/db (npm run test:db).

const SUPABASE = 'https://supabase.test';
const ACCESS_TOKEN = 'TEST-access-token-nao-pode-vazar';
const SECRET = 'webhook-secret-nao-pode-vazar';
Object.assign(process.env, {
  SUPABASE_URL: SUPABASE,
  SUPABASE_ANON_KEY: 'anon',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-nao-pode-vazar',
  MERCADO_PAGO_ACCESS_TOKEN: ACCESS_TOKEN,
  MERCADO_PAGO_WEBHOOK_SECRET: SECRET,
  APP_ORIGIN: 'https://www.cantinho.dev.br',
});
delete process.env.MERCADO_PAGO_ENV;

const { default: handler } = await import('../api/payments/[action].mjs');
const mp = await import('../api/_lib/mercadoPago.mjs');

const OWNER = { id: 'aaaaaaaa-0000-0000-0000-000000000001', email: 'dona@example.com', email_confirmed_at: '2026-01-01T00:00:00Z' };
const OTHER = { id: 'bbbbbbbb-0000-0000-0000-000000000002', email: 'outra@example.com', email_confirmed_at: '2026-01-01T00:00:00Z' };
const HOUSE = 'cccccccc-0000-0000-0000-000000000001';
const OTHER_HOUSE = 'cccccccc-0000-0000-0000-000000000002';

let state;
function reset() {
  state = {
    houses: [{ id: HOUSE, owner_id: OWNER.id, name: 'Nosso cantinho', slug: 'nosso' }, { id: OTHER_HOUSE, owner_id: OTHER.id, name: 'Outro', slug: 'outro' }],
    orders: [],
    events: [],
    rpc: [],
    mpCreates: [],
    remote: null,
    seq: 0,
  };
}

const ok = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json' } });
const param = (url, key) => url.searchParams.get(key)?.replace(/^(eq|ilike)\./, '');

globalThis.fetch = async (input, init = {}) => {
  const url = new URL(String(input));
  const method = init.method || 'GET';
  const body = init.body ? JSON.parse(init.body) : null;
  const auth = new Headers(init.headers).get('authorization');

  if (url.href === `${SUPABASE}/auth/v1/user`) {
    if (auth === 'Bearer owner') return ok(OWNER);
    if (auth === 'Bearer other') return ok(OTHER);
    return ok({ message: 'invalid' }, 401);
  }
  if (url.hostname === 'api.mercadopago.com') {
    assert.equal(auth, `Bearer ${ACCESS_TOKEN}`);
    if (method === 'POST' && url.pathname === '/v1/orders') {
      state.mpCreates.push({ body, idempotency: new Headers(init.headers).get('x-idempotency-key') });
      const id = `ORDTST${++state.seq}`;
      return ok({ id, status: 'created', external_reference: body.external_reference, total_amount: body.total_amount, checkout_url: `https://www.mercadopago.com.br/checkout/v1/redirect?order_id=${id}` }, 201);
    }
    if (method === 'GET' && url.pathname.startsWith('/v1/orders/')) return state.remote ? ok(state.remote) : ok({ message: 'not found' }, 404);
  }
  if (!url.href.startsWith(`${SUPABASE}/rest/v1/`)) throw new Error(`fetch inesperado: ${url.href}`);
  const table = url.pathname.replace('/rest/v1/', '');

  if (table === 'houses') return ok(state.houses.filter((h) => h.id === param(url, 'id')));
  if (table === 'house_members') {
    const house = state.houses.find((h) => h.id === param(url, 'house_id'));
    return ok(house && house.owner_id === param(url, 'user_id') ? [{ role: 'owner', can_add_text: true }] : []);
  }
  if (table === 'plan_definitions') return ok([{ price_cents: 1490 }]);
  if (table === 'house_plans') return ok([{ plan_type: 'free' }]);
  if (table === 'payment_events') {
    state.events.push(...body);
    return ok(null, 201);
  }
  if (table === 'rpc/sync_payment_order') {
    state.rpc.push(body);
    const order = state.orders.find((o) => o.id === body.p_order_id);
    if (order && order.status !== 'approved') order.status = body.p_status;
    return ok({ status: order?.status, duplicate: false, applied: order?.status === 'approved' });
  }
  if (table === 'payment_orders') {
    if (method === 'POST') {
      const row = { ...body[0], created_at: new Date().toISOString(), checkout_url: null, provider_order_id: null };
      if (state.orders.some((o) => o.house_id === row.house_id && ['creating', 'pending'].includes(o.status))) return ok({ code: '23505' }, 409);
      state.orders.push(row);
      return ok([row], 201);
    }
    let rows = state.orders;
    if (url.searchParams.get('id')) rows = rows.filter((o) => o.id === param(url, 'id'));
    if (url.searchParams.get('house_id')) rows = rows.filter((o) => o.house_id === param(url, 'house_id'));
    if (url.searchParams.get('provider_order_id')) rows = rows.filter((o) => o.provider_order_id?.toUpperCase() === param(url, 'provider_order_id').toUpperCase());
    const status = url.searchParams.get('status');
    if (status?.startsWith('in.')) rows = rows.filter((o) => status.slice(4, -1).split(',').includes(o.status));
    if (status?.startsWith('eq.')) rows = rows.filter((o) => o.status === status.slice(3));
    if (method === 'PATCH') {
      rows.forEach((row) => Object.assign(row, body));
      return ok(rows);
    }
    return ok(rows);
  }
  throw new Error(`tabela inesperada: ${table}`);
};

const logs = [];
console.info = (line) => logs.push(String(line));

async function call(path, { method = 'GET', token, body, headers = {} } = {}) {
  const req = Readable.from(body === undefined ? [] : [Buffer.from(typeof body === 'string' ? body : JSON.stringify(body))]);
  Object.assign(req, { method, url: path, headers: { host: 'localhost', ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers } });
  const res = {
    statusCode: 200,
    headers: {},
    headersSent: false,
    body: '',
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; },
    writeHead(status) { this.statusCode = status; },
    end(chunk = '') { this.body = String(chunk); this.headersSent = true; },
  };
  await handler(req, res);
  return { status: res.statusCode, data: res.body ? JSON.parse(res.body) : null, raw: res.body };
}

function signedHeaders(dataId, requestId = 'req-1', ts = String(Date.now())) {
  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`;
  const v1 = createHmac('sha256', SECRET).update(manifest).digest('hex');
  return { 'x-signature': `ts=${ts},v1=${v1}`, 'x-request-id': requestId };
}

async function webhook(dataId, headers = signedHeaders(dataId)) {
  return call(`/api/payments/webhook?data.id=${dataId}&type=order`, { method: 'POST', headers, body: { type: 'order', action: 'order.processed', data: { id: dataId }, live_mode: false } });
}

async function createOrder() {
  const result = await call(`/api/payments/checkout?house_id=${HOUSE}`, { method: 'POST', token: 'owner' });
  assert.equal(result.status, 201);
  return state.orders.find((o) => o.id === result.data.order.id);
}

function remoteFor(order, overrides = {}) {
  return { id: order.provider_order_id, external_reference: order.id, total_amount: '14.90', currency: 'BRL', status: 'created', status_detail: 'created', transactions: { payments: [] }, ...overrides };
}

const approvedPix = { status: 'processed', status_detail: 'accredited', total_paid_amount: '14.90', transactions: { payments: [{ id: 'PAY1', status: 'processed', status_detail: 'accredited', amount: '14.90', paid_amount: '14.90', payment_method: { id: 'pix', type: 'bank_transfer' } }] } };

test.beforeEach(() => reset());

test('usuário não autenticado não inicia checkout', async () => {
  const result = await call(`/api/payments/checkout?house_id=${HOUSE}`, { method: 'POST' });
  assert.equal(result.status, 401);
  assert.equal(state.mpCreates.length, 0);
});

test('não é possível pagar o cantinho de outra pessoa', async () => {
  const result = await call(`/api/payments/checkout?house_id=${OTHER_HOUSE}`, { method: 'POST', token: 'owner' });
  assert.equal(result.status, 403);
  assert.equal(state.orders.length, 0);
  assert.equal(state.mpCreates.length, 0);
});

test('valor adulterado no corpo é ignorado: o servidor cobra R$ 14,90', async () => {
  const result = await call(`/api/payments/checkout?house_id=${HOUSE}`, { method: 'POST', token: 'owner', body: { amount: 0.01, price_cents: 1, total_amount: '0.01', plan: 'mansao', months: 120 } });
  assert.equal(result.status, 201);
  const [create] = state.mpCreates;
  assert.equal(create.body.total_amount, '14.90');
  assert.equal(create.body.items[0].unit_price, '14.90');
  assert.equal(create.body.type, 'online');
  assert.equal(create.body.processing_mode, 'manual');
  assert.equal(create.body.external_reference, result.data.order.id);
  assert.equal(create.idempotency, result.data.order.id);
  assert.match(create.body.config.online.success_url, /^https:\/\/www\.cantinho\.dev\.br\/admin\/cantinho\/.+\/plano\?pedido=/);
  assert.equal(state.orders[0].amount_cents, 1490);
  assert.equal(result.data.order.amountCents, 1490);
  assert.ok(mp.isTrustedCheckoutUrl(result.data.checkoutUrl));
  assert.equal(state.orders[0].status, 'pending');
});

test('dois cliques simultâneos geram uma única order no Mercado Pago', async () => {
  const results = await Promise.all([
    call(`/api/payments/checkout?house_id=${HOUSE}`, { method: 'POST', token: 'owner' }),
    call(`/api/payments/checkout?house_id=${HOUSE}`, { method: 'POST', token: 'owner' }),
  ]);
  assert.equal(state.mpCreates.length, 1);
  assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
  // Um terceiro clique, depois, reaproveita o mesmo link.
  const again = await call(`/api/payments/checkout?house_id=${HOUSE}`, { method: 'POST', token: 'owner' });
  assert.equal(again.status, 200);
  assert.equal(again.data.reused, true);
  assert.equal(state.mpCreates.length, 1);
});

test('retorno de "sucesso" sem pagamento aprovado continua pendente', async () => {
  const order = await createOrder();
  state.remote = remoteFor(order);
  const result = await call(`/api/payments/order?id=${order.id}&status=approved&collection_status=approved`, { token: 'owner' });
  assert.equal(result.status, 200);
  assert.equal(result.data.order.status, 'pending');
  assert.equal(state.rpc.at(-1).p_status, 'pending');
  assert.equal(result.data.order.expiresAt, null);
});

test('outra pessoa não consulta o pedido', async () => {
  const order = await createOrder();
  const result = await call(`/api/payments/order?id=${order.id}`, { token: 'other' });
  assert.equal(result.status, 404);
});

test('webhook falso ou com assinatura inválida é rejeitado', async () => {
  const order = await createOrder();
  state.remote = remoteFor(order, approvedPix);
  const forged = await webhook(order.provider_order_id, { 'x-signature': `ts=1,v1=${'0'.repeat(64)}`, 'x-request-id': 'req-1' });
  assert.equal(forged.status, 401);
  const missing = await webhook(order.provider_order_id, {});
  assert.equal(missing.status, 401);
  // Assinatura válida para outra order não serve para esta.
  const swapped = await webhook(order.provider_order_id, signedHeaders('ORDOUTRA'));
  assert.equal(swapped.status, 401);
  assert.equal(state.rpc.length, 0);
});

test('Pix pendente e depois aprovado pelo webhook', async () => {
  const order = await createOrder();
  state.remote = remoteFor(order, { status: 'action_required', status_detail: 'waiting_payment', transactions: { payments: [{ status: 'action_required', payment_method: { id: 'pix', type: 'bank_transfer' } }] } });
  assert.equal((await webhook(order.provider_order_id)).status, 200);
  assert.equal(state.rpc.at(-1).p_status, 'pending');
  assert.equal(state.rpc.at(-1).p_payment_method, 'pix');

  state.remote = remoteFor(order, approvedPix);
  assert.equal((await webhook(order.provider_order_id, signedHeaders(order.provider_order_id, 'req-2'))).status, 200);
  const last = state.rpc.at(-1);
  assert.equal(last.p_status, 'approved');
  assert.equal(last.p_paid_amount_cents, 1490);
  assert.equal(last.p_currency, 'BRL');
  assert.equal(last.p_source, 'webhook');
});

test('webhook duplicado chega ao banco com a mesma chave de evento', async () => {
  const order = await createOrder();
  state.remote = remoteFor(order, approvedPix);
  await webhook(order.provider_order_id);
  await webhook(order.provider_order_id);
  assert.equal(state.rpc.length, 2);
  assert.equal(state.rpc[0].p_event_key, state.rpc[1].p_event_key);
});

test('pagamento recusado não libera', async () => {
  const order = await createOrder();
  state.remote = remoteFor(order, { status: 'failed', status_detail: 'rejected', transactions: { payments: [{ status: 'failed', payment_method: { type: 'credit_card' } }] } });
  await webhook(order.provider_order_id);
  assert.equal(state.rpc.at(-1).p_status, 'declined');
  assert.equal(state.rpc.at(-1).p_payment_method, 'credit');
});

test('valor divergente no Mercado Pago vai para revisão, não para aprovado', async () => {
  const order = await createOrder();
  state.remote = remoteFor(order, { ...approvedPix, total_amount: '1.00', total_paid_amount: '1.00' });
  await webhook(order.provider_order_id);
  assert.equal(state.rpc.at(-1).p_status, 'needs_review');
});

test('order com referência de outro pedido é ignorada', async () => {
  const order = await createOrder();
  state.remote = remoteFor(order, { ...approvedPix, external_reference: '00000000-0000-0000-0000-000000000000' });
  const result = await webhook(order.provider_order_id);
  assert.equal(result.status, 200);
  assert.equal(state.rpc.length, 0);
});

test('webhook de order desconhecida responde 200 sem alterar nada', async () => {
  state.remote = { id: 'ORDDESCONHECIDA', external_reference: 'x', status: 'processed', status_detail: 'accredited' };
  const result = await webhook('ORDDESCONHECIDA');
  assert.equal(result.status, 200);
  assert.equal(state.rpc.length, 0);
});

test('reembolso e contestação são reconhecidos', () => {
  assert.equal(mp.mapOrderStatus({ status: 'refunded', status_detail: 'refunded' }).status, 'refunded');
  assert.equal(mp.mapOrderStatus({ status: 'processed', status_detail: 'charged_back' }).status, 'charged_back');
  assert.equal(mp.mapOrderStatus({ status: 'processed', status_detail: 'partially_refunded' }).status, 'needs_review');
  assert.equal(mp.mapOrderStatus({ status: 'processed', status_detail: 'in_mediation' }).status, 'needs_review');
  assert.equal(mp.mapOrderStatus({ status: 'canceled', status_detail: 'canceled' }).status, 'canceled');
  assert.equal(mp.mapOrderStatus({ status: 'expired', status_detail: 'expired' }).status, 'canceled');
  assert.equal(mp.mapOrderStatus({ status: 'processing', status_detail: 'in_process' }).status, 'pending');
  assert.equal(mp.mapOrderStatus({ status: 'processed', status_detail: 'algo_novo' }).status, 'pending');
});

test('assinatura segue o manifesto oficial com id em minúsculas', () => {
  const ts = '1742505638683';
  const v1 = createHmac('sha256', 'segredo').update(`id:ord01jq4s4ky8hwq6na5pxb65b3d3;request-id:abc;ts:${ts};`).digest('hex');
  assert.ok(mp.verifyWebhookSignature({ signature: `ts=${ts},v1=${v1}`, requestId: 'abc', dataId: 'ORD01JQ4S4KY8HWQ6NA5PXB65B3D3', secret: 'segredo' }));
  assert.ok(!mp.verifyWebhookSignature({ signature: `ts=${ts},v1=${v1}`, requestId: 'abc', dataId: 'ORD01JQ4S4KY8HWQ6NA5PXB65B3D3', secret: 'outro' }));
  assert.ok(!mp.verifyWebhookSignature({ signature: `ts=${ts},v1=${v1}`, requestId: 'xyz', dataId: 'ORD01JQ4S4KY8HWQ6NA5PXB65B3D3', secret: 'segredo' }));
  assert.ok(!mp.verifyWebhookSignature({ signature: undefined, requestId: 'abc', dataId: 'x', secret: 'segredo' }));
});

test('só redireciona para domínios do Mercado Pago', () => {
  assert.ok(mp.isTrustedCheckoutUrl('https://www.mercadopago.com.br/checkout/v1/redirect?order_id=1'));
  assert.ok(!mp.isTrustedCheckoutUrl('http://www.mercadopago.com.br/checkout'));
  assert.ok(!mp.isTrustedCheckoutUrl('https://mercadopago.com.br.evil.com/checkout'));
  assert.ok(!mp.isTrustedCheckoutUrl('javascript:alert(1)'));
});

test('produção exige configuração explícita e não aceita credencial de teste', async () => {
  process.env.MERCADO_PAGO_ENV = 'production';
  try {
    const result = await call(`/api/payments/checkout?house_id=${HOUSE}`, { method: 'POST', token: 'owner' });
    assert.equal(result.status, 503);
    assert.equal(state.mpCreates.length, 0);
  } finally {
    delete process.env.MERCADO_PAGO_ENV;
  }
  assert.equal(mp.paymentsEnvironment(), 'test');
});

test('sem credenciais o checkout fica indisponível', async () => {
  const token = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  delete process.env.MERCADO_PAGO_ACCESS_TOKEN;
  try {
    const result = await call(`/api/payments/checkout?house_id=${HOUSE}`, { method: 'POST', token: 'owner' });
    assert.equal(result.status, 503);
  } finally {
    process.env.MERCADO_PAGO_ACCESS_TOKEN = token;
  }
});

test('nenhum segredo ou e-mail aparece em respostas e logs', async () => {
  const order = await createOrder();
  state.remote = remoteFor(order, approvedPix);
  const responses = [
    await call(`/api/payments/order?id=${order.id}`, { token: 'owner' }),
    await call(`/api/payments/history?house_id=${HOUSE}`, { token: 'owner' }),
    await webhook(order.provider_order_id),
  ];
  const visible = responses.map((r) => r.raw).join('\n') + logs.join('\n');
  for (const secret of [ACCESS_TOKEN, SECRET, 'service-role-nao-pode-vazar', OWNER.email]) assert.ok(!visible.includes(secret), `vazou: ${secret}`);
});

test('o navegador não referencia credenciais do Mercado Pago', async () => {
  const sources = await Promise.all(['src/services/plans.ts', 'src/components/plans/CheckoutSheet.tsx', 'src/services/auth.ts', '.env.example'].map((path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8')));
  for (const source of sources.slice(0, 3)) assert.doesNotMatch(source, /MERCADO_PAGO|ACCESS_TOKEN|WEBHOOK_SECRET/);
  assert.doesNotMatch(sources[3], /VITE_MERCADO/);
  const plan = await readFile(new URL('../src/components/plans/PlanPage.tsx', import.meta.url), 'utf8');
  // A URL de retorno só fornece o id do pedido; nada de collection_status/status.
  assert.doesNotMatch(plan, /collection_status|search\.get\('status'\)/);
});

test('migration de pagamentos é não destrutiva e trava o cliente', async () => {
  const sql = await readFile(new URL('../supabase/migrations/20261028_0004_pagamentos_mini_mansao.sql', import.meta.url), 'utf8');
  assert.doesNotMatch(sql, /drop table|truncate|delete from public\.houses|delete from public\.house_plans/i);
  assert.match(sql, /revoke all on public\.payment_orders, public\.payment_events from anon, authenticated/i);
  assert.match(sql, /grant execute on function public\.sync_payment_order\([^)]*\) to service_role/i);
  assert.match(sql, /payment_orders_one_open_per_house_idx/);
  assert.match(sql, /for update/i);
});
