-- Rode este arquivo no SQL Editor do Supabase.
-- Depois crie um usuário em Authentication > Users e insira o UUID dele em admin_users.

create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.house_documents (
  house_id uuid not null,
  status text not null check (status in ('draft', 'published')),
  document jsonb not null,
  version bigint not null default 1,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  primary key (house_id, status)
);

create table if not exists public.media (
  id uuid primary key default gen_random_uuid(),
  house_id uuid not null,
  storage_path text not null unique,
  original_name text not null,
  mime_type text not null,
  size_bytes bigint not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;
alter table public.house_documents enable row level security;
alter table public.media enable row level security;

drop policy if exists "users can verify own admin access" on public.admin_users;
create policy "users can verify own admin access"
  on public.admin_users for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "published house is public" on public.house_documents;
create policy "published house is public"
  on public.house_documents for select
  to anon, authenticated
  using (status = 'published');

drop policy if exists "admins manage house documents" on public.house_documents;
create policy "admins manage house documents"
  on public.house_documents for all
  to authenticated
  using (exists (select 1 from public.admin_users where user_id = auth.uid()))
  with check (exists (select 1 from public.admin_users where user_id = auth.uid()));

drop policy if exists "admins manage media metadata" on public.media;
create policy "admins manage media metadata"
  on public.media for all
  to authenticated
  using (exists (select 1 from public.admin_users where user_id = auth.uid()))
  with check (exists (select 1 from public.admin_users where user_id = auth.uid()));

insert into storage.buckets (id, name, public)
values ('casinha-media', 'casinha-media', true)
on conflict (id) do update set public = true;

drop policy if exists "admins upload casinha media" on storage.objects;
create policy "admins upload casinha media"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'casinha-media'
    and exists (select 1 from public.admin_users where user_id = auth.uid())
  );

drop policy if exists "admins delete casinha media" on storage.objects;
create policy "admins delete casinha media"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'casinha-media'
    and exists (select 1 from public.admin_users where user_id = auth.uid())
  );
