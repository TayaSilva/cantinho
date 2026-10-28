-- Cenários de pagamento da Mini Mansão executados contra as migrations reais.
-- Cada bloco falha com ASSERT se a regra não for respeitada.
\set ON_ERROR_STOP on

-- Dados de teste: dois usuários, quatro cantinhos.
insert into auth.users(id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'dona@example.com'),
  ('00000000-0000-0000-0000-0000000000b2', 'outra@example.com');

insert into public.houses(id, name, slug, owner_id) values
  ('10000000-0000-0000-0000-000000000001', 'Upgrade', 'upgrade-1', '00000000-0000-0000-0000-0000000000a1'),
  ('10000000-0000-0000-0000-000000000002', 'Vencido', 'vencido-2', '00000000-0000-0000-0000-0000000000b2'),
  ('10000000-0000-0000-0000-000000000003', 'Excluir', 'excluir-3', '00000000-0000-0000-0000-0000000000b2'),
  ('10000000-0000-0000-0000-000000000004', 'Valor', 'valor-4', '00000000-0000-0000-0000-0000000000a1');
insert into public.house_members(house_id, user_id, role, can_add_text)
select id, owner_id, 'owner', true from public.houses where slug in ('upgrade-1', 'vencido-2', 'excluir-3', 'valor-4');

insert into public.house_plans(house_id, plan_type, status, started_at, expires_at) values
  ('10000000-0000-0000-0000-000000000001', 'free', 'active', now(), now() + interval '30 days');
insert into public.house_plans(house_id, plan_type, status, started_at, expires_at, deletion_at) values
  ('10000000-0000-0000-0000-000000000002', 'mansao', 'deletion_scheduled', now() - interval '200 days', now() - interval '10 days', now() + interval '1 day');
insert into public.house_plans(house_id, plan_type, status, started_at, expires_at) values
  ('10000000-0000-0000-0000-000000000004', 'mansao', 'active', now(), now() + interval '20 days');

insert into public.payment_orders(id, house_id, user_id, kind, amount_cents, status, provider_order_id) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', 'upgrade', 1490, 'pending', 'ORDTST1');

-- Pix pendente não libera nada.
do $$
declare r jsonb;
begin
  r := public.sync_payment_order('20000000-0000-0000-0000-000000000001', 'pending', 'created', 'waiting_payment', 'pix', null, 'BRL', false, 'webhook', 'k:pend');
  assert r->>'status' = 'pending', 'pix pendente deveria ficar pendente';
  assert (select plan_type from public.house_plans where house_id = '10000000-0000-0000-0000-000000000001') = 'free', 'pendente não pode liberar Premium';
end $$;

-- Pix aprovado depois: upgrade ativa 6 meses a partir de agora.
do $$
declare r jsonb; hp record;
begin
  r := public.sync_payment_order('20000000-0000-0000-0000-000000000001', 'approved', 'processed', 'accredited', 'pix', 1490, 'BRL', false, 'webhook', 'k:ok');
  assert (r->>'applied')::boolean, 'aprovado deveria aplicar';
  select * into hp from public.house_plans where house_id = '10000000-0000-0000-0000-000000000001';
  assert hp.plan_type = 'mansao' and hp.status = 'active', 'plano deveria virar mansao ativo';
  assert abs(extract(epoch from hp.expires_at - (now() + interval '6 months'))) < 5, 'upgrade: 6 meses a partir de agora';
  assert hp.last_payment_order_id = '20000000-0000-0000-0000-000000000001';
  assert exists (select 1 from public.audit_events where action = 'mansao_payment_applied'), 'evento de auditoria';
end $$;

-- Webhook duplicado e reprocessamento não aplicam de novo.
do $$
declare r jsonb; before_exp timestamptz; applications integer;
begin
  select expires_at into before_exp from public.house_plans where house_id = '10000000-0000-0000-0000-000000000001';
  r := public.sync_payment_order('20000000-0000-0000-0000-000000000001', 'approved', 'processed', 'accredited', 'pix', 1490, 'BRL', false, 'webhook', 'k:ok');
  assert (r->>'duplicate')::boolean, 'mesma chave deveria ser duplicada';
  r := public.sync_payment_order('20000000-0000-0000-0000-000000000001', 'approved', 'processed', 'accredited', 'pix', 1490, 'BRL', false, 'sync', 'k:ok-2');
  assert r->'apply_result'->>'reason' = 'already_applied', 'segunda aprovação não reaplica';
  assert (select expires_at from public.house_plans where house_id = '10000000-0000-0000-0000-000000000001') = before_exp, 'validade não muda em duplicata';
  select count(*) into applications from public.payment_events where action = 'benefits_applied' and payment_order_id = '20000000-0000-0000-0000-000000000001';
  assert applications = 1, 'benefício aplicado uma única vez';
end $$;

-- Evento fora de ordem: "pendente" depois de "aprovado" não regride.
do $$
declare r jsonb;
begin
  r := public.sync_payment_order('20000000-0000-0000-0000-000000000001', 'pending', 'created', null, null, null, 'BRL', false, 'webhook', 'k:late-pending');
  assert r->>'status' = 'approved', 'aprovado não volta para pendente';
end $$;

-- Dois pedidos abertos para o mesmo cantinho são bloqueados (dois cliques).
do $$
begin
  insert into public.payment_orders(house_id, kind, amount_cents, status) values ('10000000-0000-0000-0000-000000000001', 'renewal', 1490, 'creating');
  begin
    insert into public.payment_orders(house_id, kind, amount_cents, status) values ('10000000-0000-0000-0000-000000000001', 'renewal', 1490, 'creating');
    assert false, 'segundo pedido aberto deveria falhar';
  exception when unique_violation then null;
  end;
  delete from public.payment_orders where house_id = '10000000-0000-0000-0000-000000000001' and status = 'creating';
end $$;

-- Renovação antecipada soma 6 meses ao vencimento atual; reembolso retira.
insert into public.payment_orders(id, house_id, user_id, kind, amount_cents, status, provider_order_id) values
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', 'renewal', 1490, 'pending', 'ORDTST2');
do $$
declare r jsonb; before_exp timestamptz; after_exp timestamptz;
begin
  select expires_at into before_exp from public.house_plans where house_id = '10000000-0000-0000-0000-000000000001';
  r := public.sync_payment_order('20000000-0000-0000-0000-000000000002', 'approved', 'processed', 'accredited', 'credit', 1490, 'BRL', false, 'webhook', 'k:renew');
  assert r->'apply_result'->>'mode' = 'early_renewal', 'deveria ser renovação antecipada';
  select expires_at into after_exp from public.house_plans where house_id = '10000000-0000-0000-0000-000000000001';
  assert after_exp = before_exp + interval '6 months', 'renovação preserva a validade restante';

  r := public.sync_payment_order('20000000-0000-0000-0000-000000000002', 'refunded', 'refunded', 'refunded', 'credit', 1490, 'BRL', false, 'webhook', 'k:refund');
  assert r->>'status' = 'refunded';
  assert (select expires_at from public.house_plans where house_id = '10000000-0000-0000-0000-000000000001') = before_exp, 'reembolso retira só o período comprado';

  r := public.sync_payment_order('20000000-0000-0000-0000-000000000002', 'approved', 'processed', 'accredited', 'credit', 1490, 'BRL', false, 'webhook', 'k:late-approved');
  assert r->>'status' = 'refunded', 'reembolsado não volta para aprovado';
  assert (select expires_at from public.house_plans where house_id = '10000000-0000-0000-0000-000000000001') = before_exp, 'nada reaplicado depois do reembolso';
end $$;

-- Contestação (chargeback) do upgrade: retira o período e o plano vence, sem excluir nada.
do $$
declare r jsonb; hp record;
begin
  r := public.sync_payment_order('20000000-0000-0000-0000-000000000001', 'charged_back', 'processed', 'charged_back', 'pix', 1490, 'BRL', false, 'webhook', 'k:cb');
  assert (r->'revoke_result'->>'revoked')::boolean, 'contestação revoga';
  select * into hp from public.house_plans where house_id = '10000000-0000-0000-0000-000000000001';
  assert hp.status = 'expired' and hp.expires_at <= now(), 'sem período pago, o plano fica vencido';
  assert exists (select 1 from public.houses where id = '10000000-0000-0000-0000-000000000001'), 'cantinho não é excluído';
end $$;

-- Cantinho vencido com exclusão programada: nova validade a partir da confirmação.
insert into public.payment_orders(id, house_id, user_id, kind, amount_cents, status, provider_order_id) values
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000b2', 'renewal', 1490, 'pending', 'ORDTST3');
do $$
declare r jsonb; hp record;
begin
  r := public.sync_payment_order('20000000-0000-0000-0000-000000000003', 'approved', 'processed', 'accredited', 'debit', 1490, 'BRL', false, 'webhook', 'k:expired');
  assert r->'apply_result'->>'mode' = 'expired_renewal';
  select * into hp from public.house_plans where house_id = '10000000-0000-0000-0000-000000000002';
  assert hp.status = 'active' and hp.deletion_at is null, 'exclusão programada cancelada';
  assert abs(extract(epoch from hp.expires_at - (now() + interval '6 months'))) < 5, 'vencido: 6 meses a partir de agora';
end $$;

-- Valor divergente: vai para revisão e não libera.
insert into public.payment_orders(id, house_id, user_id, kind, amount_cents, status, provider_order_id) values
  ('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-0000000000a1', 'renewal', 1490, 'pending', 'ORDTST4');
do $$
declare r jsonb; before_exp timestamptz;
begin
  select expires_at into before_exp from public.house_plans where house_id = '10000000-0000-0000-0000-000000000004';
  r := public.sync_payment_order('20000000-0000-0000-0000-000000000004', 'approved', 'processed', 'accredited', 'pix', 100, 'BRL', false, 'webhook', 'k:cheap');
  assert r->>'status' = 'needs_review' and not (r->>'applied')::boolean, 'valor menor não libera';
  r := public.sync_payment_order('20000000-0000-0000-0000-000000000004', 'approved', 'processed', 'accredited', 'pix', 1490, 'USD', false, 'webhook', 'k:usd');
  assert not (r->>'applied')::boolean, 'moeda diferente não libera';
  assert (select expires_at from public.house_plans where house_id = '10000000-0000-0000-0000-000000000004') = before_exp;
end $$;

-- Pagamento recusado não libera.
insert into public.payment_orders(id, house_id, user_id, kind, amount_cents, status, provider_order_id) values
  ('20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000000b2', 'upgrade', 1490, 'pending', 'ORDTST5');
do $$
declare r jsonb;
begin
  r := public.sync_payment_order('20000000-0000-0000-0000-000000000005', 'declined', 'failed', 'rejected', 'credit', null, 'BRL', false, 'webhook', 'k:declined');
  assert r->>'status' = 'declined' and not (r->>'applied')::boolean;
  assert not exists (select 1 from public.house_plans where house_id = '10000000-0000-0000-0000-000000000003'), 'recusado não cria plano';
end $$;

-- Cantinho excluído antes da confirmação: histórico preservado, nada recriado.
insert into public.payment_orders(id, house_id, user_id, kind, amount_cents, status, provider_order_id) values
  ('20000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000000b2', 'upgrade', 1490, 'pending', 'ORDTST6');
delete from public.houses where id = '10000000-0000-0000-0000-000000000003';
do $$
declare r jsonb;
begin
  assert (select house_id from public.payment_orders where id = '20000000-0000-0000-0000-000000000006') is null, 'pedido sobrevive à exclusão';
  r := public.sync_payment_order('20000000-0000-0000-0000-000000000006', 'approved', 'processed', 'accredited', 'pix', 1490, 'BRL', false, 'webhook', 'k:deleted');
  assert r->>'status' = 'needs_review' and not (r->>'applied')::boolean, 'cantinho excluído vai para revisão';
  assert not exists (select 1 from public.houses where id = '10000000-0000-0000-0000-000000000003'), 'não recria cantinho';
end $$;

-- O navegador (anon/authenticated) não aprova pagamento nem muda validade.
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', false);
do $$
begin
  begin
    perform public.sync_payment_order('20000000-0000-0000-0000-000000000004', 'approved', 'processed', 'accredited', 'pix', 1490, 'BRL', false, 'webhook', 'k:hack');
    assert false, 'authenticated não pode executar sync_payment_order';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.apply_mansao_payment('20000000-0000-0000-0000-000000000004');
    assert false, 'authenticated não pode executar apply_mansao_payment';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.payment_orders set status = 'approved';
    assert false, 'authenticated não pode alterar pedidos';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.payment_orders(house_id, kind, amount_cents) values ('10000000-0000-0000-0000-000000000004', 'upgrade', 1);
    assert false, 'authenticated não pode criar pedidos';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.house_plans set expires_at = now() + interval '10 years';
    assert false, 'authenticated não pode alterar validade';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

set role anon;
do $$
begin
  begin
    perform 1 from public.payment_orders;
    assert false, 'anon não lê pedidos';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- A API (service_role) executa a sincronização.
set role service_role;
select public.sync_payment_order('20000000-0000-0000-0000-000000000004', 'pending', 'created', null, null, null, 'BRL', false, 'sync', 'k:svc') is not null as service_role_ok;
reset role;

-- A migration pode rodar de novo sem erro (idempotente).
\ir ../../supabase/migrations/20261028_0004_pagamentos_mini_mansao.sql

select 'payments sql: ok' as result;
