-- SPEC Pagamentos: Mini Mansão via Mercado Pago Checkout Pro (Orders API).
-- Não destrutiva e idempotente: só cria tabelas, colunas, índices e funções.
-- Nenhum cantinho, plano, documento ou mídia existente é alterado aqui.
--
-- Regras de segurança:
-- * O navegador não recebe grants de escrita: pedidos e validade só mudam pelas
--   funções abaixo, executadas com a service key no servidor.
-- * O valor do pedido é gravado pelo servidor a partir de plan_definitions.
-- * A ativação acontece numa única transação, com o pedido, o cantinho e o
--   plano travados (FOR UPDATE), e só uma vez por pedido (applied_at).

begin;

create table if not exists public.payment_orders (
  id uuid primary key default gen_random_uuid(),
  -- "on delete set null": excluir um cantinho não apaga o histórico financeiro.
  house_id uuid references public.houses(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  kind text not null check (kind in ('upgrade', 'renewal')),
  plan_type text not null default 'mansao' references public.plan_definitions(plan_type),
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'BRL' check (currency = 'BRL'),
  provider text not null default 'mercado_pago' check (provider = 'mercado_pago'),
  provider_order_id text unique,
  checkout_url text,
  live_mode boolean not null default false,
  status text not null default 'creating' check (status in (
    'creating',      -- linha reservada, order ainda não criada no Mercado Pago
    'pending',       -- aguardando pagamento (inclui Pix gerado e não pago)
    'approved',      -- pagamento confirmado pelo Mercado Pago
    'declined',      -- recusado
    'canceled',      -- cancelado ou expirado sem pagamento
    'refunded',      -- reembolsado
    'charged_back',  -- contestação (chargeback) confirmada
    'needs_review',  -- divergência de valor, cantinho excluído, disputa aberta etc.
    'abandoned',     -- substituído por um pedido novo antes de ser pago
    'error'          -- falha ao criar a order no Mercado Pago
  )),
  provider_status text,
  provider_status_detail text,
  payment_method text check (payment_method is null or payment_method in ('pix', 'credit', 'debit', 'other')),
  paid_amount_cents integer,
  approved_at timestamptz,
  applied_at timestamptz,
  granted_expires_at timestamptz,
  previous_expires_at timestamptz,
  revoked_at timestamptz,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payment_orders_house_idx on public.payment_orders(house_id, created_at desc);
create index if not exists payment_orders_user_idx on public.payment_orders(user_id);

-- Dois cliques simultâneos: só um pedido em aberto por cantinho. O segundo
-- INSERT falha com 23505 e a API devolve o pedido que já existe.
create unique index if not exists payment_orders_one_open_per_house_idx
  on public.payment_orders(house_id)
  where status in ('creating', 'pending');

create table if not exists public.payment_events (
  id bigint generated always as identity primary key,
  payment_order_id uuid references public.payment_orders(id) on delete set null,
  house_id uuid references public.houses(id) on delete set null,
  provider_order_id text,
  -- Chave de deduplicação (ex.: webhook:<order>:<status>:<detalhe>).
  event_key text unique,
  source text not null check (source in ('checkout', 'webhook', 'sync', 'system')),
  action text not null,
  status text,
  -- Somente metadados seguros: nunca tokens, dados de cartão ou bancários.
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists payment_events_order_idx on public.payment_events(payment_order_id, created_at);

-- Vínculo do plano com o último pedido aplicado (histórico/diagnóstico).
alter table public.house_plans add column if not exists last_payment_order_id uuid references public.payment_orders(id) on delete set null;

alter table public.payment_orders enable row level security;
alter table public.payment_events enable row level security;

revoke all on public.payment_orders, public.payment_events from anon, authenticated;

-- Leitura opcional pelo dono (a API usa a service key; isto é defesa extra).
-- Não há políticas de INSERT/UPDATE/DELETE: o cliente não aprova pagamentos
-- nem altera validade.
drop policy if exists "owners read payment orders" on public.payment_orders;
create policy "owners read payment orders" on public.payment_orders
  for select to authenticated using (house_id is not null and public.is_house_owner(house_id));

/* ---------- Ativação (interna) ---------- */

create or replace function public.apply_mansao_payment(p_order_id uuid)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  o public.payment_orders%rowtype;
  h public.houses%rowtype;
  hp public.house_plans%rowtype;
  has_plan boolean;
  base_at timestamptz;
  new_expires timestamptz;
  mode text;
begin
  select * into o from public.payment_orders where id = p_order_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'payment_order_not_found';
  end if;
  if o.applied_at is not null then
    return jsonb_build_object('applied', false, 'reason', 'already_applied', 'expires_at', o.granted_expires_at);
  end if;
  if o.status <> 'approved' then
    return jsonb_build_object('applied', false, 'reason', 'not_approved');
  end if;

  if o.house_id is not null then
    select * into h from public.houses where id = o.house_id for update;
  end if;
  if o.house_id is null or h.id is null or h.status <> 'active' then
    -- Cantinho excluído/suspenso: não recria nada; o pedido vai para revisão
    -- (reembolso manual pelo painel do Mercado Pago).
    update public.payment_orders set status = 'needs_review', updated_at = now() where id = o.id;
    insert into public.payment_events(payment_order_id, house_id, provider_order_id, source, action, status, metadata)
    values (o.id, o.house_id, o.provider_order_id, 'system', 'house_unavailable', 'needs_review', jsonb_build_object('house_status', h.status));
    return jsonb_build_object('applied', false, 'reason', 'house_unavailable');
  end if;

  select * into hp from public.house_plans where house_id = o.house_id for update;
  has_plan := found;

  if has_plan and hp.plan_type = 'mansao' and hp.status = 'active' and hp.expires_at is not null and hp.expires_at > now() then
    -- Renovação antecipada: preserva o tempo restante.
    base_at := hp.expires_at;
    mode := 'early_renewal';
  else
    -- Upgrade do Free ou Mini Mansão vencida: nova validade a partir de agora.
    base_at := now();
    mode := case when has_plan and hp.plan_type = 'mansao' then 'expired_renewal' else 'upgrade' end;
  end if;
  new_expires := base_at + interval '6 months';

  if has_plan then
    update public.house_plans set
      plan_type = 'mansao',
      status = 'active',
      started_at = case when mode = 'early_renewal' then hp.started_at else now() end,
      expires_at = new_expires,
      deletion_at = null,               -- cancela exclusão programada
      last_payment_order_id = o.id,
      updated_at = now()
    where house_id = o.house_id;
  else
    insert into public.house_plans(house_id, plan_type, status, started_at, expires_at, last_payment_order_id)
    values (o.house_id, 'mansao', 'active', now(), new_expires, o.id);
  end if;

  update public.payment_orders set
    applied_at = now(),
    previous_expires_at = case when has_plan then hp.expires_at else null end,
    granted_expires_at = new_expires,
    updated_at = now()
  where id = o.id;

  insert into public.payment_events(payment_order_id, house_id, provider_order_id, source, action, status, metadata)
  values (o.id, o.house_id, o.provider_order_id, 'system', 'benefits_applied', 'approved',
    jsonb_build_object('mode', mode, 'previous_expires_at', case when has_plan then hp.expires_at else null end, 'expires_at', new_expires,
      'deletion_canceled', has_plan and hp.deletion_at is not null));

  insert into public.audit_events(house_id, actor_id, action, metadata)
  values (o.house_id, o.user_id, 'mansao_payment_applied', jsonb_build_object('payment_order_id', o.id, 'mode', mode, 'expires_at', new_expires));

  return jsonb_build_object('applied', true, 'mode', mode, 'expires_at', new_expires);
end $$;

/* ---------- Reembolso / contestação (interna) ---------- */

create or replace function public.revoke_mansao_payment(p_order_id uuid)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  o public.payment_orders%rowtype;
  hp public.house_plans%rowtype;
  new_expires timestamptz;
begin
  select * into o from public.payment_orders where id = p_order_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'payment_order_not_found';
  end if;
  if o.applied_at is null or o.revoked_at is not null then
    return jsonb_build_object('revoked', false, 'reason', case when o.revoked_at is not null then 'already_revoked' else 'not_applied' end);
  end if;

  update public.payment_orders set revoked_at = now(), updated_at = now() where id = o.id;

  if o.house_id is not null then
    select * into hp from public.house_plans where house_id = o.house_id for update;
    if found and hp.plan_type = 'mansao' and hp.expires_at is not null then
      -- Remove só o período comprado por este pedido. Nada é excluído: se a
      -- validade cair para o passado, o cantinho entra no fluxo normal de vencido.
      new_expires := hp.expires_at - interval '6 months';
      update public.house_plans set
        expires_at = greatest(new_expires, least(now(), hp.expires_at)),
        status = case when new_expires <= now() then 'expired' else hp.status end,
        updated_at = now()
      where house_id = o.house_id;
    end if;
  end if;

  insert into public.payment_events(payment_order_id, house_id, provider_order_id, source, action, status, metadata)
  values (o.id, o.house_id, o.provider_order_id, 'system', 'benefits_revoked', o.status, jsonb_build_object('expires_at', greatest(new_expires, now())));
  insert into public.audit_events(house_id, actor_id, action, metadata)
  values (o.house_id, null, 'mansao_payment_revoked', jsonb_build_object('payment_order_id', o.id, 'status', o.status));

  return jsonb_build_object('revoked', true);
end $$;

/* ---------- Sincronização com o estado confirmado no Mercado Pago ---------- */

-- Recebe o estado JÁ consultado na API do Mercado Pago (nunca o da URL de
-- retorno). Idempotente e resistente a eventos fora de ordem:
-- * a mesma chave de evento é processada uma vez só;
-- * estados finais (reembolso/contestação) não regridem;
-- * um pedido aprovado não volta para pendente/recusado.
create or replace function public.sync_payment_order(
  p_order_id uuid,
  p_status text,
  p_provider_status text,
  p_provider_status_detail text,
  p_payment_method text,
  p_paid_amount_cents integer,
  p_currency text,
  p_live_mode boolean,
  p_source text,
  p_event_key text default null
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  o public.payment_orders%rowtype;
  next_status text := p_status;
  inserted integer;
  applied jsonb := null;
  revoked jsonb := null;
begin
  select * into o from public.payment_orders where id = p_order_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'payment_order_not_found';
  end if;

  if p_event_key is not null then
    insert into public.payment_events(payment_order_id, house_id, provider_order_id, event_key, source, action, status, metadata)
    values (o.id, o.house_id, o.provider_order_id, p_event_key, p_source, 'status_received', p_status,
      jsonb_build_object('provider_status', p_provider_status, 'provider_status_detail', p_provider_status_detail, 'payment_method', p_payment_method))
    on conflict (event_key) do nothing;
    get diagnostics inserted = row_count;
    if inserted = 0 and not (o.status = 'approved' and o.applied_at is null) then
      return jsonb_build_object('duplicate', true, 'status', o.status, 'applied', o.applied_at is not null);
    end if;
  end if;

  if next_status not in ('pending', 'approved', 'declined', 'canceled', 'refunded', 'charged_back', 'needs_review') then
    raise exception using errcode = '22023', message = 'invalid_payment_status';
  end if;

  -- Conferência de valor e moeda também no banco.
  if next_status = 'approved' and (coalesce(p_paid_amount_cents, 0) < o.amount_cents or coalesce(p_currency, '') <> o.currency) then
    next_status := 'needs_review';
    insert into public.payment_events(payment_order_id, house_id, provider_order_id, source, action, status, metadata)
    values (o.id, o.house_id, o.provider_order_id, p_source, 'amount_mismatch', 'needs_review',
      jsonb_build_object('expected_cents', o.amount_cents, 'paid_cents', p_paid_amount_cents, 'currency', p_currency));
  end if;

  -- Ordem dos eventos: não regredir.
  if o.status in ('refunded', 'charged_back') then
    next_status := o.status;
  elsif o.status = 'approved' and next_status in ('pending', 'declined', 'canceled') then
    next_status := o.status;
  elsif o.status = 'needs_review' and o.applied_at is not null and next_status in ('pending', 'declined', 'canceled') then
    next_status := o.status;
  end if;

  update public.payment_orders set
    status = next_status,
    provider_status = coalesce(p_provider_status, provider_status),
    provider_status_detail = coalesce(p_provider_status_detail, provider_status_detail),
    payment_method = coalesce(p_payment_method, payment_method),
    paid_amount_cents = coalesce(p_paid_amount_cents, paid_amount_cents),
    live_mode = coalesce(p_live_mode, live_mode),
    approved_at = case when next_status = 'approved' and approved_at is null then now() else approved_at end,
    last_synced_at = now(),
    updated_at = now()
  where id = o.id;

  if next_status = 'approved' then
    applied := public.apply_mansao_payment(o.id);
  elsif next_status in ('refunded', 'charged_back') then
    revoked := public.revoke_mansao_payment(o.id);
  end if;

  select * into o from public.payment_orders where id = p_order_id;
  return jsonb_build_object('duplicate', false, 'status', o.status, 'applied', o.applied_at is not null,
    'apply_result', applied, 'revoke_result', revoked, 'expires_at', o.granted_expires_at);
end $$;

revoke all on function public.apply_mansao_payment(uuid) from public, anon, authenticated;
revoke all on function public.revoke_mansao_payment(uuid) from public, anon, authenticated;
revoke all on function public.sync_payment_order(uuid, text, text, text, text, integer, text, boolean, text, text) from public, anon, authenticated;
grant execute on function public.sync_payment_order(uuid, text, text, text, text, integer, text, boolean, text, text) to service_role;

commit;
