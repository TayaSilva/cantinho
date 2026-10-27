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

test('slug route is authenticated and never public by slug alone', async () => {
  const source = await read('api/house/by-slug/[slug].mjs');
  assert.match(source, /requireSlugHouse\(req/);
  assert.match(source, /if \(!context\) return fail\(res, 404/);
  const publicSource = await read('api/public/house/[token].mjs');
  assert.match(publicSource, /return fail\(res, 410/);
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

test('service role key is not referenced by browser source', async () => {
  const source = await read('src/services/auth.ts');
  assert.doesNotMatch(source, /SERVICE_ROLE/i);
});
