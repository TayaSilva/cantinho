-- SPEC 02.1: cada conta pode ter só UMA casinha no plano Free.
-- Casinhas Mini Mansão não entram no limite, então a trava antiga de
-- "um cantinho ativo por conta" sai e a regra passa a olhar o plano.
-- Idempotente: não altera casinhas, planos ou documentos existentes.

begin;

drop index if exists public.houses_one_active_per_owner_idx;

-- Confere no INSERT do plano (a casinha nasce Free). Uma Mini Mansão que
-- vence e volta para Free não é bloqueada: a regra vale para criar casinhas.
create or replace function public.enforce_one_free_house_per_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  house_owner uuid;
begin
  if new.plan_type <> 'free' then
    return new;
  end if;

  select owner_id into house_owner from public.houses where id = new.house_id;
  if house_owner is null then
    return new;
  end if;

  -- Serializa criações simultâneas da mesma conta.
  perform pg_advisory_xact_lock(hashtext('one_free_house:' || house_owner::text));

  if exists (
    select 1
    from public.house_plans hp
    join public.houses h on h.id = hp.house_id
    where h.owner_id = house_owner
      and h.status <> 'deleted'
      and hp.plan_type = 'free'
      and hp.house_id <> new.house_id
  ) then
    raise exception 'O plano Free permite apenas um cantinho por conta.' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_one_free_house_per_owner() from public, anon, authenticated;

drop trigger if exists house_plans_one_free_per_owner on public.house_plans;
create trigger house_plans_one_free_per_owner
  before insert on public.house_plans
  for each row execute function public.enforce_one_free_house_per_owner();

commit;
