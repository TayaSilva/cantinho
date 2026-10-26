import { Upload } from 'tus-js-client';

export const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, '');
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
export const SUPABASE_BUCKET = (import.meta.env.VITE_SUPABASE_BUCKET as string | undefined) || 'casinha-media';
export const CASINHA_ID = (import.meta.env.VITE_CASINHA_ID as string | undefined) || '00000000-0000-0000-0000-000000000001';
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
  if (!response.ok) throw new Error(typeof data.msg === 'string' ? data.msg : 'Não foi possível trocar a senha.');
  window.history.replaceState({}, document.title, `${window.location.pathname}${window.location.search}`);
}

export interface AuthSession {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: { id: string; email?: string };
}

function readSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as AuthSession) : null;
  } catch {
    return null;
  }
}

function writeSession(session: AuthSession | null) {
  if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  else localStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new Event('casinha:auth-changed'));
}

async function authRequest(path: string, body: Record<string, string>) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error('Autenticação cloud não configurada.');
  const response = await fetch(`${SUPABASE_URL}/auth/v1/${path}`, {
    method: 'POST',
    headers: { apikey: SUPABASE_ANON_KEY, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) throw new Error(typeof data.msg === 'string' ? data.msg : typeof data.error_description === 'string' ? data.error_description : 'Não foi possível entrar.');
  return data;
}

function sessionFromResponse(data: Record<string, unknown>): AuthSession {
  const user = data.user as { id?: string; email?: string } | undefined;
  const accessToken = typeof data.access_token === 'string' ? data.access_token : '';
  const refreshToken = typeof data.refresh_token === 'string' ? data.refresh_token : '';
  const expiresIn = typeof data.expires_in === 'number' ? data.expires_in : 3600;
  if (!accessToken || !refreshToken || !user?.id) throw new Error('Resposta de autenticação inválida.');
  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_at: Math.floor(Date.now() / 1000) + expiresIn,
    user: { id: user.id, email: user.email },
  };
}

export async function signIn(email: string, password: string): Promise<AuthSession> {
  const session = sessionFromResponse(await authRequest('token?grant_type=password', { email, password }));
  writeSession(session);
  return session;
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
