/**
 * Peças das telas de plano: selo do plano, folha modal (bottom sheet no celular),
 * medidor de armazenamento, aviso de vencimento, comparação dos planos e
 * histórico de pagamentos.
 */
import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { EXPIRY_WARNINGS_DAYS, formatPrice, GRACE_PERIOD_DAYS, PLANS, type PlanId } from '../../data/plans';
import { useHousePlan, type HousePlan, type PlanStage } from '../../services/plans';
import { formatSize, UPLOAD_RULES } from '../../services/uploadRules';
import { AdminIcon, cx } from '../admin/controls';

const dateFormat = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

export function formatPlanDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : dateFormat.format(date);
}

/* ---------- Botão da Mini Mansão ---------- */

export const mansaoButton = 'inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-mansao px-5 text-sm font-semibold whitespace-nowrap text-white transition-colors hover:bg-mansao-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500 disabled:cursor-not-allowed disabled:opacity-45';

/* ---------- Selos ---------- */

export function PlanBadge({ planId, className }: { planId: PlanId; className?: string }) {
  const mansao = planId === 'mansao';
  return (
    <span className={cx('inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium', mansao ? 'bg-mansao-soft text-mansao-deep' : 'bg-stone-100 text-stone-700', className)}>
      {mansao && <AdminIcon name="crown" className="size-3.5" />}
      {mansao ? 'Mini Mansão' : 'Grátis'}
    </span>
  );
}

export const STAGE_STATUS: Record<PlanStage, { label: string; className: string; dot: string }> = {
  unknown: { label: 'Ativo', className: 'bg-emerald-50 text-emerald-800', dot: 'bg-emerald-600' },
  active: { label: 'Ativo', className: 'bg-emerald-50 text-emerald-800', dot: 'bg-emerald-600' },
  expiring: { label: 'Vence em breve', className: 'bg-amber-100 text-amber-900', dot: 'bg-amber-600' },
  'last-day': { label: 'Vence em breve', className: 'bg-amber-100 text-amber-900', dot: 'bg-amber-600' },
  grace: { label: 'Vencido', className: 'bg-red-50 text-red-800', dot: 'bg-red-600' },
  deletion: { label: 'Exclusão programada', className: 'bg-red-50 text-red-800', dot: 'bg-red-600' },
};

export function StageBadge({ stage }: { stage: PlanStage }) {
  const status = STAGE_STATUS[stage];
  return (
    <span className={cx('inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium', status.className)}>
      <span className={cx('size-1.5 rounded-full', status.dot)} />
      {status.label}
    </span>
  );
}

/**
 * Atalho discreto do editor: "Mini Mansão" para quem está no grátis,
 * selo do plano para quem já é Premium.
 */
export function PlanShortcut({ houseId }: { houseId: string }) {
  const plan = useHousePlan(houseId);
  if (!plan) return null;
  if (plan.planId === 'mansao') return <PlanBadge planId="mansao" className="py-1" />;
  return (
    <button
      type="button"
      aria-disabled="true"
      className="inline-flex h-9 cursor-not-allowed items-center gap-1.5 rounded-lg border border-mansao-soft bg-white px-3 text-[13px] font-medium text-mansao opacity-50 focus-visible:outline-2 focus-visible:outline-rose-500"
    >
      <AdminIcon name="crown" className="size-4" />
      Mini Mansão
    </button>
  );
}

/* ---------- Folha modal ---------- */

/**
 * Diálogo que vira bottom sheet abaixo de `sm`. Fecha com Esc ou clique fora
 * e devolve o foco a quem o abriu.
 */
export function Sheet({ open, onClose, labelledBy, children }: { open: boolean; onClose: () => void; labelledBy: string; children: ReactNode }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && closeRef.current();
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center font-admin text-sm text-stone-900 sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-stone-900/40 motion-safe:animate-fade-in" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className="relative flex max-h-[92dvh] w-full flex-col overflow-y-auto rounded-t-3xl bg-white px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-xl outline-none motion-safe:animate-sheet-in sm:max-w-md sm:rounded-2xl sm:p-6"
      >
        <span className="mx-auto mb-3 h-1 w-10 shrink-0 rounded-full bg-stone-200 sm:hidden" aria-hidden="true" />
        {children}
      </div>
    </div>
  );
}

/* ---------- Armazenamento ---------- */

export function StorageMeter({ usedBytes, limitMb }: { usedBytes: number | null; limitMb: number }) {
  const limitBytes = limitMb * 1024 * 1024;
  const ratio = usedBytes === null ? 0 : Math.min(1, usedBytes / limitBytes);
  const tone = ratio >= 0.9 ? 'bg-red-500' : ratio >= 0.75 ? 'bg-amber-500' : 'bg-mansao';
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[13px] font-semibold">Armazenamento</span>
        <span className="text-xs text-stone-500">{usedBytes === null ? `— de ${limitMb} MB` : `${formatSize(usedBytes)} de ${limitMb} MB`}</span>
      </div>
      <div
        role="meter"
        aria-label="Armazenamento utilizado"
        aria-valuemin={0}
        aria-valuemax={limitMb}
        aria-valuenow={usedBytes === null ? undefined : Math.round((usedBytes / 1024 / 1024) * 10) / 10}
        aria-valuetext={usedBytes === null ? 'Uso ainda não disponível' : `${formatSize(usedBytes)} de ${limitMb} MB`}
        className="h-2.5 overflow-hidden rounded-full bg-stone-100"
      >
        <div className={cx('h-full rounded-full transition-[width]', tone)} style={{ width: `${ratio * 100}%` }} />
      </div>
      {usedBytes === null && <p className="text-xs text-stone-500">O uso do espaço aparece aqui assim que estiver disponível.</p>}
    </div>
  );
}

/* ---------- Aviso de vencimento ---------- */

export function ExpiryNotice({ plan, stage, onRenew, onExport }: { plan: HousePlan; stage: PlanStage; onRenew: () => void; onExport?: () => void }) {
  if (stage === 'active' || stage === 'unknown') return null;
  const mansao = plan.planId === 'mansao';
  const expires = formatPlanDate(plan.expiresAt);
  const deletion = formatPlanDate(plan.deletionAt);
  const urgent = stage === 'grace' || stage === 'deletion';

  const copy = {
    expiring: {
      title: 'Faltam 7 dias para o vencimento',
      body: <>Seu plano vence {expires ? <>em <b>{expires}</b></> : 'em breve'}. {mansao ? 'Renove para manter o cantinho e as memórias no ar.' : 'Passe para a Mini Mansão e ganhe 6 meses de acesso.'}</>,
    },
    'last-day': {
      title: 'Falta 1 dia para o vencimento',
      body: <>Seu plano vence {expires ? <>em <b>{expires}</b></> : 'amanhã'}. Depois disso, o cantinho entra no período de segurança de {GRACE_PERIOD_DAYS} dias.</>,
    },
    grace: {
      title: 'Plano vencido · período de segurança',
      body: <>O cantinho e os arquivos ficam guardados por {GRACE_PERIOD_DAYS} dias depois do vencimento. {deletion ? <>Sem renovação, a exclusão está prevista para <b>{deletion}</b>.</> : 'Sem renovação, eles serão excluídos ao fim desse período.'}</>,
    },
    deletion: {
      title: 'Exclusão programada',
      body: <>{deletion ? <>Este cantinho e todos os arquivos serão excluídos em <b>{deletion}</b></> : 'Este cantinho e todos os arquivos serão excluídos em breve'}, caso não haja renovação. Renove agora para manter tudo.</>,
    },
  }[stage];

  return (
    <section role={urgent ? 'alert' : 'status'} className={cx('flex flex-col gap-4 rounded-2xl border p-4 sm:flex-row sm:items-center sm:p-5', urgent ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50')}>
      <span className={cx('flex size-10 shrink-0 items-center justify-center rounded-xl', urgent ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800')}>
        <AdminIcon name={urgent ? 'alert' : 'clock'} className="size-5" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h2 className={cx('text-[15px] font-semibold', urgent ? 'text-red-900' : 'text-amber-950')}>{copy.title}</h2>
        <p className={cx('leading-relaxed', urgent ? 'text-red-800' : 'text-amber-900')}>{copy.body}</p>
      </div>
      <div className="flex flex-col gap-2 sm:items-end">
        <button type="button" className={cx(mansaoButton, 'w-full cursor-not-allowed sm:w-auto')} onClick={onRenew} disabled>
          <AdminIcon name="crown" className="size-[18px]" />
          {mansao ? 'Renovar Mini Mansão' : 'Quero minha Mini Mansão'}
        </button>
        {urgent && onExport && (
          <button type="button" className="inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-4 text-sm font-medium text-stone-500 sm:w-auto" onClick={onExport}>
            <AdminIcon name="download" className="size-[18px]" />
            Exportar memórias
          </button>
        )}
      </div>
    </section>
  );
}

/* ---------- Comparação dos planos ---------- */

function Feature({ children, included = true }: { children: ReactNode; included?: boolean }) {
  return (
    <li className={cx('flex items-start gap-2.5', !included && 'text-stone-400')}>
      <AdminIcon name={included ? 'check' : 'close'} className={cx('mt-0.5 size-4 shrink-0', included ? 'text-mansao' : 'text-stone-300')} />
      <span>{children}</span>
    </li>
  );
}

export function PlanComparison({ currentPlanId, onChoose }: { currentPlanId: PlanId; onChoose: () => void }) {
  const free = PLANS.free;
  const mansao = PLANS.mansao;
  const rules = `Avisos ${EXPIRY_WARNINGS_DAYS[0]} e ${EXPIRY_WARNINGS_DAYS[1]} dia antes de vencer · ${GRACE_PERIOD_DAYS} dias de segurança depois · sem renovação, a casinha e os arquivos são excluídos`;
  return (
    <div className="flex flex-col gap-3">
      <ul className="grid gap-4 md:grid-cols-2">
        <li className="flex flex-col gap-5 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold">{free.name}</h3>
              <p className="mt-0.5 text-stone-500">Para começar a montar</p>
            </div>
            {currentPlanId === 'free' && <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-700">Seu plano</span>}
          </div>
          <p className="flex items-baseline gap-1.5">
            <span className="text-3xl font-bold">{formatPrice(free.priceCents)}</span>
            <span className="text-stone-500">· {free.durationLabel} de acesso</span>
          </p>
          <ul className="flex flex-col gap-2.5 text-stone-700">
            <Feature>{free.limits.storageMb} MB de armazenamento total</Feature>
            <Feature>{free.limits.photos} fotos, {free.limits.audios} áudio, {free.limits.letters} carta e {free.limits.chestTexts} texto do baú</Feature>
            <Feature>{free.limits.characters} personagens</Feature>
            <Feature>{free.customization}</Feature>
            <Feature included={false}>Sem vídeos</Feature>
            <Feature included={false}>Sem pet</Feature>
            <Feature included={false}>Sem rádio e TV</Feature>
          </ul>
          <p className="mt-auto rounded-xl bg-stone-50 p-3 text-xs leading-relaxed text-stone-500">Vence em {free.durationLabel}. {rules}.</p>
        </li>

        <li className="relative flex flex-col gap-5 rounded-2xl border-2 border-mansao bg-white p-5 shadow-md sm:p-6">
          <span className="absolute -top-3 left-5 inline-flex items-center gap-1 rounded-full bg-mansao px-2.5 py-1 text-xs font-semibold text-white">
            <AdminIcon name="crown" className="size-3.5" />
            Mais completo
          </span>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-mansao-deep">{mansao.name}</h3>
              <p className="mt-0.5 text-stone-500">O cantinho inteiro, do jeito de vocês</p>
            </div>
            {currentPlanId === 'mansao' && <span className="rounded-full bg-mansao-soft px-2.5 py-0.5 text-xs font-medium text-mansao-deep">Seu plano</span>}
          </div>
          <p className="flex flex-wrap items-baseline gap-x-1.5">
            <span className="text-3xl font-bold text-mansao-deep">{formatPrice(mansao.priceCents)}</span>
            <span className="text-stone-500">· pagamento único · {mansao.durationLabel} de acesso</span>
          </p>
          <ul className="flex flex-col gap-2.5 text-stone-700">
            <Feature>{mansao.limits.storageMb} MB de armazenamento total</Feature>
            <Feature>{mansao.limits.photos} fotos, {mansao.limits.videos} vídeos, {mansao.limits.audios} áudios, {mansao.limits.letters} cartas e {mansao.limits.chestTexts} textos do baú</Feature>
            <Feature>Até {mansao.limits.characters} personagens e {mansao.limits.pets} pet</Feature>
            <Feature>Rádio e TV incluídos</Feature>
            <Feature>{mansao.customization}</Feature>
            <Feature>Renovação manual por {formatPrice(mansao.priceCents)}</Feature>
          </ul>
          <p className="rounded-xl bg-mansao-soft/60 p-3 text-xs leading-relaxed text-mansao-deep">Vence em {mansao.durationLabel}, sem renovação automática. {rules}.</p>
          <button type="button" className={cx(mansaoButton, 'mt-auto w-full')} onClick={onChoose} disabled>
            <AdminIcon name="crown" className="size-[18px]" />
            {currentPlanId === 'mansao' ? 'Renovar Mini Mansão' : 'Escolher Mini Mansão'}
          </button>
        </li>
      </ul>
      <p className="text-xs text-stone-500">
        Nos dois planos, cada arquivo pode ter até {UPLOAD_RULES.image.maxMb} MB (imagens), {UPLOAD_RULES.audio.maxMb} MB (áudios) e {UPLOAD_RULES.video.maxMb} MB (vídeos).
      </p>
    </div>
  );
}

/* ---------- Histórico de pagamentos ---------- */

const methodLabel = { pix: 'Pix', credit: 'Crédito', debit: 'Débito' } as const;
const paymentStatusLabel = { pending: 'Pendente', approved: 'Aprovado', declined: 'Recusado' } as const;

/** Lista o que a API devolver; sem pagamentos, mostra só a estrutura vazia. */
export function PaymentHistory({ plan }: { plan: HousePlan }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
      <div className="hidden grid-cols-[1fr_1.4fr_auto_auto] gap-4 border-b border-stone-100 bg-stone-50 px-5 py-2.5 text-xs font-semibold text-stone-500 sm:grid">
        <span>Data</span>
        <span>Descrição</span>
        <span>Valor</span>
        <span>Status</span>
      </div>
      {plan.payments.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-5 py-10 text-center">
          <span className="flex size-10 items-center justify-center rounded-xl bg-stone-100 text-stone-500">
            <AdminIcon name="card" className="size-5" />
          </span>
          <p className="font-medium">Nenhum pagamento registrado</p>
          <p className="max-w-sm text-xs leading-relaxed text-stone-500">Quando os pagamentos forem confirmados, eles aparecem aqui com data, valor e meio de pagamento.</p>
        </div>
      ) : (
        <ul>
          {plan.payments.map((payment) => (
            <li key={payment.id} className="grid gap-1 border-b border-stone-100 px-5 py-3 last:border-0 sm:grid-cols-[1fr_1.4fr_auto_auto] sm:gap-4">
              <span>{formatPlanDate(payment.createdAt) ?? '—'}</span>
              <span>{PLANS[payment.planId].name} · {methodLabel[payment.method]}</span>
              <span className="font-medium">{formatPrice(payment.amountCents)}</span>
              <span className="text-stone-500">{paymentStatusLabel[payment.status]}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
