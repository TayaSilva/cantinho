-- SPEC 02: planos, cotas, direitos adquiridos e publicação segura.
-- Idempotente: não remove documentos, mídias ou direitos existentes.

begin;

create table if not exists public.plan_definitions (
  plan_type text primary key check (plan_type in ('free', 'mansao')),
  price_cents integer not null check (price_cents >= 0),
  duration_days integer not null check (duration_days > 0),
  storage_limit_bytes bigint not null check (storage_limit_bytes > 0),
  max_photos integer not null check (max_photos >= 0),
  max_videos integer not null check (max_videos >= 0),
  max_audios integer not null check (max_audios >= 0),
  max_letters integer not null check (max_letters >= 0),
  max_chest_texts integer not null check (max_chest_texts >= 0),
  max_characters integer not null check (max_characters >= 0),
  allow_pet boolean not null default false,
  allow_radio boolean not null default false,
  allow_tv boolean not null default false,
  created_at timestamptz not null default now()
);

insert into public.plan_definitions(plan_type, price_cents, duration_days, storage_limit_bytes, max_photos, max_videos, max_audios, max_letters, max_chest_texts, max_characters, allow_pet, allow_radio, allow_tv)
values
  ('free', 0, 30, 20971520, 5, 0, 1, 1, 1, 2, false, false, false),
  ('mansao', 1490, 182, 104857600, 20, 2, 5, 10, 10, 4, true, true, true)
on conflict (plan_type) do update set
  price_cents = excluded.price_cents,
  duration_days = excluded.duration_days,
  storage_limit_bytes = excluded.storage_limit_bytes,
  max_photos = excluded.max_photos,
  max_videos = excluded.max_videos,
  max_audios = excluded.max_audios,
  max_letters = excluded.max_letters,
  max_chest_texts = excluded.max_chest_texts,
  max_characters = excluded.max_characters,
  allow_pet = excluded.allow_pet,
  allow_radio = excluded.allow_radio,
  allow_tv = excluded.allow_tv;

create table if not exists public.house_plans (
  house_id uuid primary key references public.houses(id) on delete cascade,
  plan_type text not null references public.plan_definitions(plan_type),
  status text not null default 'active' check (status in ('active', 'expired', 'deletion_scheduled')),
  started_at timestamptz not null,
  expires_at timestamptz,
  deletion_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.legacy_entitlements (
  house_id uuid primary key references public.houses(id) on delete cascade,
  migration_key text not null default 'spec_02',
  cutoff_at timestamptz not null,
  preserved_storage_bytes bigint not null default 0,
  preserved_photos integer not null default 0,
  preserved_videos integer not null default 0,
  preserved_audios integer not null default 0,
  preserved_letters integer not null default 0,
  preserved_chest_texts integer not null default 0,
  preserved_characters integer not null default 2,
  preserved_pet boolean not null default false,
  preserved_radio boolean not null default false,
  preserved_tv boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.plan_migration_log (
  migration_key text primary key,
  cutoff_at timestamptz not null,
  executed_at timestamptz not null default now()
);

insert into public.plan_migration_log(migration_key, cutoff_at)
values ('spec_02', now())
on conflict (migration_key) do nothing;

do $$
declare
  cutoff timestamptz;
begin
  select cutoff_at into cutoff from public.plan_migration_log where migration_key = 'spec_02';
  insert into public.legacy_entitlements(
    house_id, cutoff_at, preserved_storage_bytes, preserved_photos, preserved_videos,
    preserved_audios, preserved_letters, preserved_chest_texts, preserved_characters,
    preserved_pet, preserved_radio, preserved_tv
  )
  select
    h.id,
    cutoff,
    coalesce(media.total_bytes, 0),
    coalesce(jsonb_array_length(d.document #> '{content,photos}'), 0),
    coalesce(jsonb_array_length(d.document #> '{content,videos}'), 0),
    coalesce(jsonb_array_length(d.document #> '{content,playlist,tracks}'), 0),
    coalesce(jsonb_array_length(d.document #> '{content,letters}'), 0),
    coalesce(jsonb_array_length(d.document #> '{content,chestMessages}'), 0),
    greatest(2, coalesce(chars.enabled_count, 2)),
    coalesce((d.document #>> '{appearance,pet,enabled}') = 'true', false),
    coalesce((d.document #>> '{appearance,furniture,radio,visible}') <> 'false', false),
    coalesce((d.document #>> '{appearance,furniture,tv,visible}') <> 'false', false)
  from public.houses h
  left join public.house_documents d on d.house_id = h.id and d.status = 'published'
  left join lateral (
    select count(*)::integer as enabled_count
    from jsonb_array_elements(coalesce(d.document #> '{appearance,characters}', '[]'::jsonb)) as item
    where coalesce(item->>'enabled', 'true') = 'true'
  ) chars on true
  left join lateral (
    select coalesce(sum(size_bytes), 0)::bigint as total_bytes
    from public.media m where m.house_id = h.id
  ) media on true
  where h.status <> 'deleted'
  on conflict (house_id) do nothing;

  insert into public.audit_events(house_id, action, metadata)
  select e.house_id, 'legacy_entitlements_migrated', jsonb_build_object('migration_key', e.migration_key, 'cutoff_at', e.cutoff_at)
  from public.legacy_entitlements e
  where e.migration_key = 'spec_02'
    and not exists (
      select 1 from public.audit_events a
      where a.house_id = e.house_id and a.action = 'legacy_entitlements_migrated'
    );
end $$;

insert into public.house_plans(house_id, plan_type, status, started_at, expires_at)
select h.id, 'free', 'active', l.cutoff_at, l.cutoff_at + interval '30 days'
from public.houses h
join public.legacy_entitlements l on l.house_id = h.id
where h.status <> 'deleted'
on conflict (house_id) do nothing;

alter table public.plan_definitions enable row level security;
alter table public.house_plans enable row level security;
alter table public.legacy_entitlements enable row level security;
alter table public.plan_migration_log enable row level security;

revoke all on public.plan_definitions, public.house_plans, public.legacy_entitlements, public.plan_migration_log from anon, authenticated;

drop policy if exists "members read house plans" on public.house_plans;
create policy "members read house plans" on public.house_plans
  for select to authenticated using (public.is_house_member(house_id));
drop policy if exists "owners read legacy entitlements" on public.legacy_entitlements;
create policy "owners read legacy entitlements" on public.legacy_entitlements
  for select to authenticated using (public.is_house_owner(house_id));

-- Reserva de mídia serializada por cantinho: duas finalizações simultâneas não
-- conseguem ultrapassar a cota antes de registrar a linha em public.media.
create or replace function public.register_house_media(
  p_house_id uuid,
  p_id uuid,
  p_storage_path text,
  p_original_name text,
  p_mime_type text,
  p_size_bytes bigint,
  p_created_by uuid
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  limit_bytes bigint;
  used_bytes bigint;
  legacy_bytes bigint;
  plan_status text;
  plan_expires_at timestamptz;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_house_id::text, 0));
  -- Uploads de rascunho podem chegar ao teto da Mini Mansão (100 MB),
  -- enquanto a publicação continua validando o limite do plano atual.
  select greatest(pd.storage_limit_bytes, mansao.storage_limit_bytes, coalesce(le.preserved_storage_bytes, 0)), coalesce(le.preserved_storage_bytes, 0)
    into limit_bytes, legacy_bytes
  from public.house_plans hp
  join public.plan_definitions pd on pd.plan_type = hp.plan_type
  join public.plan_definitions mansao on mansao.plan_type = 'mansao'
  left join public.legacy_entitlements le on le.house_id = hp.house_id
  where hp.house_id = p_house_id;
  if limit_bytes is null then
    select pd.storage_limit_bytes into limit_bytes from public.plan_definitions pd where pd.plan_type = 'mansao';
  end if;
  select hp.status, hp.expires_at into plan_status, plan_expires_at from public.house_plans hp where hp.house_id = p_house_id;
  if plan_status is not null and (plan_status <> 'active' or (plan_expires_at is not null and plan_expires_at <= now())) then
    raise exception using errcode = 'P0002', message = 'plan_inactive';
  end if;
  select coalesce(sum(size_bytes), 0) into used_bytes from public.media where house_id = p_house_id;
  if p_size_bytes <= 0 or used_bytes + p_size_bytes > limit_bytes then
    raise exception using errcode = 'P0001', message = 'storage_quota_exceeded';
  end if;
  insert into public.media(id, house_id, storage_path, original_name, mime_type, size_bytes, created_by)
  values (p_id, p_house_id, p_storage_path, p_original_name, p_mime_type, p_size_bytes, p_created_by);
  return jsonb_build_object('ok', true, 'used_bytes', used_bytes + p_size_bytes, 'limit_bytes', limit_bytes);
end $$;

revoke all on function public.register_house_media(uuid, uuid, text, text, text, bigint, uuid) from public, anon, authenticated;
grant execute on function public.register_house_media(uuid, uuid, text, text, text, bigint, uuid) to service_role;

commit;
