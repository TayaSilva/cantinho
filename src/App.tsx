import { useCallback, useEffect, useState } from 'react';
import { AdminGate } from './components/admin/AdminGate';
import { HouseScene } from './components/house/HouseScene';
import { BookModal } from './components/modals/BookModal';
import { CalendarModal } from './components/modals/CalendarModal';
import { MemoryChestModal } from './components/modals/MemoryChestModal';
import { PhotoModal } from './components/modals/PhotoModal';
import { RadioModal } from './components/modals/RadioModal';
import { TVModal } from './components/modals/TVModal';
import { AudioControl, AudioProvider, MiniPlayer, useAudio } from './components/ui/AudioControl';
import { Icon, PixelButton } from './components/ui/PixelButton';
import { getOption, str } from './data/catalog';
import { useHouseModal } from './hooks/useHouseModal';
import { useHouseTime } from './hooks/useHouseTime';
import { useRoute } from './hooks/useRoute';
import { loadDraft, loadPublished, STORE_EVENT } from './services/houseStore';
import type { HouseDocument, Period } from './types/house';

const ZOOM_STEPS = [1, 1.4, 1.8, 2.3];

/** Permite testar períodos pela URL: ?periodo=noite */
function periodFromUrl(search: URLSearchParams): Period | null {
  const p = search.get('periodo');
  return p === 'manha' || p === 'tarde' || p === 'noite' || p === 'madrugada' ? p : null;
}

export default function App() {
  const { path, search } = useRoute();
  if (path === '/admin' || path.startsWith('/admin/')) return <AdminGate path={path === '/admin' ? '/admin/editor' : path} />;
  return <PublicHouse preview={search.get('preview') === 'draft'} period={periodFromUrl(search)} />;
}

/**
 * Casinha pública. Lê apenas a versão PUBLICADA — ou o rascunho, quando aberta
 * pelo botão "Pré-visualizar" do Backoffice (?preview=draft).
 */
function PublicHouse({ preview, period }: { preview: boolean; period: Period | null }) {
  const [doc, setDoc] = useState<HouseDocument | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () => (preview ? loadDraft() : loadPublished()).then((d) => alive && setDoc(d));
    void load();
    // Atualiza se o Backoffice salvar/publicar (nesta ou em outra aba).
    window.addEventListener(STORE_EVENT, load);
    window.addEventListener('storage', load);
    return () => {
      alive = false;
      window.removeEventListener(STORE_EVENT, load);
      window.removeEventListener('storage', load);
    };
  }, [preview]);

  if (!doc) return <main className="min-h-dvh bg-night" aria-busy="true" />;

  return (
    <AudioProvider tracks={doc.content.playlist.tracks}>
      <House doc={doc} preview={preview} period={period} />
    </AudioProvider>
  );
}

function House({ doc, preview, period }: { doc: HouseDocument; preview: boolean; period: Period | null }) {
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
    document.title = content.welcome.title || content.houseName;
  }, [content.welcome.title, content.houseName]);

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
        {content.welcome.note && <p className="text-sm text-[#BFA3AE]">{content.welcome.note}</p>}
      </main>
    );
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-night text-ink">
      {previewBanner}
      <header className="flex shrink-0 items-center justify-between gap-3 px-4 py-3 motion-safe:animate-fade-in sm:px-8 sm:py-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <Icon name="heart" className="size-6 shrink-0 text-rug" />
          <h1 className="truncate font-pixel text-lg font-semibold text-highlight sm:text-[22px]">{content.houseName}</h1>
          <span className="ml-2 hidden text-sm text-[#BFA3AE] sm:inline">
            {theme.label} · {clock}
          </span>
        </div>
        <div className="flex shrink-0 gap-2.5">
          <PixelButton variant="dark" size="icon" onClick={() => setHelp((h) => !h)} aria-label="Mostrar objetos interativos" aria-pressed={help} className={help ? '!bg-rug !text-ink-deep' : ''}>
            <Icon name="help" />
          </PixelButton>
          <AudioControl />
          {canFullscreen && (
            <PixelButton variant="dark" size="icon" onClick={toggleFullscreen} aria-label="Tela cheia">
              <Icon name="fullscreen" />
            </PixelButton>
          )}
        </div>
      </header>

      <main className="relative min-h-0 flex-1">
        <h2 className="sr-only">Sala da casinha</h2>
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
      </footer>

      <RadioModal open={modal.isOpen('radio')} onClose={closeModal} playlistName={content.playlist.name} keepPlayingOnClose={content.playlist.keepPlayingOnClose} />
      <TVModal open={modal.isOpen('tv')} onClose={closeModal} videos={content.videos} />
      <PhotoModal open={modal.isOpen('photos')} onClose={closeModal} photos={content.photos} />
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

/** Miniatura da casinha na tela de entrada. */
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
