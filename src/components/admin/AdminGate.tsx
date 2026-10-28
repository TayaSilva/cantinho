import { useEffect, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { MyHousesPage } from '../account/MyHousesPage';
import { SettingsPage } from '../account/SettingsPage';
import { AdminApp } from './AdminApp';
import { AuthBackdrop, GlassAlert, GlassButton, GlassCard, GlassField, GlassHeader, GlassInput, GlassLink, GlassPasswordInput, PixelHeart } from './AuthBackdrop';
import { cx } from './controls';
import { AuthError, clearRecoveryToken, cloudConfigured, consumeAuthRedirect, deleteAccount, getSession, RecoveryLinkError, requestPasswordReset, resendConfirmation, signIn, signOut, signUp, takeRecoveryLink, updatePassword, verifyRecoveryLink, verifySignupCode, type AuthSession } from '../../services/auth';
import { createHouse, deleteHouse, getActiveHouseId, houseAdminPath, listHouses, setActiveHouseId, type HouseSummary } from '../../services/houses';
import { navigate } from '../../hooks/useRoute';

type AuthMode = 'login' | 'signup' | 'recovery';

const AUTH_PATHS = ['/login', '/cadastro', '/recuperar-senha'];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Login que, depois de entrar, volta para `target`. */
export function loginPath(target: string) {
  return `/login?next=${encodeURIComponent(target)}`;
}

/** Destino pós-login vindo de ?next=; só aceita caminhos internos (evita open redirect). */
function safeNext(): string {
  const next = new URLSearchParams(window.location.search).get('next') || '';
  if (!next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return '/meus-cantinhos';
  const nextPath = next.split(/[?#]/)[0];
  return AUTH_PATHS.includes(nextPath) || nextPath === '/redefinir-senha' ? '/meus-cantinhos' : next;
}

/** Mantém o ?next= ao trocar entre login e cadastro. */
function withNext(path: string) {
  const next = new URLSearchParams(window.location.search).get('next');
  return next ? `${path}?next=${encodeURIComponent(next)}` : path;
}

/** Troca a URL sem criar entrada no histórico (redirecionamentos). */
export function Redirect({ to }: { to: string }) {
  useEffect(() => {
    window.history.replaceState({}, '', to);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, [to]);
  return <Loading />;
}

function Loading({ label = 'Carregando acesso…' }: { label?: string }) {
  return <main className="flex min-h-dvh items-center justify-center bg-stone-50 font-admin text-sm text-stone-600" aria-busy="true">{label}</main>;
}

/** /admin/cantinho/:id/resto → { id, sub } */
function parseHousePath(path: string): { id: string; sub: string } | null {
  const match = /^\/admin\/(?:cantinho|casinha)\/([^/]+)(\/.*)?$/.exec(path);
  return match ? { id: decodeURIComponent(match[1]), sub: match[2] || '/editor' } : null;
}

/**
 * Porta de entrada das áreas autenticadas: login, cadastro, recuperação de senha,
 * /meus-cantinhos e o Backoffice de cada cantinho (/admin/cantinho/:id).
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
  // Lido uma vez: o token do link sai da URL e fica só em memória (ver takeRecoveryLink).
  const [recovery, setRecovery] = useState(takeRecoveryLink);
  // Segura o login na tela por um instante para mostrar "Que bom ter você de volta!".
  const [welcome, setWelcome] = useState(false);

  const refreshHouses = async () => {
    setError(null);
    try {
      setHouses(await listHouses());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar seus cantinhos.');
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
    if (path === '/meus-cantinhos' && lastPath.current !== path && (session || !cloudConfigured)) void refreshHouses();
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
  const deleteMyAccount = cloudConfigured
    ? async () => {
        await deleteAccount();
        setNotice('Sua conta foi excluída.');
        navigate('/login');
      }
    : undefined;

  if (path === '/redefinir-senha' || recovery.token) {
    // Link de recuperação que caiu em outra rota (Site URL): mostra o endereço certo.
    if (path !== '/redefinir-senha') return <Redirect to="/redefinir-senha" />;
    return (
      <RecoveryPage
        linkError={recovery.error}
        onLeave={() => setRecovery({ token: false })}
        onDone={() => { setRecovery({ token: false }); setNotice('Senha alterada. Entre com sua nova senha.'); navigate('/login'); }}
      />
    );
  }
  if (loading) return <Loading />;
  if (cloudConfigured && (!session || welcome)) {
    // Rotas privadas nunca mostram o login no próprio endereço: vão para /login e voltam depois.
    if (!session && !AUTH_PATHS.includes(path)) return <Redirect to={loginPath(path + window.location.search)} />;
    const mode: AuthMode = path === '/cadastro' ? 'signup' : path === '/recuperar-senha' ? 'recovery' : 'login';
    return <AuthPage mode={mode} notice={notice} linkError={linkError} onNotice={setNotice} onWelcome={setWelcome} />;
  }
  if (AUTH_PATHS.includes(path)) return <Redirect to={safeNext()} />;
  if (!houses) {
    return error ? <ErrorPage message={error} onRetry={() => void refreshHouses()} /> : <Loading label="Carregando seus cantinhos…" />;
  }

  if (path === '/configuracoes') return <SettingsPage email={session?.user.email} />;
  if (path === '/meu-cantinho') {
    const active = getActiveHouseId(houses);
    return <Redirect to={active ? houseAdminPath(active) : '/meus-cantinhos'} />;
  }

  // Rotas antigas (/admin, /admin/editor, /admin/conteudos/*) apontam para o cantinho ativo.
  if (path === '/admin/editor' || path.startsWith('/admin/conteudos')) {
    const active = getActiveHouseId(houses);
    return <Redirect to={active ? houseAdminPath(active, path.slice('/admin'.length)) : '/meus-cantinhos'} />;
  }

  const firstName = session?.user.user_metadata?.first_name || 'amigo';
  const target = parseHousePath(path);
  if (target) {
    const house = houses.find((item) => item.house_id === target.id);
    if (!house) return <AccessDenied />;
    if (house.role !== 'owner') return <AccessDenied message="Você foi convidado para este cantinho, mas apenas o dono pode editá-lo." />;
    return <AdminApp key={house.house_id} path={target.sub} house={house} houses={houses.filter((item) => item.role === 'owner')} firstName={firstName} email={session?.user.email} onHouseChange={openHouse} onLogout={logout} onDeleteAccount={deleteMyAccount} />;
  }
  if (path !== '/meus-cantinhos') return <Redirect to="/meus-cantinhos" />;
  return <MyHousesPage firstName={firstName} email={session?.user.email} houses={houses} notice={notice} error={error} onDismissNotice={() => setNotice(null)} onOpen={openHouse} onCreate={createNewHouse} onDelete={removeHouse} onLogout={logout} onDeleteAccount={deleteMyAccount} />;
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

function AccessDenied({ message = 'Este cantinho não existe ou não pertence à sua conta.' }: { message?: string }) {
  return (
    <Shell>
      <Card>
        <h1 className="text-xl font-bold">Acesso negado</h1>
        <p className="text-sm leading-relaxed text-stone-600">{message}</p>
        <button type="button" className="rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-stone-700" onClick={() => navigate('/meus-cantinhos')}>Ir para meus cantinhos</button>
      </Card>
    </Shell>
  );
}

type FieldErrors = { firstName?: string; email?: string; password?: string };

/** Regras e mensagens da SPEC do login; no cadastro a senha pede 8 caracteres. */
function validate(mode: AuthMode, firstName: string, email: string, password: string): FieldErrors {
  const errors: FieldErrors = {};
  const name = firstName.trim();
  const cleanEmail = email.trim();
  if (mode === 'signup' && (name.length < 2 || name.length > 50)) errors.firstName = 'Use entre 2 e 50 caracteres.';
  if (!cleanEmail) errors.email = 'Digite seu e-mail.';
  else if (!EMAIL_PATTERN.test(cleanEmail)) errors.email = 'Esse e-mail não parece válido.';
  if (mode !== 'recovery') {
    const min = mode === 'signup' ? 8 : 6;
    if (!password) errors.password = 'Digite sua senha.';
    else if (password.length < min) errors.password = mode === 'signup' ? 'A senha precisa ter pelo menos 8 caracteres.' : 'A senha tem pelo menos 6 caracteres.';
  }
  return errors;
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
      <GlassLink disabled={wait > 0 || !EMAIL_PATTERN.test(email)} className="self-start" onClick={() => void resend()}>
        {wait > 0 ? `Reenviar confirmação em ${wait}s` : 'Reenviar e-mail de confirmação'}
      </GlassLink>
      {message && <span role="status" className="text-login-muted">{message}</span>}
    </div>
  );
}

function AuthPage({ mode, notice, linkError, onNotice, onWelcome }: { mode: AuthMode; notice: string | null; linkError: string | null; onNotice: (value: string | null) => void; onWelcome: (value: boolean) => void }) {
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(linkError);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [confirmEmail, setConfirmEmail] = useState<string | null>(null);

  useEffect(() => {
    setTried(false);
    setError(linkError);
    setNeedsConfirmation(false);
    setSentTo(null);
    setConfirmEmail(null);
  }, [mode, linkError]);

  // Avisos ("Sua conta foi excluída.", "E-mail confirmado!") valem só para a tela em que
  // chegaram: ao trocar entre login, cadastro e recuperação, somem.
  const firstMode = useRef(mode);
  useEffect(() => {
    if (mode !== firstMode.current) onNotice(null);
  }, [mode, onNotice]);

  // Nada fica vermelho antes do primeiro envio; depois, os erros acompanham a digitação.
  const errors = tried ? validate(mode, firstName, email, password) : {};

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setTried(true);
    setError(null);
    setNeedsConfirmation(false);
    onNotice(null);
    if (Object.keys(validate(mode, firstName, email, password)).length) return;
    setBusy(true);
    const cleanEmail = email.trim();
    try {
      if (mode === 'signup') {
        const result = await signUp(firstName.trim(), cleanEmail, password);
        if (result.needsEmailConfirmation) setConfirmEmail(cleanEmail);
      } else if (mode === 'recovery') {
        await requestPasswordReset(cleanEmail);
        setSentTo(cleanEmail);
      } else {
        onWelcome(true);
        await signIn(cleanEmail, password, remember);
        setDone(true);
        window.setTimeout(() => onWelcome(false), 600);
      }
    } catch (cause) {
      if (mode === 'login') onWelcome(false);
      if (cause instanceof AuthError && cause.code === 'email_not_confirmed') setNeedsConfirmation(true);
      // Recuperação sempre responde igual, exista ou não a conta (exceto excesso de tentativas).
      if (mode === 'recovery' && !(cause instanceof AuthError && cause.code === 'rate_limited')) setSentTo(cleanEmail);
      else setError(cause instanceof Error ? cause.message : 'Não foi possível concluir a operação.');
    } finally {
      setBusy(false);
    }
  };

  if (confirmEmail) return <ConfirmCodePage email={confirmEmail} onConfirmed={() => onNotice('E-mail confirmado! Sua conta está pronta.')} onBack={() => { setConfirmEmail(null); navigate(withNext('/login')); }} />;

  if (done) {
    return (
      <AuthBackdrop>
        <GlassCard>
          <div role="status" className="flex flex-col items-center gap-3 py-6 text-center">
            <PixelHeart size={56} />
            <p className="mt-2 text-2xl font-bold">Que bom ter você de volta!</p>
            <p className="text-[15px] text-login-muted">Abrindo o cantinho…</p>
          </div>
        </GlassCard>
      </AuthBackdrop>
    );
  }

  if (sentTo) {
    return (
      <AuthBackdrop>
        <GlassCard>
          <GlassHeader title="Confira seu e-mail">
            Se houver uma conta para <b className="text-login-text">{sentTo}</b>, enviaremos as instruções para criar uma nova senha.
          </GlassHeader>
          <GlassLink className="self-start text-sm" onClick={() => navigate('/login')}>Voltar para o login</GlassLink>
        </GlassCard>
      </AuthBackdrop>
    );
  }

  const title = mode === 'signup' ? 'Crie sua conta' : mode === 'recovery' ? 'Recupere sua senha' : 'Entre no seu cantinho';
  const subtitle = mode === 'signup' ? 'Um cantinho só seu, protegido e fácil de compartilhar.' : mode === 'recovery' ? 'Informe seu e-mail e enviaremos um link para criar uma nova senha.' : 'Use o e-mail e a senha da sua conta para continuar.';
  const busyLabel = mode === 'signup' ? 'Criando conta…' : mode === 'recovery' ? 'Enviando…' : 'Entrando…';
  return (
    <AuthBackdrop>
      <GlassCard onSubmit={submit}>
        <GlassHeader title={title}>{subtitle}</GlassHeader>
        <div className="flex flex-col gap-[18px]">
          {mode === 'signup' && (
            <GlassField id="nome" label="Primeiro nome" error={errors.firstName}>
              <GlassInput id="nome" autoComplete="given-name" maxLength={50} placeholder="Como podemos te chamar?" value={firstName} onValue={setFirstName} error={errors.firstName} />
            </GlassField>
          )}
          <GlassField id="email" label="E-mail" error={errors.email}>
            <GlassInput id="email" type="email" autoComplete="email" inputMode="email" placeholder="voce@email.com" value={email} onValue={setEmail} error={errors.email} />
          </GlassField>
          {mode !== 'recovery' && (
            <GlassField
              id="senha"
              label="Senha"
              error={errors.password}
              hint={mode === 'signup' ? 'Mínimo de 8 caracteres.' : undefined}
              aside={mode === 'login' && <GlassLink className="text-[13px]" onClick={() => navigate('/recuperar-senha')}>Esqueci minha senha</GlassLink>}
            >
              <GlassPasswordInput id="senha" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} placeholder={mode === 'signup' ? 'Crie uma senha' : 'Sua senha'} value={password} onValue={setPassword} error={errors.password} />
            </GlassField>
          )}
          {mode === 'login' && (
            <label className="login-check flex w-fit cursor-pointer items-center gap-3 text-sm">
              <input type="checkbox" className="sr-only" checked={remember} onChange={(event) => setRemember(event.target.checked)} />
              <span aria-hidden="true" className={cx('flex size-5 items-center justify-center rounded-md border', remember ? 'border-login-primary bg-login-primary' : 'border-white/30 bg-[#FFF8EE]/[.08]')}>
                {remember && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 6.2l2.3 2.3 4.7-5" /></svg>
                )}
              </span>
              Manter conectado
            </label>
          )}
        </div>
        {(error || needsConfirmation || notice) && (
          <div className="flex flex-col gap-3">
            {error && <GlassAlert>{error}</GlassAlert>}
            {needsConfirmation && (
              <div className="flex flex-col gap-1.5">
                <GlassLink className="self-start text-sm" onClick={() => setConfirmEmail(email.trim())}>Digitar código de confirmação</GlassLink>
                <ResendButton email={email.trim()} />
              </div>
            )}
            {notice && <GlassAlert tone="info">{notice}</GlassAlert>}
          </div>
        )}
        <GlassButton disabled={busy} loading={busy}>
          {busy ? busyLabel : mode === 'signup' ? 'Criar conta' : mode === 'recovery' ? 'Enviar instruções' : 'Entrar'}
        </GlassButton>
        <p className="text-center text-sm text-login-muted">
          {mode === 'login' && <>Ainda não tem um cantinho? <GlassLink onClick={() => navigate(withNext('/cadastro'))}>Criar conta</GlassLink></>}
          {mode === 'signup' && <>Já tem um cantinho? <GlassLink onClick={() => navigate(withNext('/login'))}>Entrar</GlassLink></>}
          {mode === 'recovery' && <>Lembrou a senha? <GlassLink onClick={() => navigate('/login')}>Voltar para o login</GlassLink></>}
        </p>
      </GlassCard>
    </AuthBackdrop>
  );
}

/** Tela pós-cadastro: confirma a conta com o código de 6 dígitos do e-mail. */
function ConfirmCodePage({ email, onConfirmed, onBack }: { email: string; onConfirmed: () => void; onBack: () => void }) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(code)) return setError('Digite os 6 dígitos do código.');
    setBusy(true);
    setError(null);
    try {
      // A sessão gravada dispara casinha:auth-changed e o AdminGate leva para /meus-cantinhos.
      await verifySignupCode(email, code);
      onConfirmed();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível confirmar o código.');
      setBusy(false);
    }
  };
  return (
    <AuthBackdrop>
      <GlassCard onSubmit={submit}>
        <GlassHeader title="Confira seu e-mail">
          Se for possível criar a conta para <b className="text-login-text">{email}</b>, você receberá um código de 6 dígitos. Digite-o abaixo; ele vale por tempo limitado.
        </GlassHeader>
        <GlassField id="codigo" label="Código de confirmação" error={error ?? undefined} hint="Ao reenviar, o código anterior deixa de valer.">
          <GlassInput id="codigo" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="000000" value={code} onValue={(value) => setCode(value.replace(/\D/g, ''))} error={error ?? undefined} className="tracking-[.3em]" />
        </GlassField>
        <GlassButton disabled={busy} loading={busy}>{busy ? 'Confirmando…' : 'Confirmar'}</GlassButton>
        <div className="flex flex-col gap-3">
          <ResendButton email={email} />
          <GlassLink className="self-start text-sm" onClick={onBack}>Voltar para o login</GlassLink>
        </div>
      </GlassCard>
    </AuthBackdrop>
  );
}

function validateNewPassword(password: string, confirm: string): { password?: string; confirm?: string } {
  const errors: { password?: string; confirm?: string } = {};
  if (password.length < 8) errors.password = 'A senha precisa ter pelo menos 8 caracteres.';
  if (!confirm) errors.confirm = 'Confirme a nova senha.';
  else if (confirm !== password) errors.confirm = 'As senhas não coincidem.';
  return errors;
}

/**
 * Nova senha. O formulário só aparece depois que o Supabase confirma o token do link;
 * sem link (URL digitada, F5, outra aba), vencido ou falso, nenhum campo de senha é mostrado.
 */
function RecoveryPage({ linkError, onLeave, onDone }: { linkError?: string; onLeave: () => void; onDone: () => void }) {
  const [state, setState] = useState<'checking' | 'invalid' | 'form'>('checking');
  const [invalidReason, setInvalidReason] = useState<string | undefined>(linkError);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void verifyRecoveryLink().then((valid) => {
      if (alive) setState(valid ? 'form' : 'invalid');
    });
    return () => { alive = false; };
  }, []);

  const leave = (to: string) => {
    clearRecoveryToken();
    onLeave();
    navigate(to);
  };

  const errors = tried ? validateNewPassword(password, confirm) : {};

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setTried(true);
    setError(null);
    if (Object.keys(validateNewPassword(password, confirm)).length) return;
    setBusy(true);
    try {
      await updatePassword(password);
      onDone();
    } catch (cause) {
      if (cause instanceof RecoveryLinkError) {
        setInvalidReason(cause.message);
        setState('invalid');
      } else {
        setError(cause instanceof Error ? cause.message : 'Não foi possível trocar a senha.');
      }
    } finally {
      setBusy(false);
    }
  };

  if (state === 'checking') {
    return (
      <AuthBackdrop>
        <GlassCard>
          <div role="status" className="flex flex-col items-center gap-4 py-6 text-center">
            <span className="login-spinner" aria-hidden="true" />
            <p className="text-[15px] text-login-muted">Verificando seu link…</p>
          </div>
        </GlassCard>
      </AuthBackdrop>
    );
  }

  if (state === 'invalid') {
    return (
      <AuthBackdrop>
        <GlassCard>
          <GlassHeader title="Link inválido ou expirado">
            Por segurança, a senha só pode ser trocada pelo link enviado ao seu e-mail. Peça um novo link para continuar.
          </GlassHeader>
          {invalidReason && <GlassAlert>{invalidReason}</GlassAlert>}
          <GlassButton type="button" onClick={() => leave('/recuperar-senha')}>Solicitar novo link</GlassButton>
          <p className="text-center text-sm text-login-muted">
            Lembrou a senha? <GlassLink onClick={() => leave('/login')}>Voltar para o login</GlassLink>
          </p>
        </GlassCard>
      </AuthBackdrop>
    );
  }

  return (
    <AuthBackdrop>
      <GlassCard onSubmit={submit}>
        <GlassHeader title="Criar nova senha">Escolha uma senha nova para entrar no seu cantinho.</GlassHeader>
        <div className="flex flex-col gap-[18px]">
          <GlassField id="nova-senha" label="Nova senha" error={errors.password} hint="Mínimo de 8 caracteres.">
            <GlassPasswordInput id="nova-senha" autoComplete="new-password" placeholder="Crie uma senha" value={password} onValue={setPassword} error={errors.password} />
          </GlassField>
          <GlassField id="confirmar-senha" label="Confirmar nova senha" error={errors.confirm}>
            <GlassPasswordInput id="confirmar-senha" autoComplete="new-password" placeholder="Repita a senha" value={confirm} onValue={setConfirm} error={errors.confirm} />
          </GlassField>
        </div>
        {error && <GlassAlert>{error}</GlassAlert>}
        <GlassButton disabled={busy} loading={busy}>{busy ? 'Salvando…' : 'Salvar nova senha'}</GlassButton>
        <p className="text-center text-sm text-login-muted">
          Lembrou a senha? <GlassLink onClick={() => leave('/login')}>Voltar para o login</GlassLink>
        </p>
      </GlassCard>
    </AuthBackdrop>
  );
}
