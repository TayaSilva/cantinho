import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { MOCK_PLAN_SCENARIOS, type MockPlanScenario } from '../../data/mockPlans';
import { formatPrice, PLANS } from '../../data/plans';
import { navigate, useRoute } from '../../hooks/useRoute';
import { houseAdminPath } from '../../services/houses';
import { getDevScenario, planStage, plansDemoEnabled, setDevScenario, useHousePlan } from '../../services/plans';
import type { HouseDocument } from '../../types/house';
import { AdminIcon, Button, cx } from '../admin/controls';
import { CheckoutSheet, PaymentReturnSheet } from './CheckoutSheet';
import { formatPlanDate, ExpiryNotice, mansaoButton, PaymentHistory, PlanBadge, PlanComparison, StageBadge, StorageMeter } from './PlanParts';
import { PREMIUM_FEATURES, usePremiumPrompt, type PremiumFeature } from './PremiumFeatureModal';

type UsageIcon = 'image' | 'video' | 'music' | 'letter' | 'gift' | 'person' | 'paw';

const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

/** /admin/cantinho/:id/plano — plano atual, vencimento, uso e comparação. */
export function PlanPage({ houseId, houseName, doc }: { houseId: string; houseName: string; doc: HouseDocument | null }) {
  const plan = useHousePlan(houseId);
  const premium = usePremiumPrompt(() => scrollTo('comparar'));
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  // Retorno do Mercado Pago: só o id do pedido importa; o estado vem da API.
  const { search } = useRoute();
  const returnedOrder = search.get('pedido');
  const planPath = houseAdminPath(houseId, '/plano');
  const closeReturn = () => navigate(planPath);

  useEffect(() => {
    document.title = 'Meu plano · Cantinho Admin';
  }, []);

  if (!plan) return <p className="p-10 text-center text-stone-500">Carregando plano…</p>;

  const def = PLANS[plan.planId];
  const limits = plan.limits;
  const mansao = plan.planId === 'mansao';
  const { stage } = planStage(plan);
  const expired = stage === 'grace' || stage === 'deletion';
  const expires = formatPlanDate(plan.expiresAt);
  const deletion = formatPlanDate(plan.deletionAt);
  const openCheckout = () => setCheckoutOpen(true);

  const ap = doc?.appearance;
  const content = doc?.content;
  const usage: { feature: PremiumFeature; label: string; icon: UsageIcon; used: number; limit: number }[] = ap && content
    ? [
        { feature: 'photos', label: 'Fotos', icon: 'image', used: content.photos.length, limit: limits.photos },
        { feature: 'videos', label: 'Vídeos', icon: 'video', used: content.videos.length, limit: limits.videos },
        { feature: 'audios', label: 'Áudios', icon: 'music', used: content.playlist.tracks.length, limit: limits.audios },
        { feature: 'letters', label: 'Cartas', icon: 'letter', used: content.letters.length, limit: limits.letters },
        { feature: 'chestTexts', label: 'Textos do baú', icon: 'gift', used: content.chestMessages.filter((item) => item.text.trim()).length, limit: limits.chestTexts },
        { feature: 'characters', label: 'Personagens', icon: 'person', used: ap.characters.filter((c, i) => i === 0 || c.enabled !== false).length, limit: limits.characters },
        { feature: 'pet', label: 'Pet', icon: 'paw', used: ap.pet.enabled ? 1 : 0, limit: limits.pets },
      ]
    : [];

  return (
    <main className="min-h-0 min-w-0 flex-1 overflow-y-auto px-4 py-6 sm:px-8 lg:py-7">
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <div className="flex flex-col gap-1">
          <h1 className="text-[22px] font-bold text-stone-900">Meu plano</h1>
          <p className="truncate text-stone-600">{houseName}</p>
        </div>

        {plan.demo && (
          <p className="rounded-xl border border-dashed border-stone-300 bg-white px-4 py-2.5 text-xs text-stone-600">
            <b>Demonstração:</b> datas, uso e status deste plano são fictícios e existem só no ambiente de desenvolvimento.
          </p>
        )}

        <ExpiryNotice plan={plan} stage={stage} onRenew={openCheckout} onExport={() => scrollTo('exportar')} />

        <section aria-label="Plano atual" className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
          <div className="flex flex-col gap-5 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <PlanBadge planId={plan.planId} />
              <StageBadge stage={stage} />
            </div>
            <div>
              <h2 className={cx('text-xl font-bold', mansao && 'text-mansao-deep')}>{def.name}</h2>
              <p className="mt-0.5 text-stone-500">
                {mansao ? `${formatPrice(def.priceCents)} · pagamento único · ${def.durationLabel} de acesso` : `Gratuito · ${def.durationLabel} de acesso`}
              </p>
            </div>
            <dl className="grid gap-3 sm:grid-cols-2">
              <InfoItem label={expired ? 'Venceu em' : 'Vencimento'}>
                {expires ?? <span className="font-normal text-stone-500">Data ainda não disponível</span>}
              </InfoItem>
              {deletion && <InfoItem label="Exclusão prevista"><span className="text-red-700">{deletion}</span></InfoItem>}
            </dl>
            <StorageMeter usedBytes={plan.storageUsedBytes} limitMb={limits.storageMb} />
          </div>

          {mansao ? (
            <div className="flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
              <span className="flex size-11 items-center justify-center rounded-xl bg-mansao-soft text-mansao-deep">
                <AdminIcon name="crown" className="size-6" />
              </span>
              <div className="flex flex-col gap-1">
                <h2 className="text-base font-semibold">Renovação manual</h2>
                <p className="leading-relaxed text-stone-600">
                  Não há renovação automática. Para mais {def.durationLabel}, renove por {formatPrice(def.priceCents)} quando quiser{expires ? `, antes de ${expires}` : ''}.
                </p>
              </div>
              <button type="button" className={cx(mansaoButton, 'mt-auto w-full')} onClick={openCheckout}>
                <AdminIcon name="crown" className="size-[18px]" />
                Renovar Mini Mansão
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4 rounded-2xl bg-gradient-to-br from-mansao-soft to-rose-100 p-5 text-mansao-deep shadow-sm sm:p-6">
              <span className="flex size-11 items-center justify-center rounded-xl bg-white/70">
                <AdminIcon name="crown" className="size-6" />
              </span>
              <div className="flex flex-col gap-1">
                <h2 className="text-base font-semibold">Mini Mansão</h2>
                <p className="leading-relaxed">Mais espaço, vídeos, pet e personalização completa por {PLANS.mansao.durationLabel}.</p>
              </div>
              <p className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold">{formatPrice(PLANS.mansao.priceCents)}</span>
                <span className="text-[13px]">pagamento único</span>
              </p>
              <button type="button" className={cx(mansaoButton, 'mt-auto w-full')} onClick={openCheckout}>
                <AdminIcon name="crown" className="size-[18px]" />
                Quero minha Mini Mansão
              </button>
            </div>
          )}
        </section>

        {usage.length > 0 && (
          <Section title="Recursos do seu plano" description={`${def.customization} · ${limits.storageMb} MB no total.`}>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {usage.map((item) => {
                const included = item.limit > 0;
                const over = included && item.used > item.limit;
                return (
                  <li key={item.label} className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white p-4">
                    <span className={cx('flex size-10 shrink-0 items-center justify-center rounded-xl', included ? 'bg-rose-50 text-rose-700' : 'bg-stone-100 text-stone-400')}>
                      <AdminIcon name={item.icon} className="size-5" />
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="font-medium">{item.label}</span>
                      {included ? (
                        <span className={cx('text-xs', over ? 'text-amber-700' : 'text-stone-500')}>
                          {item.used} de {item.limit} {over && '· acima do limite do plano'}
                        </span>
                      ) : (
                        <span className="text-xs text-stone-500">Não incluso no {def.name}</span>
                      )}
                    </div>
                    {!included && (
                      <button type="button" onClick={() => premium.prompt(item.feature)} className="inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-1 rounded-lg px-2.5 text-xs font-semibold text-mansao hover:bg-mansao-soft/60 focus-visible:outline-2 focus-visible:outline-rose-500">
                        <AdminIcon name="crown" className="size-4" />
                        Mini Mansão
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </Section>
        )}

        {(mansao || plan.payments.length > 0) && (
          <Section title="Histórico de pagamentos" description="Os pedidos de pagamento deste cantinho.">
            <PaymentHistory plan={plan} />
          </Section>
        )}

        <Section id="comparar" title="Compare os planos" description="Escolha o que combina com o seu cantinho.">
          <PlanComparison currentPlanId={plan.planId} onChoose={openCheckout} />
        </Section>

        <Section id="exportar" title="Exportar memórias" description="Baixe fotos, vídeos, áudios e cartas antes de qualquer exclusão.">
          <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-stone-300 bg-white p-5 sm:flex-row sm:items-center">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-stone-100 text-stone-500">
              <AdminIcon name="download" className="size-5" />
            </span>
            <p className="flex-1 leading-relaxed text-stone-600">A exportação das memórias vai ficar disponível aqui em breve.</p>
            <Button size="lg" disabled className="w-full sm:w-auto">Em breve</Button>
          </div>
        </Section>

        {plansDemoEnabled && <DemoPanel houseId={houseId} onPreviewFeature={premium.prompt} />}
      </div>

      {premium.element}
      <CheckoutSheet
        open={checkoutOpen}
        mode={mansao ? 'renew' : 'upgrade'}
        houseId={houseId}
        houseName={houseName}
        onClose={() => setCheckoutOpen(false)}
        onBackToHouse={() => navigate(houseAdminPath(houseId))}
      />
      {returnedOrder && (
        <PaymentReturnSheet
          orderId={returnedOrder}
          onClose={closeReturn}
          onBackToHouse={() => navigate(houseAdminPath(houseId))}
          onRetry={() => {
            closeReturn();
            setCheckoutOpen(true);
          }}
        />
      )}
    </main>
  );
}

function Section({ id, title, description, children }: { id?: string; title: string; description?: string; children: ReactNode }) {
  return (
    <section id={id} className="flex scroll-mt-4 flex-col gap-4" aria-labelledby={id ? `${id}-title` : undefined}>
      <div className="flex flex-col gap-1">
        <h2 id={id ? `${id}-title` : undefined} className="text-base font-semibold">{title}</h2>
        {description && <p className="text-stone-600">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function InfoItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-xl bg-stone-50 px-3.5 py-2.5">
      <dt className="text-xs text-stone-500">{label}</dt>
      <dd className="font-semibold">{children}</dd>
    </div>
  );
}

/** Só em desenvolvimento: troca o cenário fictício do plano e abre os convites Premium. */
function DemoPanel({ houseId, onPreviewFeature }: { houseId: string; onPreviewFeature: (feature: PremiumFeature) => void }) {
  const scenario = getDevScenario(houseId) ?? '';
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-dashed border-stone-300 bg-stone-100/60 p-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-[13px] font-semibold">Revisão visual (somente desenvolvimento)</h2>
        <p className="text-xs text-stone-500">Os cenários usam dados fictícios. Nenhum pagamento, exclusão ou mudança de plano acontece.</p>
      </div>
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-stone-700">Cenário do plano</span>
        <select
          value={scenario}
          onChange={(event) => setDevScenario(houseId, (event.target.value || null) as MockPlanScenario | null)}
          className="h-11 rounded-xl border border-stone-200 bg-white px-3 text-sm outline-none focus:border-rose-500 sm:max-w-xs"
        >
          <option value="">Padrão (sem dados do servidor)</option>
          {MOCK_PLAN_SCENARIOS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
      </label>
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-stone-700">Convite de recurso Premium</span>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(PREMIUM_FEATURES) as PremiumFeature[]).map((feature) => (
            <Button key={feature} onClick={() => onPreviewFeature(feature)}>{PREMIUM_FEATURES[feature].label}</Button>
          ))}
        </div>
      </div>
    </section>
  );
}
