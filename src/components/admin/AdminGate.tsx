import { useEffect, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { MyHousesPage } from '../account/MyHousesPage';
import { AdminApp } from './AdminApp';
import { AuthError, cloudConfigured, consumeAuthRedirect, getSession, hasRecoveryToken, requestPasswordReset, resendConfirmation, signIn, signOut, signUp, updatePassword, type AuthSession } from '../../services/auth';
import { createHouse, deleteHouse, getActiveHouseId, houseAdminPath, listHouses, setActiveHouseId, type HouseSummary } from '../../services/houses';
import { navigate } from '../../hooks/useRoute';

type AuthMode = 'login' | 'signup' | 'recovery';

const AUTH_PATHS = ['/login', '/cadastro', '/recuperar-senha'];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Troca a URL sem criar entrada no histórico (redirecionamentos). */
function Redirect({ to }: { to: string }) {
  useEffect(() => {
    window.history.replaceState({}, '', to);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, [to]);
  return <Loading />;
}

function Loading({ label = 'Carregando acesso…' }: { label?: string }) {
  return <main className="flex min-h-dvh items-center justify-center bg-stone-50 font-admin text-sm text-stone-600" aria-busy="true">{label}</main>;
}

/** /admin/casinha/:id/resto → { id, sub } */
function parseHousePath(path: string): { id: string; sub: string } | null {
  const match = /^\/admin\/casinha\/([^/]+)(\/.*)?$/.exec(path);
  return match ? { id: decodeURIComponent(match[1]), sub: match[2] || '/editor' } : null;
}

/**
 * Porta de entrada das áreas autenticadas: login, cadastro, recuperação de senha,
 * /minhas-casinhas e o Backoffice de cada casinha (/admin/casinha/:id).
 * A interface só esconde o que não pertence à conta; a autorização de verdade
 * é refeita pela API e pelas políticas do banco a cada requisição.
 */
export function AdminGate({ path }: { path: string }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [houses, setHouses] = useState<HouseSummary[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [recovery, setRecovery] = useState(hasRecoveryToken);

  const refreshHouses = async () => {
    setError(null);
    try {
      setHouses(await listHouses());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar suas casinhas.');
    }
  };

  useEffect(() => {
    if (!cloudConfigured) {
      void refreshHouses().finally(() => setLoading(false));
      return;
    }
    void consumeAuthRedirect().then(async (result) => {
      if (result.error) setLinkError(result.error);
      if (result.confirmed) setNotice('E-mail confirmado! Sua conta está pronta.');
      const current = await getSession();
      setSession(current);
      if (current) await refreshHouses();
      setLoading(false);
    });
    const onAuthChange = () => void getSession().then((current) => {
      setSession(current);
      if (current) void refreshHouses();
      else setHouses(null);
    });
    window.addEventListener('casinha:auth-changed', onAuthChange);
    return () => window.removeEventListener('casinha:auth-changed', onAuthChange);
  }, []);

  // A lista volta atualizada (status, datas) sempre que se retorna a ela.
  const lastPath = useRef(path);
  useEffect(() => {
    if (path === '/minhas-casinhas' && lastPath.current !== path && (session || !cloudConfigured)) void refreshHouses();
    lastPath.current = path;
  }, [path, session]);

  const openHouse = (id: string) => {
    setActiveHouseId(id);
    navigate(houseAdminPath(id));
  };

  const createNewHouse = async () => {
    const item = await createHouse('');
    setHouses((current) => [...(current || []).filter((house) => house.house_id !== item.house_id), item]);
    openHouse(item.house_id);
  };

  const removeHouse = async (id: string) => {
    await deleteHouse(id);
    setHouses((current) => (current || []).filter((house) => house.house_id !== id));
  };

  const logout = cloudConfigured ? () => void signOut().then(() => navigate('/login')) : undefined;

  if (path === '/redefinir-senha' || recovery) {
    return <RecoveryPage onDone={() => { setRecovery(false); setNotice('Senha alterada. Entre com sua nova senha.'); navigate('/login'); }} />;
  }
  if (loading) return <Loading />;
  if (cloudConfigured && !session) {
    const mode: AuthMode = path === '/cadastro' ? 'signup' : path === '/recuperar-senha' ? 'recovery' : 'login';
    return <AuthPage mode={mode} notice={notice} linkError={linkError} onNotice={setNotice} />;
  }
  if (AUTH_PATHS.includes(path)) return <Redirect to="/minhas-casinhas" />;
  if (!houses) {
    return error ? <ErrorPage message={error} onRetry={() => void refreshHouses()} /> : <Loading label="Carregando suas casinhas…" />;
  }

  // Rotas antigas (/admin, /admin/editor, /admin/conteudos/*) apontam para a casinha ativa.
  if (path === '/admin/editor' || path.startsWith('/admin/conteudos')) {
    const active = getActiveHouseId(houses);
    return <Redirect to={active ? houseAdminPath(active, path.slice('/admin'.length)) : '/minhas-casinhas'} />;
  }

  const target = parseHousePath(path);
  if (target) {
    const house = houses.find((item) => item.house_id === target.id);
    if (!house) return <AccessDenied />;
    if (house.role !== 'owner') return <AccessDenied message="Você foi convidado para esta casinha, mas apenas o dono pode editá-la." />;
    return <AdminApp key={house.house_id} path={target.sub} house={house} houses={houses.filter((item) => item.role === 'owner')} onHouseChange={openHouse} onLogout={logout} />;
  }
  if (path !== '/minhas-casinhas') return <Redirect to="/minhas-casinhas" />;

  const firstName = session?.user.user_metadata?.first_name || 'amigo';
  return <MyHousesPage firstName={firstName} email={session?.user.email} houses={houses} notice={notice} error={error} onDismissNotice={() => setNotice(null)} onOpen={openHouse} onCreate={createNewHouse} onDelete={removeHouse} onLogout={logout} />;
}

function Shell({ children }: { children: ReactNode }) {
  return <main className="flex min-h-dvh items-center justify-center bg-stone-50 px-4 py-10 font-admin text-stone-900">{children}</main>;
}

function Card({ children, onSubmit }: { children: ReactNode; onSubmit?: (event: FormEvent) => void }) {
  const className = 'flex w-full max-w-sm flex-col gap-5 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm';
  return onSubmit ? <form className={className} onSubmit={onSubmit} noValidate>{children}</form> : <div className={className}>{children}</div>;
}

function ErrorPage({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <Shell><Card><p role="alert" className="text-sm text-red-800">{message}</p><button type="button" className="self-start text-sm underline" onClick={onRetry}>Tentar novamente</button></Card></Shell>;
}

function AccessDenied({ message = 'Esta casinha não existe ou não pertence à sua conta.' }: { message?: string }) {
  return (
    <Shell>
      <Card>
        <h1 className="text-xl font-bold">Acesso negado</h1>
        <p className="text-sm leading-relaxed text-stone-600">{message}</p>
        <button type="button" className="rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-stone-700" onClick={() => navigate('/minhas-casinhas')}>Ir para minhas casinhas</button>
      </Card>
    </Shell>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium">
      {label}
      {children}
      {error && <span className="text-xs font-normal text-red-700">{error}</span>}
    </label>
  );
}

const inputClass = (invalid?: boolean) => `rounded-lg border px-3 py-2 font-normal outline-none focus:border-rose-500 ${invalid ? 'border-red-400' : 'border-stone-300'}`;

function PasswordInput({ value, onChange, autoComplete, invalid, id }: { value: string; onChange: (value: string) => void; autoComplete: string; invalid?: boolean; id?: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="flex gap-2">
      <input id={id} type={visible ? 'text' : 'password'} autoComplete={autoComplete} value={value} onChange={(event) => onChange(event.target.value)} aria-invalid={invalid || undefined} className={`min-w-0 flex-1 ${inputClass(invalid)}`} />
      <button type="button" className="rounded-lg border border-stone-200 px-2.5 text-xs" aria-pressed={visible} onClick={() => setVisible((v) => !v)}>{visible ? 'Ocultar' : 'Mostrar'}</button>
    </div>
  );
}

/** Botão de reenviar confirmação com espera entre envios. */
function ResendButton({ email }: { email: string }) {
  const [wait, setWait] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => {
    if (!wait) return;
    const timer = window.setTimeout(() => setWait((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [wait]);
  const resend = async () => {
    setMessage(null);
    try {
      await resendConfirmation(email);
      setMessage('Se houver uma confirmação pendente para este e-mail, enviamos um novo link.');
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'Não foi possível reenviar agora.');
    }
    setWait(60);
  };
  return (
    <div className="flex flex-col gap-1.5 text-sm">
      <button type="button" disabled={wait > 0 || !EMAIL_PATTERN.test(email)} className="self-start underline disabled:no-underline disabled:opacity-50" onClick={() => void resend()}>
        {wait > 0 ? `Reenviar confirmação em ${wait}s` : 'Reenviar e-mail de confirmação'}
      </button>
      {message && <span role="status" className="text-stone-600">{message}</span>}
    </div>
  );
}

function AuthPage({ mode, notice, linkError, onNotice }: { mode: AuthMode; notice: string | null; linkError: string | null; onNotice: (value: string | null) => void }) {
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(linkError);
  const [errors, setErrors] = useState<{ firstName?: string; email?: string; password?: string }>({});
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  useEffect(() => {
    setErrors({});
    setError(linkError);
    setNeedsConfirmation(false);
    setSentTo(null);
  }, [mode, linkError]);

  const validate = () => {
    const next: typeof errors = {};
    const name = firstName.trim();
    if (mode === 'signup' && (name.length < 2 || name.length > 50)) next.firstName = 'Use entre 2 e 50 caracteres.';
    if (!EMAIL_PATTERN.test(email.trim())) next.email = 'Informe um e-mail válido.';
    if (mode === 'signup' && password.length < 8) next.password = 'A senha precisa ter pelo menos 8 caracteres.';
    if (mode === 'login' && !password) next.password = 'Informe sua senha.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setNeedsConfirmation(false);
    onNotice(null);
    if (!validate()) return;
    setBusy(true);
    const cleanEmail = email.trim();
    try {
      if (mode === 'signup') {
        const result = await signUp(firstName.trim(), cleanEmail, password);
        if (result.needsEmailConfirmation) setSentTo(cleanEmail);
      } else if (mode === 'recovery') {
        await requestPasswordReset(cleanEmail);
        setSentTo(cleanEmail);
      } else {
        await signIn(cleanEmail, password);
      }
    } catch (cause) {
      if (cause instanceof AuthError && cause.code === 'email_not_confirmed') setNeedsConfirmation(true);
      // Recuperação sempre responde igual, exista ou não a conta (exceto excesso de tentativas).
      if (mode === 'recovery' && !(cause instanceof AuthError && cause.code === 'rate_limited')) setSentTo(cleanEmail);
      else setError(cause instanceof Error ? cause.message : 'Não foi possível concluir a operação.');
    } finally {
      setBusy(false);
    }
  };

  if (sentTo) {
    return (
      <Shell>
        <Card>
          <div>
            <p className="text-xs font-semibold tracking-[.08em] text-rose-700 uppercase">Casinha</p>
            <h1 className="mt-1 text-2xl font-bold">Confira seu e-mail</h1>
          </div>
          <p className="text-sm leading-relaxed text-stone-600">
            {mode === 'signup'
              ? <>Se for possível criar a conta para <b>{sentTo}</b>, você receberá um link de confirmação. Ele vale por tempo limitado.</>
              : <>Se houver uma conta para <b>{sentTo}</b>, enviaremos as instruções para criar uma nova senha.</>}
          </p>
          {mode === 'signup' && <ResendButton email={sentTo} />}
          <button type="button" className="self-start text-sm underline" onClick={() => navigate('/login')}>Voltar para o login</button>
        </Card>
      </Shell>
    );
  }

  const title = mode === 'signup' ? 'Crie sua conta' : mode === 'recovery' ? 'Recupere sua senha' : 'Entre na sua casinha';
  const subtitle = mode === 'recovery' ? 'Informe seu e-mail e enviaremos um link para criar uma nova senha.' : 'Um cantinho só seu, protegido e fácil de compartilhar.';
  return (
    <Shell>
      <Card onSubmit={submit}>
        <div>
          <p className="text-xs font-semibold tracking-[.08em] text-rose-700 uppercase">Casinha</p>
          <h1 className="mt-1 text-2xl font-bold">{title}</h1>
          <p className="mt-2 text-sm leading-relaxed text-stone-600">{subtitle}</p>
        </div>
        {mode === 'signup' && (
          <Field label="Primeiro nome" error={errors.firstName}>
            <input autoComplete="given-name" maxLength={50} value={firstName} onChange={(event) => setFirstName(event.target.value)} aria-invalid={!!errors.firstName || undefined} className={inputClass(!!errors.firstName)} />
          </Field>
        )}
        <Field label="E-mail" error={errors.email}>
          <input type="email" autoComplete="email" inputMode="email" value={email} onChange={(event) => setEmail(event.target.value)} aria-invalid={!!errors.email || undefined} className={inputClass(!!errors.email)} />
        </Field>
        {mode !== 'recovery' && (
          <Field label="Senha" error={errors.password}>
            <PasswordInput value={password} onChange={setPassword} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} invalid={!!errors.password} />
            {mode === 'signup' && !errors.password && <span className="text-xs font-normal text-stone-500">Mínimo de 8 caracteres.</span>}
          </Field>
        )}
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        {needsConfirmation && <ResendButton email={email.trim()} />}
        {notice && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
        <button type="submit" disabled={busy} className="rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-stone-700 disabled:opacity-50">
          {busy ? 'Aguarde…' : mode === 'signup' ? 'Criar conta' : mode === 'recovery' ? 'Enviar instruções' : 'Entrar'}
        </button>
        <div className="flex flex-wrap justify-between gap-2 text-sm text-stone-600">
          {mode === 'login' && <button type="button" className="underline" onClick={() => navigate('/recuperar-senha')}>Esqueci minha senha</button>}
          {mode === 'recovery' && <button type="button" className="underline" onClick={() => navigate('/login')}>Voltar para o login</button>}
          {mode !== 'recovery' && <button type="button" className="underline" onClick={() => navigate(mode === 'signup' ? '/login' : '/cadastro')}>{mode === 'signup' ? 'Já tenho conta' : 'Criar conta'}</button>}
        </div>
      </Card>
    </Shell>
  );
}

function RecoveryPage({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(hasRecoveryToken() ? null : 'O link de recuperação expirou ou é inválido. Solicite um novo.');
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (password.length < 8) return setError('A senha precisa ter pelo menos 8 caracteres.');
    setBusy(true);
    setError(null);
    try {
      await updatePassword(password);
      onDone();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível trocar a senha.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Shell>
      <Card onSubmit={submit}>
        <h1 className="text-2xl font-bold">Criar nova senha</h1>
        <Field label="Nova senha">
          <PasswordInput value={password} onChange={setPassword} autoComplete="new-password" invalid={!!error} />
          <span className="text-xs font-normal text-stone-500">Mínimo de 8 caracteres.</span>
        </Field>
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        <button type="submit" disabled={busy || !hasRecoveryToken()} className="rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-stone-700 disabled:opacity-50">{busy ? 'Salvando…' : 'Salvar nova senha'}</button>
        <button type="button" className="self-start text-sm underline" onClick={() => navigate('/recuperar-senha')}>Solicitar novo link</button>
      </Card>
    </Shell>
  );
}
