-- Cantinho: casinhas individuais, slugs exclusivos e privacidade por padrão.
-- Compatível com os dados existentes: nenhuma linha ou arquivo é apagado.

begin;

alter table public.houses add column if not exists slug text;

-- Slugs internos não são autorização. Eles só identificam a URL; toda leitura
-- continua exigindo sessão + membership no servidor/RLS.
update public.houses
set slug = 'cantinho-' || left(replace(id::text, '-', ''), 12)
where slug is null or btrim(slug) = '';

alter table public.houses alter column slug set not null;
create unique index if not exists houses_slug_unique_idx on public.houses(slug);

-- Primeira versão: uma única casa ativa por conta. Se uma instalação anterior
-- já tiver mais de uma, preserva as linhas e suspende as excedentes, mantendo
-- a mais antiga como ativa.
with ranked as (
  select id, row_number() over (partition by owner_id order by created_at asc, id asc) as position
  from public.houses
  where status = 'active'
)
update public.houses h
set status = 'suspended', updated_at = now()
from ranked r
where h.id = r.id and r.position > 1;

create unique index if not exists houses_one_active_per_owner_idx
  on public.houses(owner_id)
  where status = 'active';

-- A API usa a service key server-side para operações de escrita. O navegador
-- não recebe grants diretos nessas tabelas; RLS continua habilitado como defesa
-- adicional para qualquer acesso autenticado futuro.
alter table public.admin_users enable row level security;
revoke all on public.admin_users, public.houses, public.house_members,
  public.house_documents, public.media, public.house_share_links,
  public.house_invitations, public.audit_events from anon, authenticated;

drop policy if exists "users can verify own admin access" on public.admin_users;
drop policy if exists "users read own admin row" on public.admin_users;
create policy "users read own admin row" on public.admin_users
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "members read their memberships" on public.house_members;
create policy "members read their memberships" on public.house_members
  for select to authenticated using (user_id = auth.uid());

-- Storage permanece privado e limitado a formatos suportados pelo editor.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'casinha-media',
  'casinha-media',
  false,
  52428800,
  array['image/*', 'audio/*', 'video/*']
)
on conflict (id) do update set
  public = false,
  file_size_limit = 52428800,
  allowed_mime_types = excluded.allowed_mime_types;

-- O compartilhamento público usa bearer tokens validados por endpoint server-side.
-- Não há política pública no banco: o endpoint consulta com a chave de serviço,
-- valida o token e gera URLs temporárias para as mídias privadas.
drop policy if exists "published house is public" on public.house_documents;

commit;
