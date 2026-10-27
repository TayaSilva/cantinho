import { useCallback, useEffect, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import { useHouseDraft } from '../../hooks/useHouseDraft';
import { navigate } from '../../hooks/useRoute';
import { AccountMenu } from '../account/AccountMenu';
import { ContentPage } from './ContentPage';
import type { ContentSection } from './ContentPage';
import { AdminIcon, Button, ConfirmDialog, cx, Toast, useDismiss } from './controls';
import { EditorPage } from './EditorPage';
import { sharePublicHouse } from '../../services/share';
import { houseAdminPath, type HouseSummary } from '../../services/houses';

const CONTENT_SECTIONS: ContentSection[] = ['textos', 'fotos', 'videos', 'musicas', 'cartas', 'datas', 'mensagens'];

/**
 * Backoffice de um cantinho: /admin/cantinho/:id (Personalizar cantinho) e
 * /admin/cantinho/:id/conteudos/*. `path` chega relativo ao cantinho ("/editor",
 * "/conteudos/fotos"). Rascunho, pré-visualizar e publicar ficam no topo, valendo
 * para as duas áreas; desfazer, restaurar padrão e compartilhar ficam no menu "⋯".
 */
export function AdminApp({ path, house, houses, firstName, email, onHouseChange, onLogout, onDeleteAccount }: { path: string; house: HouseSummary; houses: HouseSummary[]; firstName: string; email?: string; onHouseChange: (id: string) => void; onLogout?: () => void; onDeleteAccount?: () => Promise<void> }) {
  const draft = useHouseDraft(house.house_id);
  const [confirm, setConfirm] = useState<null | 'reset' | 'publish' | 'switch'>(null);
  const [pendingHouse, setPendingHouse] = useState<string | null>(null);
  const [shareNotice, setShareNotice] = useState<string | null>(null);
  // Navegação recolhível do celular (no desktop os links ficam sempre à vista).
  const [navOpen, setNavOpen] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);
  useDismiss(navOpen, navRef, useCallback(() => setNavOpen(false), []));

  const isContent = path.startsWith('/conteudos');
  const section = (CONTENT_SECTIONS.find((s) => path === `/conteudos/${s}`) ?? 'fotos') as ContentSection;
  const contentPath = houseAdminPath(house.house_id, '/conteudos/fotos');
  const editorPath = houseAdminPath(house.house_id);
  const publishedHref = `/?house=${encodeURIComponent(house.house_id)}`;

  // Avisa antes de sair com alterações não salvas.
  useEffect(() => {
    if (!draft.dirty) return;
    const onLeave = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onLeave);
    return () => window.removeEventListener('beforeunload', onLeave);
  }, [draft.dirty]);

  // Ctrl/Cmd + Z desfaz (fora de campos de texto, onde vale o desfazer do próprio campo).
  const { undo } = draft;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing = el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z' && !typing) {
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo]);

  useEffect(() => {
    document.title = isContent ? 'Conteúdos · Cantinho Admin' : 'Personalizar cantinho · Cantinho Admin';
  }, [isContent]);

  const preview = async () => {
    const win = window.open('about:blank', '_blank');
    if (draft.dirty) await draft.saveDraft();
    if (win) win.location.href = `/?preview=draft&house=${encodeURIComponent(house.house_id)}`;
  };

  const share = async () => {
    const result = await sharePublicHouse(house.house_id);
    if (!result) return;
    setShareNotice(result === 'shared' ? 'Compartilhado!' : 'Link copiado!');
  };
  const clearShareNotice = useCallback(() => setShareNotice(null), []);

  const link = (to: string) => (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    setNavOpen(false);
    navigate(to);
  };

  const chooseHouse = (id: string) => {
    if (id === house.house_id) return;
    if (draft.dirty) {
      setPendingHouse(id);
      setConfirm('switch');
      return;
    }
    onHouseChange(id);
  };

  const status = draft.busy === 'publishing'
    ? { text: 'Publicando…', tone: 'neutral' as const }
    : draft.busy === 'saving'
      ? { text: 'Salvando…', tone: 'neutral' as const }
      : draft.dirty
        ? { text: 'Alterações não salvas', tone: 'warn' as const }
        : draft.pending > 0
          ? { text: `Rascunho salvo · ${draft.pending} ${draft.pending === 1 ? 'alteração não publicada' : 'alterações não publicadas'}`, tone: 'info' as const }
          : { text: 'Tudo publicado', tone: 'ok' as const };

  return (
    <div className="flex min-h-dvh flex-col bg-stone-50 font-admin text-sm text-stone-900 lg:h-dvh">
      {/* Abaixo de md, o cabeçalho vira três linhas: marca + conta + ☰, cantinho + Prévia, Publicar + ⋯.
          De md para cima, o layout de desktop continua igual. */}
      <header className="flex shrink-0 flex-col gap-2 px-2 pt-2 sm:px-4 sm:pt-4 md:gap-3">
        <div ref={navRef} className="flex flex-wrap items-center gap-x-2 gap-y-2 rounded-2xl border border-stone-100 bg-white px-3 py-2 shadow-sm sm:px-5 md:gap-x-6 md:gap-y-3 md:py-3">
          <div className="flex min-w-0 items-center gap-2.5 md:gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-rose-50 md:size-11">
              <svg width="18" height="18" viewBox="0 0 12 12" shapeRendering="crispEdges" aria-hidden="true">
                <path d="M1 3h1v-1h3v1h2v-1h3v1h1v3h-1v1h-1v1h-1v1h-1v1h-2v-1h-1v-1h-1v-1h-1v-1h-1z" fill="#C2577A" />
              </svg>
            </span>
            <span className="text-[15px] font-bold">Cantinho</span>
            <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs text-stone-500 max-[359px]:hidden">Admin</span>
          </div>
          <nav
            id="admin-nav"
            aria-label="Principal"
            className={cx('order-last w-full flex-col gap-1 border-t border-stone-100 pt-2 md:order-none md:ml-6 md:flex md:w-auto md:flex-row md:flex-wrap md:border-0 md:pt-0', navOpen ? 'flex' : 'hidden')}
          >
            <a href="/meus-cantinhos" onClick={link('/meus-cantinhos')} className={navClass(false)}>Meus cantinhos</a>
            <a href={contentPath} onClick={link(contentPath)} aria-current={isContent ? 'page' : undefined} className={navClass(isContent)}>Conteúdos</a>
            <a href={editorPath} onClick={link(editorPath)} aria-current={!isContent ? 'page' : undefined} className={navClass(!isContent)}>Personalizar cantinho</a>
          </nav>
          <div className="flex-1" />
          <div className="flex items-center gap-1.5 md:gap-4">
            <a href={publishedHref} target="_blank" rel="noreferrer" className="hidden items-center gap-2 rounded-lg px-2 py-2 text-stone-500 no-underline hover:text-stone-800 md:inline-flex">
              <AdminIcon name="external" className="size-4" />
              Ver cantinho publicado
            </a>
            <span className="hidden h-8 w-px bg-stone-200 md:block" aria-hidden="true" />
            <AccountMenu firstName={firstName} email={email} onLogout={onLogout} onDeleteAccount={onDeleteAccount} ownedCount={houses.length} />
            <button
              type="button"
              aria-label={navOpen ? 'Fechar navegação' : 'Abrir navegação'}
              aria-expanded={navOpen}
              aria-controls="admin-nav"
              onClick={() => setNavOpen((v) => !v)}
              className={cx('flex size-11 cursor-pointer items-center justify-center rounded-xl text-stone-700 hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-rose-500 md:hidden', navOpen && 'bg-stone-100')}
            >
              <AdminIcon name={navOpen ? 'close' : 'menu'} className="size-[22px]" />
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2.5 rounded-2xl border border-stone-100 bg-white p-3 shadow-sm sm:px-5 md:flex-row md:flex-wrap md:items-center md:gap-3">
          <div className="flex min-w-0 items-start gap-2 md:contents">
            <div className="flex min-w-0 flex-1 flex-col gap-1 md:contents">
              <label className="relative flex items-center">
                <span className="sr-only">Cantinho ativo</span>
                <AdminIcon name="home" className="pointer-events-none absolute left-3.5 size-5 text-stone-700" />
                <select value={house.house_id} onChange={(event) => chooseHouse(event.target.value)} className="h-11 w-full min-w-0 cursor-pointer appearance-none truncate rounded-xl border border-stone-200 bg-white pr-10 pl-11 text-sm font-semibold outline-none hover:bg-stone-50 focus:border-rose-500 md:w-56 md:max-w-full">
                  {houses.map((item) => <option key={item.house_id} value={item.house_id}>{item.house.name}</option>)}
                </select>
                <AdminIcon name="chevron" className="pointer-events-none absolute right-3.5 size-4 text-stone-700" />
              </label>
              <span
                role="status"
                className={cx(
                  'flex min-w-0 items-center gap-1.5 px-1 text-xs font-medium md:inline-flex md:gap-2 md:rounded-xl md:px-3.5 md:py-2.5 md:text-[13px]',
                  status.tone === 'warn' && 'text-amber-600 md:bg-amber-50',
                  status.tone === 'info' && 'text-sky-800 md:bg-sky-50',
                  status.tone === 'ok' && 'text-emerald-700 md:bg-emerald-50',
                  status.tone === 'neutral' && 'text-stone-700 md:bg-stone-100',
                )}
              >
                <span className={cx('size-1.5 shrink-0 rounded-full', status.tone === 'warn' ? 'bg-amber-500' : status.tone === 'info' ? 'bg-sky-600' : status.tone === 'ok' ? 'bg-emerald-600' : 'bg-stone-500')} />
                <span className="truncate">{status.text}</span>
              </span>
            </div>
            <Button size="lg" onClick={preview} className="shrink-0 px-3.5 md:order-2 md:px-4">
              <AdminIcon name="eye" className="size-5" />
              <span className="md:hidden">Prévia</span>
              <span className="hidden md:inline">Pré-visualizar</span>
            </Button>
          </div>
          <div className="hidden flex-1 md:order-1 md:block" />
          <div className="flex items-center gap-2 md:order-3 md:gap-2.5">
            <Button size="lg" onClick={draft.saveDraft} disabled={!draft.dirty || !!draft.busy} className="max-md:hidden">
              <AdminIcon name="save" className="size-5" />
              Salvar rascunho
            </Button>
            <Button size="lg" variant="primary" onClick={() => setConfirm('publish')} disabled={(draft.pending === 0 && !draft.dirty) || !!draft.busy} className="min-w-0 flex-1 max-md:bg-[#B24A6D] max-md:hover:bg-[#9E3F60] md:flex-none">
              <AdminIcon name="upload" className="size-5" />
              Publicar
            </Button>
            <MoreMenu
              canUndo={draft.canUndo}
              onUndo={draft.undo}
              onReset={isContent ? undefined : () => setConfirm('reset')}
              onShare={() => void share()}
              canSave={draft.dirty && !draft.busy}
              onSave={() => void draft.saveDraft()}
              publishedHref={publishedHref}
            />
          </div>
        </div>
      </header>

      {!draft.doc ? (
        <p className="p-10 text-center text-stone-500">Carregando…</p>
      ) : isContent ? (
        <ContentPage draft={draft} section={section} />
      ) : (
        <EditorPage draft={draft} />
      )}

      <ConfirmDialog
        open={confirm === 'reset'}
        title="Restaurar a aparência padrão?"
        body={
          <>
            Paredes, piso, janela, iluminação, móveis, personagens, animalzinho e decorações voltam ao padrão. <b>Fotos, vídeos, músicas, cartas, datas e mensagens não são alterados.</b> Você pode desfazer em seguida.
          </>
        }
        confirmLabel="Restaurar padrão"
        danger
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          draft.resetAppearance();
          setConfirm(null);
        }}
      />
      <ConfirmDialog
        open={confirm === 'switch'}
        title="Trocar de cantinho?"
        body="Existem alterações não salvas neste cantinho. Se você trocar agora, elas serão descartadas."
        confirmLabel="Trocar de cantinho"
        danger
        onCancel={() => { setConfirm(null); setPendingHouse(null); }}
        onConfirm={() => {
          const next = pendingHouse;
          setConfirm(null);
          setPendingHouse(null);
          if (next) onHouseChange(next);
        }}
      />
      <ConfirmDialog
        open={confirm === 'publish'}
        title="Publicar alterações?"
        body={<>A partir de agora, os visitantes verão esta versão do cantinho{draft.pending > 0 ? ` (${draft.pending} ${draft.pending === 1 ? 'alteração' : 'alterações'})` : ''}.</>}
        confirmLabel="Publicar"
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          setConfirm(null);
          void draft.publish();
        }}
      />
      <Toast message={shareNotice ?? draft.lastAction} onDone={shareNotice ? clearShareNotice : draft.clearLastAction} />
    </div>
  );
}

const navClass = (active: boolean) => cx('rounded-xl px-4 py-2.5 font-medium no-underline transition-colors', active ? 'bg-rose-50 font-semibold text-rose-600' : 'text-stone-500 hover:bg-stone-50 hover:text-stone-800');

/**
 * Menu "⋯" com as ações menos usadas: desfazer, restaurar padrão e compartilhar.
 * No celular também recebe "Salvar rascunho" e "Ver cantinho publicado", que no
 * desktop ficam à vista no cabeçalho.
 */
function MoreMenu({ canUndo, onUndo, onReset, onShare, canSave, onSave, publishedHref }: { canUndo: boolean; onUndo: () => void; onReset?: () => void; onShare: () => void; canSave: boolean; onSave: () => void; publishedHref: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, ref, close);
  const item = 'flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left text-stone-700 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-45';
  const run = (action: () => void) => () => {
    close();
    action();
  };
  return (
    <div ref={ref} className="relative">
      <Button size="lg" variant="ghost" aria-label="Mais ações" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((v) => !v)} className={cx('w-12 shrink-0 md:w-14', open ? 'bg-stone-100' : 'bg-stone-50')}>
        <AdminIcon name="more" className="size-5" />
      </Button>
      {open && (
        <div role="menu" className="absolute right-0 z-40 mt-2 w-60 max-w-[calc(100vw-1rem)] rounded-xl border border-stone-100 bg-white p-1.5 text-sm shadow-lg motion-safe:animate-fade-in md:w-56">
          <button role="menuitem" type="button" className={cx(item, 'md:hidden')} disabled={!canSave} onClick={run(onSave)}>
            <AdminIcon name="save" className="size-[18px]" />
            Salvar rascunho
          </button>
          <button role="menuitem" type="button" className={item} disabled={!canUndo} title="Desfazer (Ctrl+Z)" onClick={run(onUndo)}>
            <AdminIcon name="undo" className="size-[18px]" />
            Desfazer
          </button>
          {onReset && (
            <button role="menuitem" type="button" className={item} onClick={run(onReset)}>
              <AdminIcon name="power" className="size-[18px]" />
              Restaurar padrão
            </button>
          )}
          <button role="menuitem" type="button" className={item} onClick={run(onShare)}>
            <AdminIcon name="link" className="size-[18px]" />
            Compartilhar link
          </button>
          <a role="menuitem" href={publishedHref} target="_blank" rel="noreferrer" className={cx(item, 'no-underline md:hidden')} onClick={close}>
            <AdminIcon name="external" className="size-[18px]" />
            Ver cantinho publicado
          </a>
        </div>
      )}
    </div>
  );
}
