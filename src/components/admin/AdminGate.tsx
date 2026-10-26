import { useEffect, useState } from 'react';
import { AdminApp } from './AdminApp';
import { cloudConfigured, getSession, signIn, signOut, type AuthSession } from '../../services/auth';

export function AdminGate({ path }: { path: string }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(cloudConfigured);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!cloudConfigured) return;
    void getSession().then((current) => {
      setSession(current);
      setLoading(false);
    });
    const onAuthChange = () => void getSession().then(setSession);
    window.addEventListener('casinha:auth-changed', onAuthChange);
    return () => window.removeEventListener('casinha:auth-changed', onAuthChange);
  }, []);

  if (!cloudConfigured) return <AdminApp path={path} />;
  if (loading) return <main className="flex min-h-dvh items-center justify-center bg-stone-50 text-sm text-stone-600">Carregando acesso…</main>;
  if (session) return <AdminApp path={path} onLogout={() => void signOut()} />;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-stone-50 px-4 font-admin text-stone-900">
      <form
        className="flex w-full max-w-sm flex-col gap-5 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          setError(null);
          try {
            const current = await signIn(email, password);
            setSession(current);
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'Não foi possível entrar.');
          } finally {
            setBusy(false);
          }
        }}
      >
        <div>
          <p className="text-xs font-semibold tracking-[.08em] text-rose-700 uppercase">Casinha Admin</p>
          <h1 className="mt-1 text-2xl font-bold">Entrar no backoffice</h1>
          <p className="mt-2 text-sm leading-relaxed text-stone-600">Use o usuário criado no Supabase Auth.</p>
        </div>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          E-mail
          <input className="rounded-lg border border-stone-300 px-3 py-2 font-normal outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Senha
          <input className="rounded-lg border border-stone-300 px-3 py-2 font-normal outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        </label>
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        <button type="submit" disabled={busy} className="rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-stone-700 disabled:opacity-50">
          {busy ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </main>
  );
}
