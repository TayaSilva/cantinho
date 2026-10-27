import { Upload } from 'tus-js-client';

export const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, '');
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
export const SUPABASE_BUCKET = (import.meta.env.VITE_SUPABASE_BUCKET as string | undefined) || 'casinha-media';
export const cloudConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

const SESSION_KEY = 'casinha:supabase-session';

export function hasRecoveryToken(): boolean {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  return params.get('type') === 'recovery' && Boolean(params.get('access_token'));
}

export async function updatePassword(password: string): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error('Autenticação cloud não configurada.');
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const accessToken = params.get('access_token');
  if (!accessToken) throw new Error('O link de recuperação expirou ou é inválido.');
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    method: 'PUT',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ password }),
  });
  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (response.status === 401 || response.status === 403) throw new Error('O link de recuperação expirou ou é inválido.');
  if (!response.ok) throw authError(response.status, data);
  window.history.replaceState({}, document.title, `${window.location.pathname}${window.location.search}`);
  // Encerra a sessão temporária de recuperação; o usuário volta ao login.
  await fetch(`${SUPABASE_URL}/auth/v1/logout`, { method: 'POST', headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${accessToken}` } }).catch(() => undefined);
  writeSession(null);
}

export interface AuthSession {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: { id: string; email?: string; user_metadata?: { first_name?: string } };
}

export interface AuthProfile {
  id: string;
  firstName: string;
  email?: string;
}

function readSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY) ?? sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as AuthSession) : null;
  } catch {
    return null;
  }
}

/**
 * "Manter conectado" grava no localStorage; desmarcado, no sessionStorage (some ao
 * fechar o navegador). Sem `remember` (refresh, links de e-mail), a sessão fica
 * onde já estava.
 */
function writeSession(session: AuthSession | null, remember?: boolean) {
  try {
    if (session) {
      const persistent = remember ?? sessionStorage.getItem(SESSION_KEY) === null;
      (persistent ? localStorage : sessionStorage).setItem(SESSION_KEY, JSON.stringify(session));
      (persistent ? sessionStorage : localStorage).removeItem(SESSION_KEY);
    } else {
      localStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(SESSION_KEY);
    }
  } catch {
    // Storage bloqueado: a sessão vale só enquanto a página estiver aberta.
  }
  window.dispatchEvent(new Event('casinha:auth-changed'));
}

export type AuthErrorCode = 'invalid_credentials' | 'email_not_confirmed' | 'invalid_code' | 'rate_limited' | 'weak_password' | 'unknown';

export class AuthError extends Error {
  constructor(public code: AuthErrorCode, message: string) {
    super(message);
  }
}

/** Mensagens neutras: nenhuma delas revela se um e-mail está cadastrado. */
function authError(status: number, data: Record<string, unknown>): AuthError {
  const raw = [data.error_code, data.code, data.msg, data.error_description, data.error].filter((v) => typeof v === 'string').join(' ').toLowerCase();
  if (status === 429 || raw.includes('rate limit') || raw.includes('over_')) return new AuthError('rate_limited', 'Muitas tentativas. Aguarde alguns minutos e tente novamente.');
  if (raw.includes('not confirmed') || raw.includes('email_not_confirmed')) return new AuthError('email_not_confirmed', 'Confirme seu e-mail antes de entrar. Se não recebeu o link, podemos reenviar.');
  if (raw.includes('otp_expired') || raw.includes('token has expired')) return new AuthError('invalid_code', 'Código inválido ou expirado. Peça um novo código.');
  if (raw.includes('invalid') && (raw.includes('credentials') || raw.includes('grant'))) return new AuthError('invalid_credentials', 'E-mail ou senha incorretos.');
  if (raw.includes('weak') || raw.includes('password should')) return new AuthError('weak_password', 'Escolha uma senha mais forte, com pelo menos 8 caracteres.');
  return new AuthError('unknown', 'Não foi possível concluir a operação. Tente novamente.');
}

/** Para onde o Supabase manda o usuário depois do e-mail (precisa estar na lista de Redirect URLs do projeto). */
function redirectTo(path: string) {
  return `redirect_to=${encodeURIComponent(`${window.location.origin}${path}`)}`;
}

async function authRequest(path: string, body: Record<string, unknown>) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error('Autenticação cloud não configurada.');
  const response = await fetch(`${SUPABASE_URL}/auth/v1/${path}`, {
    method: 'POST',
    headers: { apikey: SUPABASE_ANON_KEY, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) throw authError(response.status, data);
  return data;
}

function clearHash() {
  window.history.replaceState({}, document.title, `${window.location.pathname}${window.location.search}`);
}

/**
 * Trata o retorno do link de confirmação de e-mail (#access_token=...&type=signup).
 * Links de recuperação ficam para a tela de nova senha. Devolve uma mensagem de erro
 * quando o link veio vencido ou inválido.
 */
export async function consumeAuthRedirect(): Promise<{ error?: string; confirmed?: boolean }> {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  if (params.get('error') || params.get('error_code')) {
    clearHash();
    const expired = (params.get('error_code') || '').includes('expired') || (params.get('error_description') || '').toLowerCase().includes('expired');
    return { error: expired ? 'Este link expirou. Solicite um novo e-mail.' : 'Este link é inválido ou já foi utilizado.' };
  }
  const type = params.get('type');
  const accessToken = params.get('access_token');
  if (!accessToken || type === 'recovery' || !SUPABASE_URL || !SUPABASE_ANON_KEY) return {};
  clearHash();
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${accessToken}` } });
  if (!response.ok) return { error: 'Este link é inválido ou já foi utilizado.' };
  const user = (await response.json()) as Record<string, unknown>;
  writeSession(sessionFromResponse({
    user,
    access_token: accessToken,
    refresh_token: params.get('refresh_token') || '',
    expires_in: Number(params.get('expires_in')) || 3600,
  }));
  return { confirmed: type === 'signup' || type === 'email' };
}

function sessionFromResponse(data: Record<string, unknown>): AuthSession {
  const user = data.user as { id?: string; email?: string; user_metadata?: { first_name?: string } } | undefined;
  const accessToken = typeof data.access_token === 'string' ? data.access_token : '';
  const refreshToken = typeof data.refresh_token === 'string' ? data.refresh_token : '';
  const expiresIn = typeof data.expires_in === 'number' ? data.expires_in : 3600;
  if (!accessToken || !refreshToken || !user?.id) throw new Error('Resposta de autenticação inválida.');
  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_at: Math.floor(Date.now() / 1000) + expiresIn,
    user: { id: user.id, email: user.email, user_metadata: user.user_metadata },
  };
}

export async function signIn(email: string, password: string, remember = true): Promise<AuthSession> {
  const session = sessionFromResponse(await authRequest('token?grant_type=password', { email, password }));
  writeSession(session, remember);
  return session;
}

export async function signUp(firstName: string, email: string, password: string): Promise<{ session: AuthSession | null; needsEmailConfirmation: boolean }> {
  const data = await authRequest(`signup?${redirectTo('/meus-cantinhos')}`, {
    email,
    password,
    data: { first_name: firstName },
  });
  const session = data.access_token ? sessionFromResponse(data) : null;
  if (session) writeSession(session);
  return { session, needsEmailConfirmation: !session };
}

/** Confirma o cadastro com o código de 6 dígitos enviado por e-mail ({{ .Token }} no template). */
export async function verifySignupCode(email: string, code: string): Promise<AuthSession> {
  const session = sessionFromResponse(await authRequest('verify', { type: 'signup', email, token: code }));
  writeSession(session);
  return session;
}

export async function resendConfirmation(email: string): Promise<void> {
  await authRequest(`resend?${redirectTo('/meus-cantinhos')}`, { type: 'signup', email });
}

export async function requestPasswordReset(email: string): Promise<void> {
  await authRequest(`recover?${redirectTo('/redefinir-senha')}`, { email });
}

export async function getProfile(): Promise<AuthProfile | null> {
  const session = await getSession();
  if (!session) return null;
  return { id: session.user.id, firstName: session.user.user_metadata?.first_name || 'amigo', email: session.user.email };
}

export async function signOut() {
  const session = readSession();
  if (SUPABASE_URL && SUPABASE_ANON_KEY && session) {
    await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
      method: 'POST',
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${session.access_token}` },
    }).catch(() => undefined);
  }
  writeSession(null);
}

/** Exclui a conta e todos os cantinhos dela (o servidor confere a sessão e o "EXCLUIR"). */
export async function deleteAccount(): Promise<void> {
  const response = await authFetch('/api/me/account', {
    method: 'DELETE',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ confirm: 'EXCLUIR' }),
  });
  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error || 'Não foi possível excluir a conta.');
  }
  writeSession(null);
}

export async function getSession(): Promise<AuthSession | null> {
  const session = readSession();
  if (!session) return null;
  if (session.expires_at > Math.floor(Date.now() / 1000) + 60) return session;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !session.refresh_token) {
    writeSession(null);
    return null;
  }
  try {
    const data = await authRequest('token?grant_type=refresh_token', { refresh_token: session.refresh_token });
    const renewed = sessionFromResponse(data);
    writeSession(renewed);
    return renewed;
  } catch {
    writeSession(null);
    return null;
  }
}

export async function authFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  const session = await getSession();
  if (session) headers.set('Authorization', `Bearer ${session.access_token}`);
  return fetch(input, { ...init, headers });
}

export async function getDefaultHouseId(): Promise<string> {
  const response = await authFetch('/api/me/houses', { cache: 'no-store' });
  const data = (await response.json().catch(() => [])) as Array<{ house_id?: string }>;
  if (!response.ok || !data[0]?.house_id) throw new Error('Sua conta ainda não possui um cantinho.');
  return data[0].house_id;
}

export async function uploadToCloud(path: string, file: Blob): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error('Storage cloud não configurado.');
  const session = await getSession();
  if (!session) throw new Error('Faça login para enviar arquivos.');
  if (file.size > 6 * 1024 * 1024) {
    await new Promise<void>((resolve, reject) => {
      const upload = new Upload(file, {
        endpoint: `${SUPABASE_URL}/storage/v1/upload/resumable`,
        retryDelays: [0, 1000, 3000, 5000, 10000],
        chunkSize: 6 * 1024 * 1024,
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${session.access_token}` },
        metadata: { bucketName: SUPABASE_BUCKET, objectName: path, contentType: file.type || 'application/octet-stream' },
        uploadSize: file.size,
        onError: reject,
        onSuccess: () => resolve(),
      });
      upload.start();
    });
    return;
  }

  const response = await fetch(`${SUPABASE_URL}/storage/v1/object/${SUPABASE_BUCKET}/${path}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${session.access_token}`,
      'content-type': file.type || 'application/octet-stream',
      'x-upsert': 'false',
    },
    body: file,
  });
  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { message?: string; error?: string };
    throw new Error(data.message || data.error || 'Não foi possível enviar o arquivo.');
  }
}
