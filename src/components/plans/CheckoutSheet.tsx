import { useCallback, useEffect, useId, useState } from 'react';
import type { ReactNode } from 'react';
import { MOCK_PAYMENT_OUTCOMES, type MockPaymentOutcome } from '../../data/mockPlans';
import { formatPrice, PLANS } from '../../data/plans';
import { cloudConfigured } from '../../services/auth';
import { fetchPaymentOrder, notifyPlanChanged, plansDemoEnabled, startCheckout, type CheckoutResult, type PaymentOrder } from '../../services/plans';
import { AdminIcon, Button, cx, Segmented } from '../admin/controls';
import { formatPlanDate, mansaoButton, Sheet } from './PlanParts';

type Step = { kind: 'summary' } | { kind: 'processing' } | { kind: 'redirecting' } | { kind: 'result'; result: CheckoutResult; simulated: boolean };
type DevChoice = MockPaymentOutcome | 'api';

const DEV_CHOICES: { id: DevChoice; label: string }[] = [{ id: 'api', label: 'Mercado Pago (teste)' }, ...MOCK_PAYMENT_OUTCOMES];
const CONNECTION_ERROR = 'Não conseguimos falar com o serviço de pagamento.';

/**
 * Resumo da contratação (ou renovação) da Mini Mansão. O pagamento acontece
 * no Mercado Pago: o Cantinho não pede dados de cartão, CPF ou banco.
 */
export function CheckoutSheet({ open, mode, houseId, houseName, onClose, onBackToHouse }: {
  open: boolean;
  mode: 'upgrade' | 'renew';
  houseId: string;
  houseName: string;
  onClose: () => void;
  onBackToHouse: () => void;
}) {
  const titleId = useId();
  const plan = PLANS.mansao;
  const [step, setStep] = useState<Step>({ kind: 'summary' });
  const [devChoice, setDevChoice] = useState<DevChoice>(cloudConfigured ? 'api' : 'approved');

  useEffect(() => {
    if (open) setStep({ kind: 'summary' });
  }, [open]);

  const proceed = async () => {
    setStep({ kind: 'processing' });
    const simulate = plansDemoEnabled && devChoice !== 'api' ? devChoice : undefined;
    const result = await startCheckout(houseId, simulate).catch((): CheckoutResult => ({ status: 'error', message: CONNECTION_ERROR }));
    if (result.status === 'redirect') {
      setStep({ kind: 'redirecting' });
      window.location.assign(result.checkoutUrl);
      return;
    }
    setStep({ kind: 'result', result, simulated: Boolean(simulate) });
  };

  return (
    <Sheet open={open} onClose={step.kind === 'redirecting' ? () => undefined : onClose} labelledBy={titleId}>
      {step.kind === 'summary' && (
        <div className="flex flex-col gap-5">
          <div className="flex items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-mansao-soft text-mansao-deep">
              <AdminIcon name="crown" className="size-6" />
            </span>
            <div className="min-w-0">
              <h2 id={titleId} className="text-lg font-semibold">{mode === 'renew' ? 'Renovar Mini Mansão' : 'Contratar Mini Mansão'}</h2>
              <p className="text-stone-500">Confira o resumo antes de continuar.</p>
            </div>
          </div>

          <dl className="flex flex-col divide-y divide-stone-100 rounded-2xl border border-stone-200">
            <SummaryRow label="Cantinho"><span className="truncate">{houseName}</span></SummaryRow>
            <SummaryRow label="Plano">{plan.name}</SummaryRow>
            <SummaryRow label="Período">{mode === 'renew' ? `+ ${plan.durationLabel}` : plan.durationLabel}</SummaryRow>
            <SummaryRow label="Total"><span className="text-base font-bold text-mansao-deep">{formatPrice(plan.priceCents)}</span></SummaryRow>
          </dl>

          <p className="flex items-center gap-2 rounded-xl bg-mansao-soft/60 px-3.5 py-2.5 font-medium text-mansao-deep">
            <AdminIcon name="check" className="size-4 shrink-0" />
            Pagamento único, sem renovação automática
          </p>
          {mode === 'renew' && (
            <p className="-mt-2 text-xs leading-relaxed text-stone-500">Se a Mini Mansão ainda estiver ativa, os 6 meses são somados ao vencimento atual — você não perde nenhum dia.</p>
          )}

          {plansDemoEnabled && (
            <div className="flex flex-col gap-2 rounded-xl border border-dashed border-stone-300 bg-stone-50 p-3">
              <span className="text-xs font-semibold text-stone-700">Resultado (somente desenvolvimento)</span>
              <Segmented<DevChoice> label="Resultado simulado" value={devChoice} onChange={setDevChoice} options={DEV_CHOICES} />
              <span className="text-xs text-stone-500">
                {devChoice === 'api' ? 'Usa a API com as credenciais de teste do Mercado Pago.' : 'Simulação local: nada é cobrado e o plano não muda.'}
              </span>
            </div>
          )}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button size="lg" onClick={onClose} className="w-full sm:w-auto">Cancelar</Button>
            <button type="button" className={cx(mansaoButton, 'w-full sm:w-auto')} onClick={() => void proceed()}>
              Pagar com Mercado Pago
            </button>
          </div>
        </div>
      )}

      {(step.kind === 'processing' || step.kind === 'redirecting') && (
        <Waiting titleId={titleId} title={step.kind === 'processing' ? 'Preparando o pagamento…' : 'Levando você ao Mercado Pago…'} />
      )}

      {step.kind === 'result' && (
        <PaymentStatusView
          titleId={titleId}
          result={step.result}
          simulated={step.simulated}
          onRetry={() => setStep({ kind: 'summary' })}
          onBackToHouse={onBackToHouse}
          onClose={onClose}
        />
      )}
    </Sheet>
  );
}

function Waiting({ titleId, title, body }: { titleId?: string; title: string; body?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center" role="status">
      <span className="size-9 rounded-full border-4 border-mansao-soft border-t-mansao motion-safe:animate-spin" aria-hidden="true" />
      <h2 id={titleId} className="text-base font-semibold">{title}</h2>
      {body && <p className="max-w-xs text-stone-500">{body}</p>}
    </div>
  );
}

function SummaryRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <dt className="text-stone-500">{label}</dt>
      <dd className="flex min-w-0 justify-end font-medium">{children}</dd>
    </div>
  );
}

/** Intervalos de consulta depois do retorno: rápido no começo, depois espaçado. */
const POLL_DELAYS_MS = [0, 2000, 3000, 4000, 5000, 8000, 10000, 15000, 20000, 30000];

/**
 * Volta do Mercado Pago (/plano?pedido=ID). Os parâmetros que o Mercado Pago
 * acrescenta à URL são ignorados: o estado vem da API, que confere a order
 * direto no Mercado Pago.
 */
export function PaymentReturnSheet({ orderId, onClose, onBackToHouse, onRetry }: {
  orderId: string;
  onClose: () => void;
  onBackToHouse: () => void;
  onRetry: () => void;
}) {
  const titleId = useId();
  const [order, setOrder] = useState<PaymentOrder | null>(null);
  const [failed, setFailed] = useState(false);
  const [round, setRound] = useState(0);

  useEffect(() => {
    let alive = true;
    let timer = 0;
    let attempt = 0;
    setFailed(false);
    const poll = async () => {
      try {
        const next = await fetchPaymentOrder(orderId);
        if (!alive) return;
        setOrder(next);
        if (next.status === 'approved') notifyPlanChanged();
        if (next.status !== 'pending') return;
      } catch {
        if (!alive) return;
        setFailed(true);
        return;
      }
      attempt += 1;
      if (attempt < POLL_DELAYS_MS.length) timer = window.setTimeout(() => void poll(), POLL_DELAYS_MS[attempt]);
    };
    void poll();
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [orderId, round]);

  const retryLookup = useCallback(() => setRound((value) => value + 1), []);

  let content: ReactNode;
  if (failed && !order) {
    content = (
      <PaymentStatusView
        titleId={titleId}
        result={{ status: 'error', message: 'Não conseguimos confirmar o estado do seu pagamento agora.' }}
        retryLabel="Consultar de novo"
        onRetry={retryLookup}
        onBackToHouse={onBackToHouse}
        onClose={onClose}
      />
    );
  } else if (!order) {
    content = <Waiting titleId={titleId} title="Conferindo seu pagamento…" body="Estamos confirmando com o Mercado Pago." />;
  } else {
    content = (
      <PaymentStatusView
        titleId={titleId}
        result={{ status: order.status === 'error' ? 'canceled' : order.status, order }}
        onRetry={order.status === 'pending' ? retryLookup : onRetry}
        retryLabel={order.status === 'pending' ? 'Atualizar' : undefined}
        onBackToHouse={onBackToHouse}
        onClose={onClose}
      />
    );
  }

  return <Sheet open onClose={onClose} labelledBy={titleId}>{content}</Sheet>;
}

/** Tela de cada estado do pagamento (no checkout e no retorno do Mercado Pago). */
export function PaymentStatusView({ titleId, result, simulated, retryLabel, onRetry, onBackToHouse, onClose }: {
  titleId?: string;
  result: CheckoutResult;
  simulated?: boolean;
  retryLabel?: string;
  onRetry: () => void;
  onBackToHouse: () => void;
  onClose: () => void;
}) {
  if (result.status === 'redirect') return <Waiting titleId={titleId} title="Levando você ao Mercado Pago…" />;
  const order = 'order' in result ? result.order : undefined;
  const until = formatPlanDate(order?.expiresAt ?? null);
  const retry = (label: string, primary = true) =>
    primary
      ? <button type="button" className={cx(mansaoButton, 'w-full')} onClick={onRetry}>{retryLabel ?? label}</button>
      : <Button size="lg" variant="primary" onClick={onRetry} className="w-full">{retryLabel ?? label}</Button>;

  const view = {
    pending: {
      icon: 'clock' as const,
      tone: 'bg-amber-100 text-amber-800',
      title: 'Estamos aguardando a confirmação do pagamento.',
      body: 'Se você pagou com Pix, a confirmação costuma levar poucos instantes. Assim que o Mercado Pago confirmar, a Mini Mansão é liberada neste cantinho — você pode fechar esta janela.',
      action: retryLabel ? retry(retryLabel, false) : <Button size="lg" variant="primary" onClick={onClose} className="w-full">Entendi</Button>,
    },
    approved: {
      icon: 'crown' as const,
      tone: 'bg-mansao-soft text-mansao-deep',
      title: 'Sua Mini Mansão está pronta!',
      body: until ? `Pagamento confirmado. O cantinho tem Mini Mansão até ${until}.` : 'Pagamento confirmado. O cantinho tem mais espaço, vídeos, pet e personalização completa por 6 meses.',
      action: <button type="button" className={cx(mansaoButton, 'w-full')} onClick={onBackToHouse}>Voltar ao meu cantinho</button>,
    },
    declined: {
      icon: 'alert' as const,
      tone: 'bg-red-100 text-red-700',
      title: 'Não foi possível concluir seu pagamento.',
      body: 'O pagamento foi recusado e nada foi cobrado. Você pode tentar de novo ou escolher outro meio de pagamento.',
      action: retry('Tentar novamente'),
    },
    canceled: {
      icon: 'alert' as const,
      tone: 'bg-stone-100 text-stone-700',
      title: 'Este pagamento não foi concluído.',
      body: 'O pedido foi cancelado ou expirou sem pagamento. Nada foi cobrado.',
      action: retry('Tentar novamente'),
    },
    refunded: {
      icon: 'alert' as const,
      tone: 'bg-stone-100 text-stone-700',
      title: 'Pagamento reembolsado',
      body: 'Este pagamento foi devolvido e o período correspondente da Mini Mansão foi retirado.',
      action: <Button size="lg" variant="primary" onClick={onClose} className="w-full">Entendi</Button>,
    },
    charged_back: {
      icon: 'alert' as const,
      tone: 'bg-red-100 text-red-700',
      title: 'Pagamento contestado',
      body: 'Este pagamento foi contestado junto ao emissor e o período correspondente da Mini Mansão foi retirado.',
      action: <Button size="lg" variant="primary" onClick={onClose} className="w-full">Entendi</Button>,
    },
    needs_review: {
      icon: 'clock' as const,
      tone: 'bg-amber-100 text-amber-800',
      title: 'Pagamento em análise',
      body: 'Recebemos uma informação do Mercado Pago que precisa ser conferida. Nossa equipe vai verificar e entrar em contato se for preciso.',
      action: <Button size="lg" variant="primary" onClick={onClose} className="w-full">Entendi</Button>,
    },
    error: {
      icon: 'alert' as const,
      tone: 'bg-stone-100 text-stone-700',
      title: 'Falha temporária de comunicação',
      body: `${result.status === 'error' ? `${result.message} ` : ''}Nenhuma cobrança foi confirmada por aqui. Confira sua conexão e tente de novo em instantes.`,
      action: retry('Voltar ao resumo', false),
    },
    unavailable: {
      icon: 'clock' as const,
      tone: 'bg-stone-100 text-stone-700',
      title: 'Pagamentos indisponíveis',
      body: 'A contratação da Mini Mansão ainda não está disponível neste ambiente. Nenhuma cobrança foi feita.',
      action: retry('Voltar ao resumo', false),
    },
  }[result.status];

  return (
    <div className="flex flex-col items-center gap-4 py-4 text-center" role={['declined', 'error', 'charged_back'].includes(result.status) ? 'alert' : 'status'}>
      <span className={cx('flex size-14 items-center justify-center rounded-2xl', view.tone)}>
        <AdminIcon name={view.icon} className="size-7" />
      </span>
      <div className="flex flex-col gap-1.5">
        <h2 id={titleId} className="text-lg font-semibold text-balance">{view.title}</h2>
        <p className="leading-relaxed text-stone-600">{view.body}</p>
      </div>
      {simulated && (
        <p className="rounded-lg border border-dashed border-stone-300 bg-stone-50 px-3 py-2 text-xs text-stone-500">
          Simulação de desenvolvimento: nenhum pagamento foi feito e o plano não mudou.
        </p>
      )}
      <div className="flex w-full flex-col gap-2">
        {view.action}
        {(result.status !== 'pending' || retryLabel) && (
          <Button size="lg" variant="ghost" onClick={onClose} className="w-full">Fechar</Button>
        )}
      </div>
    </div>
  );
}
