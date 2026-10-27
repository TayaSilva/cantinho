import { useEffect, useState } from 'react';
import type { MouseEvent } from 'react';
import { useHouseDraft } from '../../hooks/useHouseDraft';
import { navigate } from '../../hooks/useRoute';
import { ContentPage } from './ContentPage';
import type { ContentSection } from './ContentPage';
import { AdminIcon, Button, ConfirmDialog, cx, Toast } from './controls';
import { EditorPage } from './EditorPage';
import { sharePublicHouse } from '../../services/share';
import { houseAdminPath, type HouseSummary } from '../../services/houses';

const CONTENT_SECTIONS: ContentSection[] = ['textos', 'fotos', 'videos', 'musicas', 'cartas', 'datas', 'mensagens'];

/**
 * Backoffice de um cantinho: /admin/cantinho/:id (Personalizar cantinho) e
 * /admin/cantinho/:id/conteudos/*. `path` chega relativo ao cantinho ("/editor",
 * "/conteudos/fotos"). Rascunho, desfazer, restaurar padrão, pré-visualizar e
 * publicar ficam no topo, valendo para as duas áreas.
 */
export function AdminApp({ path, house, houses, onHouseChange, onLogout }: { path: string; house: HouseSummary; houses: HouseSummary[]; onHouseChange: (id: string) => void; onLogout?: () => void }) {
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
    window.setTimeout(() => setShareNotice(null), 2200);
  };

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
      <header className="flex shrink-0 flex-wrap items-center gap-x-6 gap-y-3 border-b border-stone-200 bg-white px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-rose-50">
            <svg width="16" height="16" viewBox="0 0 12 12" shapeRendering="crispEdges" aria-hidden="true">
              <path d="M1 3h1v-1h3v1h2v-1h3v1h1v3h-1v1h-1v1h-1v1h-1v1h-2v-1h-1v-1h-1v-1h-1v-1h-1z" fill="#C2577A" />
            </svg>
          </span>
          <span className="text-[15px] font-bold">Cantinho</span>
          <span className="rounded-full border border-stone-200 px-2 py-0.5 text-xs text-stone-500">Admin</span>
        </div>
        <nav aria-label="Principal" className="flex flex-wrap gap-1">
          <a href="/meus-cantinhos" onClick={link('/meus-cantinhos')} className="rounded-lg px-3 py-2 font-medium text-stone-600 no-underline hover:bg-stone-50">
            Meus cantinhos
          </a>
          <a href={contentPath} onClick={link(contentPath)} aria-current={isContent ? 'page' : undefined} className={cx('rounded-lg px-3 py-2 font-medium no-underline', isContent ? 'bg-stone-100 text-stone-900' : 'text-stone-600 hover:bg-stone-50')}>
            Conteúdos
          </a>
          <a href={editorPath} onClick={link(editorPath)} aria-current={!isContent ? 'page' : undefined} className={cx('rounded-lg px-3 py-2 font-medium no-underline', !isContent ? 'bg-stone-100 text-stone-900' : 'text-stone-600 hover:bg-stone-50')}>
            Personalizar cantinho
          </a>
          <a href={`/?house=${encodeURIComponent(house.house_id)}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 font-medium text-stone-600 no-underline hover:bg-stone-50">
            Ver cantinho publicado
            <AdminIcon name="external" className="size-3.5" />
          </a>
        </nav>
        <div className="flex-1" />
        <div className="flex flex-wrap items-center gap-2">
          <select aria-label="Cantinho ativo" value={house.house_id} onChange={(event) => chooseHouse(event.target.value)} className="h-9 max-w-48 rounded-lg border border-stone-200 bg-white px-2 text-sm font-medium outline-none focus:border-rose-500">
            {houses.map((item) => <option key={item.house_id} value={item.house_id}>{item.house.name}</option>)}
          </select>
          <span
            role="status"
            className={cx(
              'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px]',
              status.tone === 'warn' && 'bg-amber-100 text-amber-900',
              status.tone === 'info' && 'bg-sky-50 text-sky-900',
              status.tone === 'ok' && 'bg-emerald-50 text-emerald-800',
              status.tone === 'neutral' && 'bg-stone-100 text-stone-700',
            )}
          >
            <span className={cx('size-1.5 rounded-full', status.tone === 'warn' ? 'bg-amber-600' : status.tone === 'info' ? 'bg-sky-600' : status.tone === 'ok' ? 'bg-emerald-600' : 'bg-stone-500')} />
            {status.text}
          </span>
          <Button variant="ghost" onClick={draft.undo} disabled={!draft.canUndo} title="Desfazer (Ctrl+Z)">
            <AdminIcon name="undo" className="size-4" />
            Desfazer
          </Button>
          {!isContent && (
            <Button variant="ghost" onClick={() => setConfirm('reset')}>
              Restaurar padrão
            </Button>
          )}
          <Button onClick={preview}>
            <AdminIcon name="eye" className="size-4" />
            Pré-visualizar
          </Button>
          <Button onClick={() => void share()}>
            <AdminIcon name="external" className="size-4" />
            {shareNotice ?? 'Compartilhar link'}
          </Button>
          <Button onClick={draft.saveDraft} disabled={!draft.dirty || !!draft.busy}>
            Salvar rascunho
          </Button>
          <Button variant="primary" onClick={() => setConfirm('publish')} disabled={(draft.pending === 0 && !draft.dirty) || !!draft.busy}>
            Publicar
          </Button>
          {onLogout && <Button variant="ghost" onClick={onLogout}>Sair</Button>}
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
      <Toast message={draft.lastAction} onDone={draft.clearLastAction} />
    </div>
  );
}
