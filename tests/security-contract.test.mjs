import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

test('migration isolates houses with slug and one active house per owner', async () => {
  const sql = await read('supabase/migrations/20261027_0001_casinhas_privadas.sql');
  assert.match(sql, /slug text/i);
  assert.match(sql, /houses_slug_unique_idx/i);
  assert.match(sql, /houses_one_active_per_owner_idx/i);
  assert.match(sql, /public = false/i);
});

test('RLS and grants do not expose tenant tables to browser roles', async () => {
  const sql = await read('supabase/migrations/20261027_0001_casinhas_privadas.sql');
  assert.match(sql, /revoke all on public\.admin_users, public\.houses, public\.house_members/i);
  assert.match(sql, /create policy "members read their memberships"/i);
  assert.doesNotMatch(sql, /create policy "published house is public"/i);
});

test('server ownership checks bind requested houses to authenticated membership', async () => {
  const source = await read('api/_lib/supabase.mjs');
  assert.match(source, /getUser\(req\)/);
  assert.match(source, /house_members\?house_id=.*user_id/);
  assert.match(source, /permission === 'owner'/);
  assert.match(source, /requireSlugHouse/);
});

test('slug route stays private while bearer links expose published content', async () => {
  const source = await read('api/house/by-slug/[slug].mjs');
  assert.match(source, /requireSlugHouse\(req/);
  assert.match(source, /if \(!context\) return fail\(res, 404/);
  const publicSource = await read('api/public/house/[token].mjs');
  assert.doesNotMatch(publicSource, /return fail\(res, 410/);
  assert.match(publicSource, /req\.method !== 'GET'/);
  assert.match(publicSource, /resolveShareToken/);
  assert.match(publicSource, /published_at=not\.is\.null/);
  assert.match(publicSource, /status=eq\.published/);
  assert.match(publicSource, /hydrateMedia/);
  const shareApi = await read('api/houses/share-links.mjs');
  assert.match(shareApi, /published_at/);
  const supabase = await read('api/_lib/supabase.mjs');
  assert.match(supabase, /createHmac/);
  assert.match(supabase, /SHARE_TOKEN_SECRET/);
  assert.match(supabase, /resolution=merge-duplicates/);
});

test('media authorization is scoped by house and owner, with server-side limits', async () => {
  const complete = await read('api/media/complete.mjs');
  const media = await read('api/media/[id].mjs');
  assert.match(complete, /requireRequestedHouse\(req, 'owner'\)/);
  assert.match(complete, /MAX_STORAGE_BYTES/);
  assert.match(complete, /ALLOWED_TYPES/);
  assert.match(complete, /startsWith\(`\$\{context\.house\.id\}\//);
  assert.match(media, /requireRequestedHouse\(req, req\.method === 'DELETE' \? 'owner' : 'read'\)/);
  assert.match(media, /house_id=eq\./);
});

test('SPEC 02 keeps plans and publication quotas server-side', async () => {
  const migration = await read('supabase/migrations/20261028_0002_planos_cotas.sql');
  assert.match(migration, /create table if not exists public\.plan_definitions/i);
  assert.match(migration, /create table if not exists public\.house_plans/i);
  assert.match(migration, /create table if not exists public\.legacy_entitlements/i);
  assert.match(migration, /register_house_media/i);
  assert.match(migration, /pg_advisory_xact_lock/i);
  assert.match(migration, /revoke all on public\.plan_definitions/i);
  const planApi = await read('api/houses/plan.mjs');
  assert.match(planApi, /requireRequestedHouse\(req, 'read'\)/);
  const publish = await read('api/house/publish.mjs');
  assert.match(publish, /validatePublication/);
  assert.match(publish, /PLAN_LIMITS/);
  assert.match(publish, /preserveDraft/);
  const local = await read('server.mjs');
  assert.match(local, /house_plans/);
  assert.match(local, /PLAN_LIMITS/);
});

test('private routes redirect to login and next only accepts internal paths', async () => {
  const gate = await read('src/components/admin/AdminGate.tsx');
  const app = await read('src/App.tsx');
  assert.match(gate, /\/login\?next=\$\{encodeURIComponent\(target\)\}/);
  assert.match(gate, /if \(!session && !AUTH_PATHS\.includes\(path\)\) return <Redirect to=\{loginPath\(/);
  assert.match(gate, /next\.startsWith\('\/\/'\)/);
  assert.match(app, /<RequireSession>\{house\}<\/RequireSession>/);
  assert.match(app, /if \(path !== '\/' && !shareToken\) return <Redirect to="\/" \/>/);
  assert.match(app, /return demo \|\| shareToken \? house : <RequireSession>/);
  assert.match(app, /\/api\/public\/house/);
  assert.doesNotMatch(app, /<ShareButton disabled/);
  const admin = await read('src/components/admin/AdminApp.tsx');
  const houses = await read('src/components/account/MyHousesPage.tsx');
  assert.doesNotMatch(admin, /disabled title=.*Compartilhamento/);
  assert.doesNotMatch(houses, /disabled=\{houseStatus\(item\) === 'draft'\}/);
});

test('service role key is not referenced by browser source', async () => {
  const source = await read('src/services/auth.ts');
  assert.doesNotMatch(source, /SERVICE_ROLE/i);
});
