/**
 * Aplica schema + migrations num Postgres descartável (Docker) e roda os
 * cenários de pagamento em SQL. Uso: npm run test:db
 * Requer Docker. Não toca no Supabase nem em dados reais.
 */
import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const image = process.env.TEST_PG_IMAGE || 'postgres:18-alpine';
const name = `cantinho-payments-test-${process.pid}`;

function docker(args, options = {}) {
  const result = spawnSync('docker', args, { encoding: 'utf8', ...options });
  if (result.status !== 0) throw new Error(`docker ${args[0]} falhou:\n${result.stdout}\n${result.stderr}`);
  return result.stdout;
}

function psql(file) {
  const result = spawnSync('docker', ['exec', name, 'psql', '-U', 'postgres', '-v', 'ON_ERROR_STOP=1', '-q', '-f', `/repo/${file}`], { encoding: 'utf8' });
  process.stdout.write(result.stdout);
  if (result.status !== 0) throw new Error(`${file} falhou:\n${result.stderr}`);
}

docker(['run', '-d', '--rm', '--name', name, '-e', 'POSTGRES_PASSWORD=postgres', '-v', `${root}:/repo:ro`, image]);
try {
  for (let attempt = 0; ; attempt += 1) {
    const ready = spawnSync('docker', ['exec', name, 'pg_isready', '-U', 'postgres'], { encoding: 'utf8' });
    if (ready.status === 0) break;
    if (attempt > 60) throw new Error('Postgres não iniciou.');
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  // pg_isready pode responder antes do init terminar; uma consulta confirma.
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const probe = spawnSync('docker', ['exec', name, 'psql', '-U', 'postgres', '-c', 'select 1'], { encoding: 'utf8' });
    if (probe.status === 0) break;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  psql('tests/db/supabase-stub.sql');
  psql('supabase/schema.sql');
  for (const file of readdirSync(new URL('../../supabase/migrations/', import.meta.url)).filter((item) => item.endsWith('.sql')).sort()) {
    psql(`supabase/migrations/${file}`);
  }
  psql('tests/db/payments.test.sql');
} finally {
  spawnSync('docker', ['rm', '-f', name], { encoding: 'utf8' });
}
