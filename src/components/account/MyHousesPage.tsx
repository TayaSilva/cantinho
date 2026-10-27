import { useCallback, useEffect, useMemo, useState } from 'react';
import { houseStatus, type HouseStatus, type HouseSummary } from '../../services/houses';
import { useHousePlans } from '../../services/plans';
import { sharePublicHouse } from '../../services/share';
import { AdminIcon, Button, ConfirmDialog, cx, Toast } from '../admin/controls';
import { PlanBadge } from '../plans/PlanParts';
import { AccountMenu } from './AccountMenu';

const STATUS: Record<HouseStatus, { label: string; className: string; dot: string }> = {
  draft: { label: 'Rascunho', className: 'bg-stone-100 text-stone-700', dot: 'bg-stone-500' },
  published: { label: 'Publicado', className: 'bg-emerald-50 text-emerald-800', dot: 'bg-emerald-600' },
  pending: { label: 'Alterações pendentes', className: 'bg-amber-100 text-amber-900', dot: 'bg-amber-600' },
};

const dateFormat = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
const dateTimeFormat = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

function formatDate(value: string | undefined, withTime = false) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : (withTime ? dateTimeFormat : dateFormat).format(date);
}

/** Miniatura simples em pixel art, com cor estável derivada do id do cantinho. */
function Thumbnail({ id }: { id: string }) {
  const palettes = [
    ['#FBE4EA', '#C2577A', '#7A3A52'],
    ['#E6F0FA', '#4F7FB8', '#2E4A6E'],
    ['#E9F5EC', '#4E9A6B', '#2D5A3E'],
    ['#FFF1DC', '#D08A3A', '#7A4E1E'],
    ['#EFE8FA', '#8466C2', '#4B3878'],
  ];
  const hash = [...id].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0, 7);
  const [bg, wall, roof] = palettes[hash % palettes.length];
  return (
    <div className="flex aspect-[16/9] items-end justify-center rounded-xl" style={{ background: bg }} aria-hidden="true">
      <svg viewBox="0 0 16 12" className="mb-3 h-3/5" shapeRendering="crispEdges">
        <path d="M8 0h1v1h1v1h1v1h1v1h1v1h1v1h-12v-1h1v-1h1v-1h1v-1h1v-1h1v-1h1z" fill={roof} />
        <rect x="3" y="6" width="11" height="6" fill={wall} />
        <rect x="5" y="8" width="2" height="2" fill={bg} />
        <rect x="10" y="8" width="2" height="4" fill={roof} />
      </svg>
    </div>
  );
}

export function MyHousesPage({ firstName, email, houses, notice, error, onDismissNotice, onOpen, onCreate, onDelete, onLogout, onDeleteAccount }: {
  firstName: string;
  email?: string;
  houses: HouseSummary[];
  notice?: string | null;
  error?: string | null;
  onDismissNotice: () => void;
  onOpen: (id: string) => void;
  onCreate: () => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onLogout?: () => void;
  onDeleteAccount?: () => Promise<void>;
}) {
  const [creating, setCreating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<HouseSummary | null>(null);
  const clearToast = useCallback(() => setToast(null), []);
  const canCreate = !houses.some((item) => item.role === 'owner' && item.house.status === 'active');

  useEffect(() => {
    document.title = 'Meus cantinhos · Cantinho';
  }, []);
  useEffect(() => {
    if (notice) setToast(notice);
    if (notice) onDismissNotice();
  }, [notice, onDismissNotice]);

  const plans = useHousePlans(useMemo(() => houses.map((item) => item.house_id), [houses]));

  const sorted = useMemo(
    () => [...houses].sort((a, b) => new Date(b.house.updated_at || 0).getTime() - new Date(a.house.updated_at || 0).getTime()),
    [houses],
  );

  const create = async () => {
    setCreating(true);
    setActionError(null);
    try {
      await onCreate();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Não foi possível criar o cantinho.');
      setCreating(false);
    }
  };

  const preview = (id: string) => window.open(`/?preview=draft&house=${encodeURIComponent(id)}`, '_blank', 'noopener');

  const share = async (id: string) => {
    const result = await sharePublicHouse(id);
    setToast(result === 'shared' ? 'Compartilhado!' : result === 'copied' ? 'Link copiado!' : 'Não foi possível criar o link.');
  };

  const confirmDelete = async () => {
    const target = toDelete;
    setToDelete(null);
    if (!target) return;
    try {
      await onDelete(target.house_id);
      setToast('Cantinho excluído.');
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Não foi possível excluir o cantinho.');
    }
  };

  return (
    <div className="min-h-dvh bg-stone-50 font-admin text-sm text-stone-900">
      <header className="flex items-center gap-4 border-b border-stone-200 bg-white px-4 py-3 sm:px-6">
        <div className="flex flex-1 items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-rose-50">
            <AdminIcon name="home" className="size-4 text-rose-700" />
          </span>
          <span className="text-[15px] font-bold">Cantinho</span>
        </div>
        <Button variant="primary" onClick={() => void create()} disabled={creating || !canCreate} title={canCreate ? 'Criar cantinho' : 'Sua conta já possui um cantinho ativo'}>
          <AdminIcon name="plus" className="size-4" />
          <span className="hidden sm:inline">{creating ? 'Criando…' : 'Criar novo cantinho'}</span>
          <span className="sm:hidden">{creating ? 'Criando…' : 'Nova'}</span>
        </Button>
        <AccountMenu firstName={firstName} email={email} onLogout={onLogout} onDeleteAccount={onDeleteAccount} ownedCount={houses.filter((item) => item.role === 'owner').length} />
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
        <div>
          <h1 className="text-2xl font-bold">Olá, {firstName}</h1>
          <p className="mt-1 text-stone-600">Estes são os seus cantinhos. Escolha um para editar ou crie um novo.</p>
        </div>

        {(actionError || error) && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-800">{actionError || error}</p>}

        {sorted.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-14 text-center">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-rose-50">
              <AdminIcon name="home" className="size-7 text-rose-700" />
            </span>
            <h2 className="mt-4 text-lg font-semibold">Você ainda não tem cantinhos</h2>
            <p className="mt-1.5 max-w-sm text-stone-600">Monte um cantinho com fotos, músicas e recados para quem você gosta.</p>
            <Button variant="primary" className="mt-5" onClick={() => void create()} disabled={creating || !canCreate}>
              {creating ? 'Criando…' : 'Criar meu primeiro cantinho'}
            </Button>
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sorted.map((item) => {
              const status = STATUS[houseStatus(item)];
              const owner = item.role === 'owner';
              return (
                <li key={item.house_id} className="flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
                  <button type="button" className="cursor-pointer rounded-xl focus-visible:outline-2 focus-visible:outline-rose-500" onClick={() => (owner ? onOpen(item.house_id) : preview(item.house_id))} aria-label={`Abrir ${item.house.name}`}>
                    <Thumbnail id={item.house_id} />
                  </button>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="min-w-0 truncate text-base font-semibold">{item.house.name}</h2>
                      <span className={cx('inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs', status.className)}>
                        <span className={cx('size-1.5 rounded-full', status.dot)} />
                        {status.label}
                      </span>
                    </div>
                    {plans[item.house_id] && <PlanBadge planId={plans[item.house_id].planId} className="self-start" />}
                    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs text-stone-500">
                      <dt>Criado em</dt>
                      <dd>{formatDate(item.house.created_at)}</dd>
                      <dt>Atualizado</dt>
                      <dd>{formatDate(item.house.updated_at, true)}</dd>
                      {!owner && (<><dt>Acesso</dt><dd>Convidado</dd></>)}
                    </dl>
                  </div>
                  <div className="mt-auto flex flex-wrap gap-2">
                    {owner && <Button variant="primary" onClick={() => onOpen(item.house_id)}>Editar</Button>}
                    <Button onClick={() => preview(item.house_id)} title="Pré-visualizar">
                      <AdminIcon name="eye" className="size-4" />
                      <span className="sr-only sm:not-sr-only">Ver</span>
                    </Button>
                    {owner && (
                      <Button onClick={() => void share(item.house_id)} disabled={houseStatus(item) === 'draft'} title={houseStatus(item) === 'draft' ? 'Publique o cantinho para poder compartilhá-lo' : 'Compartilhar link'}>
                        <AdminIcon name="external" className="size-4" />
                        <span className="sr-only sm:not-sr-only">Compartilhar</span>
                      </Button>
                    )}
                    {owner && (
                      <Button variant="ghost" className="ml-auto" onClick={() => setToDelete(item)} title="Excluir cantinho">
                        <AdminIcon name="trash" className="size-4" />
                        <span className="sr-only">Excluir</span>
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>

      <ConfirmDialog
        open={!!toDelete}
        title="Excluir este cantinho?"
        body={<><b>{toDelete?.house.name}</b> será excluído junto com fotos, vídeos, músicas, textos e links de compartilhamento. Esta ação não pode ser desfeita.</>}
        confirmLabel="Excluir definitivamente"
        danger
        onCancel={() => setToDelete(null)}
        onConfirm={() => void confirmDelete()}
      />
      <Toast message={toast} onDone={clearToast} />
    </div>
  );
}
