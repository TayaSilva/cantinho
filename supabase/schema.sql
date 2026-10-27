-- Migra a instalação para multi-tenant.
-- Execute no SQL Editor do Supabase. O script é idempotente.

create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.houses (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Minha casinha',
  owner_id uuid not null references auth.users(id) on delete restrict,
  status text not null default 'active' check (status in ('active', 'suspended', 'deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- SPEC 2.0: data da última publicação (null = ainda é rascunho).
alter table public.houses add column if not exists published_at timestamptz;
update public.houses set published_at = updated_at where id = '00000000-0000-0000-0000-000000000001' and published_at is null;
create index if not exists houses_owner_idx on public.houses(owner_id);

create table if not exists public.house_members (
  house_id uuid not null references public.houses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'guest')),
  can_add_text boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (house_id, user_id)
);

create table if not exists public.house_documents (
  house_id uuid not null references public.houses(id) on delete cascade,
  status text not null check (status in ('draft', 'published')),
  document jsonb not null,
  version bigint not null default 1,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  primary key (house_id, status)
);

create table if not exists public.media (
  id uuid primary key default gen_random_uuid(),
  house_id uuid not null references public.houses(id) on delete cascade,
  storage_path text not null unique,
  original_name text not null,
  mime_type text not null,
  size_bytes bigint not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.house_share_links (
  id uuid primary key default gen_random_uuid(),
  house_id uuid not null references public.houses(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.house_invitations (
  id uuid primary key default gen_random_uuid(),
  house_id uuid not null references public.houses(id) on delete cascade,
  email text not null,
  role text not null default 'guest' check (role = 'guest'),
  token_hash text not null unique,
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_events (
  id bigint generated always as identity primary key,
  house_id uuid references public.houses(id) on delete set null,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists house_members_user_idx on public.house_members(user_id);
create index if not exists media_house_idx on public.media(house_id);
create index if not exists share_links_house_idx on public.house_share_links(house_id);
create index if not exists invitations_email_idx on public.house_invitations(lower(email));

-- Compatibilidade: transforma a casa fixa atual na primeira casa.
do $$
declare
  legacy_house uuid := '00000000-0000-0000-0000-000000000001';
  first_owner uuid;
begin
  select user_id into first_owner from public.admin_users order by created_at limit 1;
  if first_owner is null then
    select id into first_owner from auth.users order by created_at limit 1;
  end if;
  if first_owner is not null then
    insert into public.houses(id, name, owner_id) values (legacy_house, 'Minha casinha', first_owner) on conflict (id) do nothing;
    insert into public.house_members(house_id, user_id, role, can_add_text) values (legacy_house, first_owner, 'owner', true) on conflict (house_id, user_id) do update set role = 'owner', can_add_text = true;
    update public.house_documents set house_id = legacy_house where house_id = legacy_house;
    update public.media set house_id = legacy_house where house_id = legacy_house;
  end if;
end $$;

alter table public.houses enable row level security;
alter table public.house_members enable row level security;
alter table public.house_documents enable row level security;
alter table public.media enable row level security;
alter table public.house_share_links enable row level security;
alter table public.house_invitations enable row level security;
alter table public.audit_events enable row level security;

create or replace function public.is_house_member(check_house_id uuid, check_user_id uuid default auth.uid()) returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.house_members where house_id = check_house_id and user_id = check_user_id); $$;
create or replace function public.is_house_owner(check_house_id uuid, check_user_id uuid default auth.uid()) returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.house_members where house_id = check_house_id and user_id = check_user_id and role = 'owner'); $$;
create or replace function public.can_add_house_text(check_house_id uuid, check_user_id uuid default auth.uid()) returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.house_members where house_id = check_house_id and user_id = check_user_id and (role = 'owner' or can_add_text)); $$;

revoke all on function public.is_house_member(uuid, uuid) from public;
revoke all on function public.is_house_owner(uuid, uuid) from public;
revoke all on function public.can_add_house_text(uuid, uuid) from public;
grant execute on function public.is_house_member(uuid, uuid) to authenticated;
grant execute on function public.is_house_owner(uuid, uuid) to authenticated;
grant execute on function public.can_add_house_text(uuid, uuid) to authenticated;

drop policy if exists "published house is public" on public.house_documents;
drop policy if exists "admins manage house documents" on public.house_documents;
drop policy if exists "admins manage media metadata" on public.media;
drop policy if exists "users can verify own admin access" on public.admin_users;
-- Recria as políticas abaixo para o script poder rodar várias vezes.
drop policy if exists "members read their house documents" on public.house_documents;
drop policy if exists "owners manage house documents" on public.house_documents;
drop policy if exists "members read their media" on public.media;
drop policy if exists "owners manage media" on public.media;
drop policy if exists "members read their house" on public.houses;
drop policy if exists "owners manage share links" on public.house_share_links;
drop policy if exists "owners manage invitations" on public.house_invitations;
drop policy if exists "members read audit" on public.audit_events;
create policy "members read their house documents" on public.house_documents for select to authenticated using (public.is_house_member(house_id));
create policy "owners manage house documents" on public.house_documents for all to authenticated using (public.is_house_owner(house_id)) with check (public.is_house_owner(house_id));
-- Convidados não recebem UPDATE direto no documento. A API /api/houses/texts
-- valida e adiciona somente itens permitidos usando a chave server-side.
create policy "members read their media" on public.media for select to authenticated using (public.is_house_member(house_id));
create policy "owners manage media" on public.media for all to authenticated using (public.is_house_owner(house_id)) with check (public.is_house_owner(house_id));
create policy "members read their house" on public.houses for select to authenticated using (public.is_house_member(id));
create policy "owners manage share links" on public.house_share_links for all to authenticated using (public.is_house_owner(house_id)) with check (public.is_house_owner(house_id));
create policy "owners manage invitations" on public.house_invitations for all to authenticated using (public.is_house_owner(house_id)) with check (public.is_house_owner(house_id));
create policy "members read audit" on public.audit_events for select to authenticated using (public.is_house_member(house_id));

insert into storage.buckets (id, name, public) values ('casinha-media', 'casinha-media', false) on conflict (id) do update set public = false;
drop policy if exists "admins upload casinha media" on storage.objects;
drop policy if exists "admins delete casinha media" on storage.objects;
drop policy if exists "authenticated can upload casinha media" on storage.objects;
drop policy if exists "authenticated can delete casinha media" on storage.objects;
drop policy if exists "members read casinha media" on storage.objects;
drop policy if exists "members upload casinha media" on storage.objects;
drop policy if exists "owners delete casinha media" on storage.objects;
create policy "members read casinha media" on storage.objects for select to authenticated using (bucket_id = 'casinha-media' and public.is_house_member((storage.foldername(name))[1]::uuid));
create policy "members upload casinha media" on storage.objects for insert to authenticated with check (bucket_id = 'casinha-media' and public.is_house_member((storage.foldername(name))[1]::uuid));
create policy "owners delete casinha media" on storage.objects for delete to authenticated using (bucket_id = 'casinha-media' and public.is_house_owner((storage.foldername(name))[1]::uuid));

-- O acesso público passa exclusivamente pelas funções server-side, que validam o token e geram URLs temporárias.
