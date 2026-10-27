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
export function AdminApp({ path, house, houses, firstName, email, onHouseChange, onLogout }: { path: string; house: HouseSummary; houses: HouseSummary[]; firstName: string; email?: string; onHouseChange: (id: string) => void; onLogout?: () => void }) {
  const draft = useHouseDraft(house.house_id);
  const [confirm, setConfirm] = useState<null | 'reset' | 'publish' | 'switch'>(null);
  const [pendingHouse, setPendingHouse] = useState<string | null>(null);
  const [shareNotice, setShareNotice] = useState<string | null>(null);

  const isContent = path.startsWith('/conteudos');
  const section = (CONTENT_SECTIONS.find((s) => path === `/conteudos/${s}`) ?? 'fotos') as ContentSection;
  const contentPath = houseAdminPath(house.house_id, '/conteudos/fotos');
  const editorPath = houseAdminPath(house.house_id);

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
      <header className="flex shrink-0 flex-col gap-3 px-3 pt-3 sm:px-4 sm:pt-4">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl border border-stone-100 bg-white px-4 py-3 shadow-sm sm:px-5">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-xl bg-rose-50">
              <svg width="18" height="18" viewBox="0 0 12 12" shapeRendering="crispEdges" aria-hidden="true">
                <path d="M1 3h1v-1h3v1h2v-1h3v1h1v3h-1v1h-1v1h-1v1h-1v1h-2v-1h-1v-1h-1v-1h-1v-1h-1z" fill="#C2577A" />
              </svg>
            </span>
            <span className="text-[15px] font-bold">Cantinho</span>
            <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs text-stone-500">Admin</span>
          </div>
          <nav aria-label="Principal" className="flex flex-wrap gap-1 sm:ml-6">
            <a href="/meus-cantinhos" onClick={link('/meus-cantinhos')} className={navClass(false)}>Meus cantinhos</a>
            <a href={contentPath} onClick={link(contentPath)} aria-current={isContent ? 'page' : undefined} className={navClass(isContent)}>Conteúdos</a>
            <a href={editorPath} onClick={link(editorPath)} aria-current={!isContent ? 'page' : undefined} className={navClass(!isContent)}>Personalizar cantinho</a>
          </nav>
          <div className="flex-1" />
          <div className="flex items-center gap-4">
            <a href={`/?house=${encodeURIComponent(house.house_id)}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg px-2 py-2 text-stone-500 no-underline hover:text-stone-800">
              <AdminIcon name="external" className="size-4" />
              Ver cantinho publicado
            </a>
            <span className="h-8 w-px bg-stone-200" aria-hidden="true" />
            <AccountMenu firstName={firstName} email={email} onLogout={onLogout} />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-stone-100 bg-white px-4 py-3 shadow-sm sm:px-5">
          <label className="relative flex items-center">
            <span className="sr-only">Cantinho ativo</span>
            <AdminIcon name="home" className="pointer-events-none absolute left-3.5 size-5 text-stone-700" />
            <select value={house.house_id} onChange={(event) => chooseHouse(event.target.value)} className="h-11 w-56 max-w-full cursor-pointer appearance-none truncate rounded-xl border border-stone-200 bg-white pr-10 pl-11 text-sm font-semibold outline-none hover:bg-stone-50 focus:border-rose-500">
              {houses.map((item) => <option key={item.house_id} value={item.house_id}>{item.house.name}</option>)}
            </select>
            <AdminIcon name="chevron" className="pointer-events-none absolute right-3.5 size-4 text-stone-700" />
          </label>
          <span
            role="status"
            className={cx(
              'inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-[13px] font-medium',
              status.tone === 'warn' && 'bg-amber-50 text-amber-600',
              status.tone === 'info' && 'bg-sky-50 text-sky-800',
              status.tone === 'ok' && 'bg-emerald-50 text-emerald-700',
              status.tone === 'neutral' && 'bg-stone-100 text-stone-700',
            )}
          >
            <span className={cx('size-1.5 rounded-full', status.tone === 'warn' ? 'bg-amber-500' : status.tone === 'info' ? 'bg-sky-600' : status.tone === 'ok' ? 'bg-emerald-600' : 'bg-stone-500')} />
            {status.text}
          </span>
          <div className="flex-1" />
          <div className="flex flex-wrap items-center gap-2.5">
            <Button size="lg" onClick={preview}>
              <AdminIcon name="eye" className="size-5" />
              Pré-visualizar
            </Button>
            <Button size="lg" onClick={draft.saveDraft} disabled={!draft.dirty || !!draft.busy}>
              <AdminIcon name="save" className="size-5" />
              Salvar rascunho
            </Button>
            <Button size="lg" variant="primary" onClick={() => setConfirm('publish')} disabled={(draft.pending === 0 && !draft.dirty) || !!draft.busy}>
              <AdminIcon name="upload" className="size-5" />
              Publicar
            </Button>
            <MoreMenu
              canUndo={draft.canUndo}
              onUndo={draft.undo}
              onReset={isContent ? undefined : () => setConfirm('reset')}
              onShare={() => void share()}
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

/** Menu "⋯" com as ações menos usadas: desfazer, restaurar padrão e compartilhar. */
function MoreMenu({ canUndo, onUndo, onReset, onShare }: { canUndo: boolean; onUndo: () => void; onReset?: () => void; onShare: () => void }) {
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
      <Button size="lg" variant="ghost" aria-label="Mais ações" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((v) => !v)} className={cx('w-14', open ? 'bg-stone-100' : 'bg-stone-50')}>
        <AdminIcon name="more" className="size-5" />
      </Button>
      {open && (
        <div role="menu" className="absolute right-0 z-40 mt-2 w-56 rounded-xl border border-stone-100 bg-white p-1.5 text-sm shadow-lg motion-safe:animate-fade-in">
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
        </div>
      )}
    </div>
  );
}
