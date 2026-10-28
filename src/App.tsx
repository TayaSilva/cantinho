import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { AdminGate, loginPath, Redirect } from './components/admin/AdminGate';
import { HouseScene } from './components/house/HouseScene';
import { isLegalPath, LegalPage } from './components/legal/LegalPage';
import { BookModal } from './components/modals/BookModal';
import { CalendarModal } from './components/modals/CalendarModal';
import { MemoryChestModal } from './components/modals/MemoryChestModal';
import { PhotoModal } from './components/modals/PhotoModal';
import { QuizModal } from './components/modals/QuizModal';
import { RadioModal } from './components/modals/RadioModal';
import { TVModal } from './components/modals/TVModal';
import { AudioControl, AudioProvider, MiniPlayer, useAudio } from './components/ui/AudioControl';
import { Icon, PixelButton } from './components/ui/PixelButton';
import { ShareButton } from './components/ui/ShareButton';
import { getOption, str } from './data/catalog';
import { useHouseModal } from './hooks/useHouseModal';
import { useHouseTime } from './hooks/useHouseTime';
import { navigate, useRoute } from './hooks/useRoute';
import { defaultDocument, loadDraft, loadPublished, STORE_EVENT } from './services/houseStore';
import { cloudConfigured, getSession } from './services/auth';
import type { HouseDocument, Period } from './types/house';

const ZOOM_STEPS = [1, 1.4, 1.8, 2.3];

/** Permite testar períodos pela URL: ?periodo=noite */
function periodFromUrl(search: URLSearchParams): Period | null {
  const p = search.get('periodo');
  return p === 'manha' || p === 'tarde' || p === 'noite' || p === 'madrugada' ? p : null;
}

/** Rotas tratadas pelo AdminGate (login/cadastro públicos; o resto exige sessão lá dentro). */
const GATE_PATHS = ['/login', '/cadastro', '/recuperar-senha', '/redefinir-senha', '/meus-cantinhos', '/minhas-casinhas', '/meu-cantinho', '/configuracoes'];

export default function App() {
  const { path, search } = useRoute();
  if (path === '/admin' || path.startsWith('/admin/') || GATE_PATHS.includes(path)) {
    return <AdminGate path={path === '/admin' ? '/admin/editor' : path} />;
  }
  if (isLegalPath(path)) return <LegalPage path={path} />;
  // Links de e-mail que caíram no Site URL (#error_code=... ou #access_token=...) vão para o login tratar.
  if (/[#&](error_code|access_token)=/.test(window.location.hash)) return <AdminGate path="/login" />;
  const shareToken = path.startsWith('/c/') ? decodeURIComponent(path.slice(3)) : null;
  // Endereço desconhecido: volta para a demo em vez de abrir uma casa qualquer.
  if (path !== '/' && !shareToken) return <Redirect to="/" />;
  const demo = path === '/' && !search.get('house') && search.get('preview') !== 'draft';
  const house = <PublicHouse preview={search.get('preview') === 'draft'} period={periodFromUrl(search)} shareToken={shareToken} houseId={search.get('house') || undefined} demo={demo} />;
  return demo || shareToken ? house : <RequireSession>{house}</RequireSession>;
}

/**
 * Rotas administrativas de casas reais (?house= e ?preview=draft) só abrem com sessão.
 * Links /c/:token são bearers públicos e não passam por este gate.
 */
function RequireSession({ children }: { children: ReactNode }) {
  const [state, setState] = useState<'checking' | 'in' | 'out'>(cloudConfigured ? 'checking' : 'in');
  useEffect(() => {
    if (!cloudConfigured) return;
    let alive = true;
    void getSession()
      .then((session) => alive && setState(session ? 'in' : 'out'))
      .catch(() => alive && setState('out'));
    return () => { alive = false; };
  }, []);
  if (state === 'out') return <Redirect to={loginPath(window.location.pathname + window.location.search)} />;
  if (state === 'checking') return <main className="min-h-dvh bg-night" aria-busy="true" />;
  return children;
}

/**
 * Cantinho público. Lê apenas a versão PUBLICADA — ou o rascunho, quando aberta
 * pelo botão "Pré-visualizar" do Backoffice (?preview=draft).
 */
function PublicHouse({ preview, period, shareToken, houseId, demo }: { preview: boolean; period: Period | null; shareToken: string | null; houseId?: string; demo: boolean }) {
  const [doc, setDoc] = useState<HouseDocument | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () => {
      if (demo) return Promise.resolve(defaultDocument()).then((d) => alive && setDoc(d));
      if (shareToken) return fetch(`/api/public/house/${encodeURIComponent(shareToken)}`, { cache: 'no-store' }).then(async (response) => {
        const data = (await response.json().catch(() => ({}))) as HouseDocument & { error?: string };
        if (!response.ok) throw new Error(data.error || 'Link inválido.');
        return data as HouseDocument;
      }).then((d) => alive && setDoc(d));
      return (preview ? loadDraft(houseId) : loadPublished(houseId)).then((d) => alive && setDoc(d));
    };
    void load().catch((cause) => alive && setError(cause instanceof Error ? cause.message : 'Não foi possível carregar o cantinho.'));
    // Atualiza se o Backoffice salvar/publicar (nesta ou em outra aba).
    window.addEventListener(STORE_EVENT, load);
    window.addEventListener('storage', load);
    return () => {
      alive = false;
      window.removeEventListener(STORE_EVENT, load);
      window.removeEventListener('storage', load);
    };
  }, [preview, shareToken, houseId, demo]);

  if (error) return <main className="flex min-h-dvh items-center justify-center bg-night px-6 text-center text-wall-2"><div><p>{error}</p><button type="button" className="mt-4 underline" onClick={() => navigate(shareToken ? '/' : '/login')}>{shareToken ? 'Voltar ao início' : 'Entrar'}</button></div></main>;
  if (!doc) return <main className="min-h-dvh bg-night" aria-busy="true" />;

  return (
    <AudioProvider tracks={doc.content.playlist.tracks}>
      <House doc={doc} preview={preview} period={period} demo={demo} houseId={houseId} shareUrl={shareToken ? new URL(`/c/${encodeURIComponent(shareToken)}`, window.location.origin).href : undefined} />
    </AudioProvider>
  );
}

function House({ doc, preview, period, demo, houseId, shareUrl }: { doc: HouseDocument; preview: boolean; period: Period | null; demo: boolean; houseId?: string; shareUrl?: string }) {
  const { appearance, content } = doc;
  const [entered, setEntered] = useState(preview);
  const [help, setHelp] = useState(false);
  const [lampOn, setLampOn] = useState(true);
  const [chest, setChest] = useState({ open: false, message: 0, count: 0 });
  const [zoomStep, setZoomStep] = useState(0);
  const [canFullscreen, setCanFullscreen] = useState(false);

  const modal = useHouseModal();
  const { now, theme, clock } = useHouseTime(period, appearance.environment.dynamicWindow);
  const audio = useAudio();
  const messages = content.chestMessages.filter((m) => m.text.trim());

  useEffect(() => {
    setCanFullscreen(Boolean(document.fullscreenEnabled));
    if (window.matchMedia('(max-width: 640px)').matches) setZoomStep(1);
  }, []);

  useEffect(() => {
    document.title = demo ? 'Cantinho — seu espaço virtual de memórias' : (content.welcome.title || content.houseName);
  }, [content.welcome.title, content.houseName, demo]);

  const pickMessage = useCallback(
    (avoid: number) => {
      const n = messages.length;
      if (n <= 1) return 0;
      return (avoid + 1 + Math.floor(Math.random() * (n - 1))) % n;
    },
    [messages.length],
  );

  const openChest = () => {
    setChest((c) => ({ open: true, message: c.count === 0 ? Math.floor(Math.random() * Math.max(1, messages.length)) : pickMessage(c.message), count: c.count + 1 }));
    modal.open('chest');
  };

  const closeModal = () => {
    if (modal.active === 'chest') setChest((c) => ({ ...c, open: false }));
    modal.close();
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.().catch(() => undefined);
  };

  const previewBanner = preview && (
    <div className="bg-amber-200 px-4 py-1.5 text-center font-admin text-[13px] text-amber-950">
      Pré-visualização do rascunho — os visitantes ainda veem a versão publicada.
    </div>
  );

  if (!entered) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-7 bg-night px-6 py-12 text-center motion-safe:animate-fade-in">
        <WelcomeHouse />
        <div className="flex max-w-2xl flex-col items-center gap-3.5">
          <h1 className="font-pixel text-4xl leading-tight font-semibold text-highlight sm:text-5xl">{content.welcome.title}</h1>
          <p className="text-lg leading-relaxed text-wall-2 sm:text-xl">{content.welcome.description}</p>
        </div>
        <PixelButton size="lg" className="border-4 shadow-[0_6px_0_var(--color-rug)]" onClick={() => setEntered(true)} autoFocus>
          {content.welcome.button}
        </PixelButton>
        {demo && (
          <p className="-mt-2 text-sm text-wall-2">
            Já tem um cantinho?{' '}
            <a href="/login" onClick={(event) => { event.preventDefault(); navigate('/login'); }} className="font-semibold text-highlight no-underline transition-colors duration-200 hover:text-rug">
              Entrar na minha conta
            </a>
          </p>
        )}
        {content.welcome.note && <p className="text-sm text-[#BFA3AE]">{content.welcome.note}</p>}
      </main>
    );
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-night text-ink">
      {previewBanner}
      <header className="relative flex shrink-0 items-center justify-between gap-3 px-4 py-3 motion-safe:animate-fade-in sm:px-8 sm:py-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <Icon name="heart" className="size-6 shrink-0 text-rug" />
          <h1 className="truncate font-pixel text-lg font-semibold text-highlight sm:text-[22px]">{content.houseName}</h1>
          <span className="ml-2 hidden text-sm text-[#BFA3AE] sm:inline">
            {theme.label} · {clock}
          </span>
        </div>
        {demo && (
          <div className="absolute left-1/2 hidden -translate-x-1/2 md:block">
            <PixelButton size="sm" variant="accent" onClick={() => navigate('/login')} className="whitespace-nowrap text-sm">Crie seu cantinho</PixelButton>
          </div>
        )}
        <div className="flex shrink-0 gap-2.5">
          <PixelButton variant="dark" size="icon" onClick={() => setHelp((h) => !h)} aria-label="Mostrar objetos interativos" aria-pressed={help} className={help ? '!bg-rug !text-ink-deep' : ''}>
            <Icon name="help" />
          </PixelButton>
          <ShareButton published={!preview} houseId={houseId} shareUrl={shareUrl} />
          <AudioControl />
          {canFullscreen && (
            <PixelButton variant="dark" size="icon" onClick={toggleFullscreen} aria-label="Tela cheia">
              <Icon name="fullscreen" />
            </PixelButton>
          )}
        </div>
      </header>

      <main className="relative min-h-0 flex-1">
        <h2 className="sr-only">Sala do cantinho</h2>
        <div className="size-full motion-safe:animate-reveal">
          <HouseScene
            appearance={appearance}
            content={content}
            theme={theme}
            clock={clock}
            runtime={{ lampOn, chestOpen: chest.open, tvOn: modal.active === 'tv', musicPlaying: audio.playing && !audio.muted }}
            showLabels={help}
            zoom={ZOOM_STEPS[zoomStep]}
            onOpenModal={modal.open}
            onToggleLamp={() => setLampOn((v) => !v)}
            onOpenChest={openChest}
          />
        </div>
        <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5 md:hidden">
          <PixelButton variant="dark" size="icon" aria-label="Aproximar" disabled={zoomStep === ZOOM_STEPS.length - 1} onClick={() => setZoomStep((z) => Math.min(ZOOM_STEPS.length - 1, z + 1))}>
            <Icon name="plus" className="size-4" />
          </PixelButton>
          <PixelButton variant="dark" size="icon" aria-label="Afastar" disabled={zoomStep === 0} onClick={() => setZoomStep((z) => Math.max(0, z - 1))}>
            <Icon name="minus" className="size-4" />
          </PixelButton>
        </div>
      </main>

      <footer className="flex shrink-0 flex-wrap items-center justify-center gap-x-4 gap-y-2 px-4 py-3 text-center text-sm text-[#BFA3AE]">
        {modal.active !== 'radio' && <MiniPlayer onOpen={() => modal.open('radio')} />}
        <span>
          {content.hint}
          <span className="md:hidden"> · arraste para explorar</span>
        </span>
        {demo && (
          <div className="flex w-full justify-center md:hidden">
            <PixelButton size="sm" variant="accent" onClick={() => navigate('/login')} className="text-sm">Crie seu cantinho</PixelButton>
          </div>
        )}
      </footer>

      <RadioModal open={modal.isOpen('radio')} onClose={closeModal} playlistName={content.playlist.name} keepPlayingOnClose={content.playlist.keepPlayingOnClose} />
      <TVModal open={modal.isOpen('tv')} onClose={closeModal} videos={content.videos} />
      <PhotoModal open={modal.isOpen('photos')} onClose={closeModal} photos={content.photos} />
      <QuizModal open={modal.isOpen('quiz')} onClose={closeModal} quiz={content.quiz} />
      <BookModal open={modal.isOpen('book')} onClose={closeModal} letters={content.letters} coverColor={str(getOption('books', appearance.books), 'cover')} />
      <CalendarModal open={modal.isOpen('calendar')} onClose={closeModal} dates={content.specialDates} togetherSince={content.togetherSince} now={now} />
      <MemoryChestModal
        open={modal.isOpen('chest')}
        onClose={closeModal}
        message={messages[chest.message]?.text ?? 'O baú está vazio por enquanto.'}
        count={chest.count}
        onAnother={() => setChest((c) => ({ ...c, message: pickMessage(c.message), count: c.count + 1 }))}
      />
    </div>
  );
}

/** Miniatura do cantinho na tela de entrada. */
function WelcomeHouse() {
  return (
    <svg className="motion-safe:animate-bob" width="192" height="168" viewBox="0 0 64 56" shapeRendering="crispEdges" aria-hidden="true">
      <polygon points="32,4 60,18 60,40 32,54 4,40 4,18" fill="#46353F" />
      <polygon points="32,8 56,20 32,32 8,20" fill="#A7755B" />
      <polygon points="8,20 32,32 32,50 8,38" fill="#F4D9C6" />
      <polygon points="56,20 32,32 32,50 56,38" fill="#E7BCAC" />
      <polygon points="14,26 22,30 22,40 14,36" fill="#FFD89A" />
      <rect x="17" y="28" width="1" height="10" fill="#A7755B" />
      <polygon points="40,32 48,28 48,38 40,42" fill="#C98190" />
      <path d="M29 12h2v-1h2v1h2v2h-1v1h-1v1h-2v-1h-1v-1h-1z" fill="#C98190" />
    </svg>
  );
}
