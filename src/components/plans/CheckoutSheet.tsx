import { useEffect, useId, useState } from 'react';
import type { ReactNode } from 'react';
import { MOCK_PAYMENT_OUTCOMES, type MockPaymentOutcome } from '../../data/mockPlans';
import { formatPrice, PLANS } from '../../data/plans';
import { plansDemoEnabled, startCheckout, type CheckoutResult } from '../../services/plans';
import { AdminIcon, Button, cx, Segmented } from '../admin/controls';
import { mansaoButton, Sheet } from './PlanParts';

type Step = { kind: 'summary' } | { kind: 'processing' } | { kind: 'result'; result: CheckoutResult; simulated: boolean };

const METHODS: { label: string; icon: 'pix' | 'card' }[] = [
  { label: 'Pix', icon: 'pix' },
  { label: 'Crédito', icon: 'card' },
  { label: 'Débito', icon: 'card' },
];

/**
 * Resumo da contratação (ou renovação) da Mini Mansão e os estados do pagamento.
 * Não pede dados de cartão, CPF ou banco: isso fica com o provedor de pagamento.
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
  const [simulate, setSimulate] = useState<MockPaymentOutcome>('approved');

  useEffect(() => {
    if (open) setStep({ kind: 'summary' });
  }, [open]);

  const proceed = async () => {
    setStep({ kind: 'processing' });
    const outcome = plansDemoEnabled ? simulate : undefined;
    const result = await startCheckout(houseId, plan.id, outcome).catch((): CheckoutResult => ({ status: 'error', message: 'Não conseguimos falar com o serviço de pagamento.' }));
    setStep({ kind: 'result', result, simulated: Boolean(outcome) });
  };

  return (
    <Sheet open={open} onClose={onClose} labelledBy={titleId}>
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
            <SummaryRow label="Período">{plan.durationLabel}</SummaryRow>
            <SummaryRow label="Total"><span className="text-base font-bold text-mansao-deep">{formatPrice(plan.priceCents)}</span></SummaryRow>
          </dl>

          <p className="flex items-center gap-2 rounded-xl bg-mansao-soft/60 px-3.5 py-2.5 font-medium text-mansao-deep">
            <AdminIcon name="check" className="size-4 shrink-0" />
            Pagamento único, sem renovação automática
          </p>

          <div className="flex flex-col gap-2.5">
            <h3 className="text-[13px] font-semibold">Meios de pagamento previstos</h3>
            <ul className="grid grid-cols-3 gap-2">
              {METHODS.map((method) => (
                <li key={method.label} className="flex flex-col items-center gap-1.5 rounded-xl border border-stone-200 px-2 py-3 text-[13px] text-stone-700">
                  <AdminIcon name={method.icon} className="size-5 text-stone-500" />
                  {method.label}
                </li>
              ))}
            </ul>
            <p className="text-xs leading-relaxed text-stone-500">
              A Mini Mansão só é liberada depois que o pagamento for confirmado. Você escolhe o meio de pagamento na próxima etapa, direto com o provedor — o Cantinho não pede dados de cartão, CPF ou banco.
            </p>
          </div>

          {plansDemoEnabled && (
            <div className="flex flex-col gap-2 rounded-xl border border-dashed border-stone-300 bg-stone-50 p-3">
              <span className="text-xs font-semibold text-stone-700">Simular resultado (somente desenvolvimento)</span>
              <Segmented<MockPaymentOutcome> label="Resultado simulado" value={simulate} onChange={setSimulate} options={MOCK_PAYMENT_OUTCOMES} />
              <span className="text-xs text-stone-500">Nada é cobrado e o plano não muda.</span>
            </div>
          )}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button size="lg" onClick={onClose} className="w-full sm:w-auto">Cancelar</Button>
            <button type="button" className={cx(mansaoButton, 'w-full sm:w-auto')} onClick={() => void proceed()}>
              Continuar para pagamento
            </button>
          </div>
        </div>
      )}

      {step.kind === 'processing' && (
        <div className="flex flex-col items-center gap-3 py-10 text-center" role="status">
          <span className="size-9 rounded-full border-4 border-mansao-soft border-t-mansao motion-safe:animate-spin" aria-hidden="true" />
          <h2 id={titleId} className="text-base font-semibold">Preparando o pagamento…</h2>
        </div>
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

function SummaryRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <dt className="text-stone-500">{label}</dt>
      <dd className="flex min-w-0 justify-end font-medium">{children}</dd>
    </div>
  );
}

/**
 * Tela de cada estado do pagamento. Também serve para a futura página de
 * retorno do provedor, recebendo o resultado confirmado pela API.
 */
export function PaymentStatusView({ titleId, result, simulated, onRetry, onBackToHouse, onClose }: {
  titleId?: string;
  result: CheckoutResult;
  simulated?: boolean;
  onRetry: () => void;
  onBackToHouse: () => void;
  onClose: () => void;
}) {
  const view = {
    pending: {
      icon: 'clock' as const,
      tone: 'bg-amber-100 text-amber-800',
      title: 'Estamos aguardando a confirmação do pagamento.',
      body: 'Assim que o provedor confirmar, a Mini Mansão é liberada neste cantinho. Você pode fechar esta janela.',
      action: <Button size="lg" variant="primary" onClick={onClose} className="w-full">Entendi</Button>,
    },
    approved: {
      icon: 'crown' as const,
      tone: 'bg-mansao-soft text-mansao-deep',
      title: 'Sua Mini Mansão está pronta!',
      body: 'Agora o cantinho tem mais espaço, vídeos, pet e personalização completa por 6 meses.',
      action: <button type="button" className={cx(mansaoButton, 'w-full')} onClick={onBackToHouse}>Voltar ao meu cantinho</button>,
    },
    declined: {
      icon: 'alert' as const,
      tone: 'bg-red-100 text-red-700',
      title: 'Não foi possível concluir seu pagamento.',
      body: 'O pagamento não foi aprovado. Você pode tentar de novo ou escolher outro meio de pagamento.',
      action: <button type="button" className={cx(mansaoButton, 'w-full')} onClick={onRetry}>Tentar novamente</button>,
    },
    error: {
      icon: 'alert' as const,
      tone: 'bg-stone-100 text-stone-700',
      title: 'Não conseguimos falar com o serviço de pagamento.',
      body: `${result.status === 'error' ? `${result.message} ` : ''}Confira sua conexão e tente de novo em instantes.`,
      action: <Button size="lg" variant="primary" onClick={onRetry} className="w-full">Voltar ao resumo</Button>,
    },
    unavailable: {
      icon: 'clock' as const,
      tone: 'bg-stone-100 text-stone-700',
      title: 'Pagamentos indisponíveis',
      body: 'A contratação da Mini Mansão ainda não está disponível. Nenhuma cobrança foi feita.',
      action: <Button size="lg" variant="primary" onClick={onRetry} className="w-full">Voltar ao resumo</Button>,
    },
  }[result.status];

  return (
    <div className="flex flex-col items-center gap-4 py-4 text-center" role={result.status === 'declined' || result.status === 'error' ? 'alert' : 'status'}>
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
        {result.status !== 'pending' && (
          <Button size="lg" variant="ghost" onClick={onClose} className="w-full">Fechar</Button>
        )}
      </div>
    </div>
  );
}
