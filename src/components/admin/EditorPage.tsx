import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { getOption, optionsFor, petAccessoryFits, str } from '../../data/catalog';
import {
  categoryOf,
  decorationLabels,
  furnitureOrder,
  interactiveFurniture,
  targetLabels,
} from '../../data/houseConfig';
import type { EditorCategory, EditorTarget } from '../../data/houseConfig';
import type { HouseDraft } from '../../hooks/useHouseDraft';
import { useHouseTime } from '../../hooks/useHouseTime';
import { navigate } from '../../hooks/useRoute';
import { houseAdminPath } from '../../services/houses';
import { canUseFeature, useHousePlan } from '../../services/plans';
import type { CharacterAge, CharacterAppearance, DecorationKey, ElementType, FurnitureKey, HouseAppearance, HouseContent, Period } from '../../types/house';
import { HouseScene } from '../house/HouseScene';
import { PlanShortcut } from '../plans/PlanParts';
import { usePremiumPrompt, type PremiumFeature } from '../plans/PremiumFeatureModal';
import { AdminIcon, cx, Field, Group, Segmented, Swatches, TextField, ThumbGrid, Toggle } from './controls';
import { OptionThumb } from './Thumbnails';
import { QuizPanel } from './QuizPanel';

const CATEGORIES: { id: EditorCategory; label: string; icon: 'home' | 'sofa' | 'person' | 'paw' | 'star' | 'computer' }[] = [
  { id: 'ambiente', label: 'Ambiente', icon: 'home' },
  { id: 'moveis', label: 'Móveis', icon: 'sofa' },
  { id: 'personagem1', label: 'Personagem 1', icon: 'person' },
  { id: 'personagem2', label: 'Personagem 2', icon: 'person' },
  { id: 'personagem3', label: 'Personagem 3', icon: 'person' },
  { id: 'personagem4', label: 'Personagem 4', icon: 'person' },
  { id: 'animal', label: 'Animalzinho', icon: 'paw' },
  { id: 'quiz', label: 'Quiz', icon: 'computer' },
  { id: 'decoracoes', label: 'Decorações', icon: 'star' },
];

/** Tipo do catálogo usado por cada móvel. */
const FURNITURE_TYPE: Record<FurnitureKey, ElementType> = {
  sofa: 'sofa',
  sofa2: 'sofa',
  table: 'table',
  rug: 'rug',
  bookshelf: 'bookshelf',
  radio: 'radio',
  tv: 'tv',
  frame: 'frame',
  calendar: 'calendar',
  lamp: 'lamp',
  chest: 'chest',
  plants: 'plants',
  cushions: 'cushions',
  desk: 'desk',
  computer: 'computer',
};

/** O que cada objeto interativo guarda (para avisar que ocultar não apaga nada). */
const LINKED_CONTENT: Partial<Record<FurnitureKey, string>> = {
  bookshelf: 'as cartas',
  tv: 'os vídeos',
  radio: 'as músicas',
  frame: 'as fotos',
  calendar: 'as datas especiais',
  chest: 'as mensagens surpresa',
  lamp: 'a configuração de iluminação',
};

type PeriodChoice = 'auto' | Period;

/**
 * /admin/editor — Personalizar cantinho.
 * Menu de categorias · pré-visualização clicável · painel de propriedades.
 */
export function EditorPage({ draft }: { draft: HouseDraft }) {
  const doc = draft.doc;
  const [category, setCategory] = useState<EditorCategory>('ambiente');
  const [selected, setSelected] = useState<EditorTarget | null>(null);
  const [furnitureKey, setFurnitureKey] = useState<FurnitureKey>('sofa');
  const [periodChoice, setPeriodChoice] = useState<PeriodChoice>('auto');
  const [lampOn, setLampOn] = useState(true);
  const dynamic = doc?.appearance.environment.dynamicWindow ?? true;
  const { theme, clock } = useHouseTime(periodChoice === 'auto' ? null : periodChoice, dynamic);
  const plan = useHousePlan(draft.houseId);
  const premium = usePremiumPrompt(() => navigate(houseAdminPath(draft.houseId, '/plano')));

  useEffect(() => {
    if (plan?.planId === 'mansao' && doc?.appearance.environment.layout !== 'mansao') {
      draft.update((d) => void (d.appearance.environment.layout = 'mansao'), 'mansao-layout');
    }
  }, [doc, draft, plan?.planId]);

  // Rola o painel até a seção do elemento escolhido na prévia.
  useEffect(() => {
    if (!selected) return;
    const id = window.setTimeout(() => document.getElementById(`sec-${selected}`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 60);
    return () => window.clearTimeout(id);
  }, [selected, category]);

  if (!doc) return null;
  const ap = doc.appearance;
  const setAp = (fn: (a: HouseAppearance) => void, key?: string) => draft.update((d) => fn(d.appearance), key);
  const setContent = (fn: (c: HouseContent) => void, key?: string) => draft.update((d) => fn(d.content), key);

  const featureForCategory = (value: EditorCategory): PremiumFeature | null =>
    value === 'personagem3' || value === 'personagem4' ? 'characters' : value === 'animal' ? 'pet' : value === 'quiz' ? 'quiz' : null;
  const featureForFurniture = (value: FurnitureKey): PremiumFeature | null =>
    value === 'radio' ? 'radio' : value === 'tv' ? 'tv' : value === 'desk' || value === 'computer' ? 'customization' : null;
  const isLocked = (feature: PremiumFeature | null) => Boolean(plan && feature && !canUseFeature(
    plan,
    feature === 'characters' ? 'character3' : feature === 'pet' ? 'pet' : feature === 'radio' ? 'radio' : feature === 'tv' ? 'tv' : feature === 'quiz' ? 'quiz' : 'customization',
  ));
  const notifyLocked = (feature: PremiumFeature | null) => { if (isLocked(feature)) premium.prompt(feature as PremiumFeature); };

  const select = (target: EditorTarget) => {
    const feature = target === 'character3' || target === 'character4' ? 'characters' : target === 'pet' ? 'pet' : target === 'radio' ? 'radio' : target === 'tv' ? 'tv' : target === 'desk' || target === 'computer' ? 'customization' : null;
    if (isLocked(feature)) {
      premium.prompt(feature as PremiumFeature);
      return;
    }
    setSelected(target);
    setCategory(categoryOf(target));
    if (target in ap.furniture) setFurnitureKey(target as FurnitureKey);
  };

  const chooseCategory = (c: EditorCategory) => {
    const feature = featureForCategory(c);
    if (isLocked(feature)) {
      premium.prompt(feature as PremiumFeature);
      return;
    }
    setCategory(c);
    setSelected(c === 'personagem1' ? 'character1' : c === 'personagem2' ? 'character2' : c === 'animal' ? 'pet' : c === 'moveis' ? furnitureKey : null);
  };

  const categorySub = (c: EditorCategory) => {
    const slot = ['personagem1', 'personagem2', 'personagem3', 'personagem4'].indexOf(c);
    if (slot >= 0) return slot > 0 && ap.characters[slot].enabled === false ? 'Oculto' : ap.characters[slot].name;
    return c === 'animal' ? (ap.pet.enabled ? ap.pet.name : 'Oculto') : undefined;
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
      {/* ---------- Menu de categorias ---------- */}
      <aside className="shrink-0 border-b border-stone-200 bg-white lg:w-[232px] lg:border-r lg:border-b-0">
        <p className="hidden px-6 pt-5 pb-2 text-xs font-semibold tracking-[.06em] text-stone-500 uppercase lg:block">Editor visual</p>
        <nav aria-label="Categorias" className="flex gap-1 overflow-x-auto px-3 py-2 lg:flex-col lg:gap-0.5 lg:px-3 lg:py-0">
          {CATEGORIES.map((c) => {
            const active = category === c.id;
            const locked = isLocked(featureForCategory(c.id));
            // Item bloqueado mostra só o cadeado, sem o "Oculto" ao lado.
            const sub = locked ? undefined : categorySub(c.id);
            return (
              <button
                key={c.id}
                type="button"
                aria-current={active ? 'true' : undefined}
                onClick={() => chooseCategory(c.id)}
                className={cx(
                  'flex shrink-0 cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm focus-visible:outline-2 focus-visible:outline-rose-500',
                  active ? 'bg-rose-50 font-semibold text-rose-900' : 'text-stone-700 hover:bg-stone-50',
                )}
              >
                <AdminIcon name={c.icon} />
                <span className="flex-1">{c.label}</span>
                {locked && (
                  <span role="img" aria-label="Bloqueado no plano Free" title="Bloqueado no plano Free" className="text-stone-400">
                    <AdminIcon name="lock" className="size-4" />
                  </span>
                )}
                {sub && <span className={cx('hidden text-xs lg:inline', active ? 'font-medium' : 'text-stone-500')}>{sub}</span>}
              </button>
            );
          })}
        </nav>
        <p className="mx-6 mt-6 hidden rounded-xl bg-stone-100 p-3 text-[13px] leading-relaxed text-stone-600 lg:block">Dica: clique num objeto da prévia para editá-lo direto.</p>
      </aside>

      {/* ---------- Pré-visualização ---------- */}
      <section aria-label="Pré-visualização" className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 p-4 lg:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg font-semibold text-stone-900">Pré-visualização</h1>
            <PlanShortcut houseId={draft.houseId} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Segmented<PeriodChoice>
              label="Período da prévia"
              value={periodChoice}
              onChange={setPeriodChoice}
              options={[
                { id: 'auto', label: 'Agora' },
                { id: 'manha', label: 'Manhã' },
                { id: 'tarde', label: 'Tarde' },
                { id: 'noite', label: 'Noite' },
                { id: 'madrugada', label: 'Madrugada' },
              ]}
            />
            <button
              type="button"
              aria-pressed={lampOn}
              onClick={() => setLampOn((v) => !v)}
              disabled={!ap.furniture.lamp.visible}
              className="h-9 cursor-pointer rounded-lg border border-stone-200 bg-white px-3 text-[13px] font-medium hover:bg-stone-50 disabled:opacity-40"
            >
              {lampOn ? 'Apagar luz' : 'Acender luz'}
            </button>
          </div>
        </div>
        <div className="relative flex h-[66vw] max-h-[62vh] min-h-[240px] items-center justify-center overflow-hidden rounded-2xl border border-stone-200 bg-night p-3 sm:p-6 lg:h-auto lg:max-h-none lg:min-h-[300px] lg:flex-1">
          <div className="size-full">
            <HouseScene
              mode="editor"
               variant={plan?.planId === 'mansao' ? 'mansao' : 'free'}
              appearance={ap}
              content={doc.content}
              theme={theme}
              clock={clock}
              runtime={{ lampOn, chestOpen: false, tvOn: false, musicPlaying: false }}
              selected={selected}
              onSelect={select}
            />
          </div>
          <span className="absolute bottom-3 left-3 hidden rounded-full bg-white/10 px-2.5 py-1 text-xs text-[#E7D9DE] sm:block">Prévia do rascunho — visitantes veem a versão publicada</span>
        </div>
      </section>

      {/* ---------- Painel de propriedades ---------- */}
      <aside aria-label="Propriedades" className="flex min-h-0 shrink-0 flex-col border-t border-stone-200 bg-white lg:w-[400px] lg:border-t-0 lg:border-l">
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {category === 'ambiente' && <AmbientePanel ap={ap} setAp={setAp} selected={selected} isMansao={plan?.planId === 'mansao'} onLocked={() => premium.prompt('customization')} />}
          {category === 'moveis' && (
            <MoveisPanel
              ap={ap}
              setAp={setAp}
              current={furnitureKey}
              isLocked={(key) => isLocked(featureForFurniture(key))}
              onLocked={(key) => notifyLocked(featureForFurniture(key))}
              onPick={(k) => {
                setFurnitureKey(k);
                setSelected(k);
              }}
            />
          )}
          {(['personagem1', 'personagem2', 'personagem3', 'personagem4'] as EditorCategory[]).includes(category) && (
            <CharacterPanel ap={ap} setAp={setAp} slot={category === 'personagem1' ? 0 : category === 'personagem2' ? 1 : category === 'personagem3' ? 2 : 3} locked={isLocked(category === 'personagem3' || category === 'personagem4' ? 'characters' : null)} isMansao={plan?.planId === 'mansao'} onLocked={() => premium.prompt('customization')} onSwitch={(s) => select(`character${s + 1}` as EditorTarget)} />
          )}
          {category === 'animal' && <PetPanel ap={ap} setAp={setAp} locked={isLocked('pet')} onUnlock={() => premium.prompt('pet')} />}
          {category === 'decoracoes' && <DecorPanel ap={ap} setAp={setAp} />}
          {category === 'quiz' && <QuizPanel quiz={doc.content.quiz} setQuiz={(fn, key) => setContent((c) => fn(c.quiz), key)} />}
        </div>
        <p className="border-t border-stone-100 px-5 py-3 text-xs leading-relaxed text-stone-500">As mudanças aparecem na prévia na hora. Os visitantes só veem depois de publicar.</p>
      </aside>
      {premium.element}
    </div>
  );
}

/* ================================================================
 * Painéis
 * ================================================================ */

type SetAp = (fn: (a: HouseAppearance) => void, key?: string) => void;

function swatchesFor(type: ElementType, key = 'color', group?: string) {
  return optionsFor(type, group).map((o) => ({ id: o.id, name: o.name, color: str(o, key) }));
}

function thumbsFor(type: ElementType, ap: HouseAppearance, slot?: 0 | 1 | 2 | 3, group?: string, isMansao = true) {
  return optionsFor(type, group).map((o) => ({ id: o.id, name: o.name, locked: Boolean(o.premium && !isMansao), thumb: <OptionThumb type={type} optionId={o.id} appearance={ap} slot={slot} /> }));
}

const nameOf = (type: ElementType, id: string, group?: string) => getOption(type, id, group).name;

function AmbientePanel({ ap, setAp, selected, isMansao, onLocked }: { ap: HouseAppearance; setAp: SetAp; selected: EditorTarget | null; isMansao: boolean; onLocked: () => void }) {
  const env = ap.environment;
  const patternItems = optionsFor('wallPattern').map((o) => ({
    id: o.id,
    name: o.name,
    locked: Boolean(o.premium && !isMansao),
    thumb: <OptionThumb type="wallPattern" optionId={o.id} appearance={ap} />,
  }));
  return (
    <div className="flex flex-col gap-9">
      <Group title="Paredes" id="sec-walls" highlighted={selected === 'walls'}>
        <Field title="Cores" aside={nameOf('wallColor', env.wallColor)} hint="As duas paredes usam a mesma cor.">
          <Swatches label="Cor das paredes" items={swatchesFor('wallColor')} value={env.wallColor} onChange={(id) => setAp((a) => void (a.environment.wallColor = id))} />
        </Field>
      </Group>

      <Group title="Estampas" id="sec-wall-pattern">
        <Field title="Estampa da parede" aside={nameOf('wallPattern', env.wallPattern)} hint={isMansao ? 'Escolha uma estampa para as duas paredes.' : 'As estampas fazem parte da Mini Mansão.'}>
          <ThumbGrid
            label="Estampa da parede"
            items={patternItems}
            value={env.wallPattern}
            onChange={(id) => setAp((a) => void (a.environment.wallPattern = id))}
            onLocked={() => onLocked()}
          />
        </Field>
      </Group>

      <Group title="Piso" id="sec-floor" highlighted={selected === 'floor'}>
        <Field title="Acabamento" aside={nameOf('floor', env.floor)}>
          <ThumbGrid label="Acabamento do piso" items={thumbsFor('floor', ap)} value={env.floor} onChange={(id) => setAp((a) => void (a.environment.floor = id))} />
        </Field>
      </Group>

      <Group title="Janela" id="sec-window" highlighted={selected === 'window'}>
        <Field title="Modelo" aside={nameOf('windowModel', env.windowModel)}>
          <ThumbGrid label="Modelo de janela" items={thumbsFor('windowModel', ap)} value={env.windowModel} onChange={(id) => setAp((a) => void (a.environment.windowModel = id))} />
        </Field>
        <Field title="Cortina" aside={nameOf('curtainStyle', env.curtainStyle)}>
          <ThumbGrid label="Cortina" items={thumbsFor('curtainStyle', ap)} value={env.curtainStyle} onChange={(id) => setAp((a) => void (a.environment.curtainStyle = id))} />
        </Field>
        {str(getOption('curtainStyle', env.curtainStyle), 'style') !== 'none' && (
          <Field title="Cor da cortina" aside={nameOf('curtainColor', env.curtainColor)}>
            <Swatches label="Cor da cortina" items={swatchesFor('curtainColor')} value={env.curtainColor} onChange={(id) => setAp((a) => void (a.environment.curtainColor = id))} />
          </Field>
        )}
        <Toggle
          label="Janela dinâmica"
          description="O céu acompanha o horário do visitante (manhã, tarde, noite, madrugada). Desligada, fica sempre à tarde."
          checked={env.dynamicWindow}
          onChange={(v) => setAp((a) => void (a.environment.dynamicWindow = v))}
        />
      </Group>

      <Group title="Iluminação" id="sec-lighting" highlighted={selected === 'lighting'}>
        <Field title="Tipo de luz" aside={nameOf('lighting', env.lighting)} hint="Cor do brilho quando a luminária está acesa.">
          <Swatches label="Tipo de luz" items={swatchesFor('lighting', 'glow')} value={env.lighting} onChange={(id) => setAp((a) => void (a.environment.lighting = id))} />
        </Field>
        <Toggle
          label="Luminária"
          description="Mostra a luminária na sala. O visitante pode acender e apagar."
          checked={ap.furniture.lamp.visible}
          onChange={(v) => setAp((a) => void (a.furniture.lamp.visible = v))}
        />
      </Group>
    </div>
  );
}

function MoveisPanel({ ap, setAp, current, onPick, isLocked, onLocked }: { ap: HouseAppearance; setAp: SetAp; current: FurnitureKey; onPick: (k: FurnitureKey) => void; isLocked: (key: FurnitureKey) => boolean; onLocked: (key: FurnitureKey) => void }) {
  const setting = ap.furniture[current];
  const type = FURNITURE_TYPE[current];
  const linked = LINKED_CONTENT[current];
  const isSofa = current === 'sofa';
  return (
    <div className="flex flex-col gap-7">
      <div role="tablist" aria-label="Móvel" className="flex flex-wrap gap-1.5">
        {furnitureOrder.map((k) => {
          const active = k === current;
          return (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => isLocked(k) ? onLocked(k) : onPick(k)}
              className={cx(
                'h-8 cursor-pointer rounded-full border px-3 text-[13px] focus-visible:outline-2 focus-visible:outline-rose-500',
                active ? 'border-stone-900 bg-stone-900 font-medium text-white' : 'border-stone-200 text-stone-700 hover:bg-stone-50',
                !ap.furniture[k].visible && !active && 'text-stone-400 line-through decoration-stone-300',
              )}
            >
              {targetLabels[k]}
            </button>
          );
        })}
      </div>

      <Group title={targetLabels[current]} id={`sec-${current}`}>
        {isLocked(current) ? (
          <div className="flex flex-col gap-3 rounded-xl border border-mansao/30 bg-mansao-soft/40 p-4 text-sm text-mansao-deep">
            <b>🔒 Recurso da Mini Mansão</b>
            <span>Este móvel fica disponível quando o plano completo estiver ativo.</span>
            <ButtonLike onClick={() => onLocked(current)}>Conhecer Mini Mansão</ButtonLike>
          </div>
        ) : <Field title={current === 'cushions' ? 'Conjunto' : current === 'frame' ? 'Moldura' : current === 'calendar' ? 'Estilo' : current === 'radio' ? 'Aparência' : 'Modelo'} aside={nameOf(type, setting.model)}>
          <ThumbGrid label={`Modelo de ${targetLabels[current].toLowerCase()}`} items={thumbsFor(type, ap)} value={setting.model} onChange={(id) => setAp((a) => void (a.furniture[current].model = id))} />
        </Field>}

        {!isLocked(current) && current === 'bookshelf' && (
          <Field title="Livro: capa e cor" aside={nameOf('books', ap.books)} hint="Muda os livros da estante e a capa do livro de cartas.">
            <ThumbGrid label="Capa e cor dos livros" items={thumbsFor('books', ap)} value={ap.books} onChange={(id) => setAp((a) => void (a.books = id))} />
          </Field>
        )}

        {!isLocked(current) && (isSofa ? (
          <p className="rounded-lg bg-stone-50 p-3 text-xs leading-relaxed text-stone-500">O sofá fica sempre visível porque os personagens estão sentados nele.</p>
        ) : (
          <Toggle
            label="Mostrar no cantinho"
            description={
              linked
                ? `Ocultar não apaga ${linked} — ao mostrar de novo, tudo continua lá.`
                : current === 'plants'
                  ? 'Vale para a planta ao lado do rádio. A do canto fica em Decorações.'
                  : current === 'sofa2'
                    ? 'Opcional: um sofá de frente para o principal. Quem senta nele (personagens 3 e 4) se escolhe nos painéis deles.'
                    : undefined
            }
            checked={setting.visible}
            onChange={(v) => setAp((a) => void (a.furniture[current].visible = v))}
          />
        ))}
        {!isLocked(current) && interactiveFurniture.includes(current) && setting.visible && <p className="text-xs text-stone-500">Objeto interativo: o visitante pode clicar nele.</p>}
      </Group>
    </div>
  );
}

function CharacterPanel({ ap, setAp, slot, locked, isMansao, onLocked, onSwitch }: { ap: HouseAppearance; setAp: SetAp; slot: 0 | 1 | 2 | 3; locked: boolean; isMansao: boolean; onLocked: () => void; onSwitch: (s: 0 | 1 | 2 | 3) => void }) {
  const ch = ap.characters[slot];
  type CharacterOptionKey = Exclude<keyof CharacterAppearance, 'age' | 'enabled'>;
  const enabled = slot === 0 || ch.enabled !== false;
  const set = (key: CharacterOptionKey) => (id: string) => setAp((a) => void (a.characters[slot][key] = id));
  const sec = (k: string, title: string, type: ElementType, kind: 'swatch' | 'thumb', value: string): ReactNode => (
    <Field title={title} aside={nameOf(type, value)} key={k}>
      {kind === 'swatch' ? (
        <Swatches label={title} items={swatchesFor(type)} value={value} onChange={set(k as CharacterOptionKey)} />
      ) : (
          <ThumbGrid label={title} items={thumbsFor(type, ap, slot, undefined, isMansao)} value={value} onChange={set(k as CharacterOptionKey)} onLocked={onLocked} />
      )}
    </Field>
  );
  return (
    <div className="flex flex-col gap-7" id={`sec-character${slot + 1}`}>
      <Segmented<'0' | '1' | '2' | '3'>
        label="Personagem"
        value={String(slot) as '0' | '1' | '2' | '3'}
        onChange={(v) => onSwitch(Number(v) as 0 | 1 | 2 | 3)}
        options={[
          { id: '0', label: `Personagem 1 · ${ap.characters[0].name || '—'}` },
          { id: '1', label: `Personagem 2 · ${ap.characters[1].name || '—'}` },
          { id: '2', label: `Personagem 3 · ${ap.characters[2].name || '—'}` },
          { id: '3', label: `Personagem 4 · ${ap.characters[3].name || '—'}` },
        ]}
      />
      {locked ? (
        <div className="flex flex-col gap-3 rounded-xl border border-mansao/30 bg-mansao-soft/40 p-4 text-sm text-mansao-deep">
          <b>🔒 Personagens 3 e 4 são da Mini Mansão</b>
          <span>As escolhas ficam guardadas no rascunho, mas só podem ser publicadas no plano completo.</span>
        </div>
      ) : slot >= 1 && (
        <Toggle
          label="Exibir no cantinho"
          description="Ocultar não apaga as escolhas: ao reativar, tudo volta como estava."
          checked={enabled}
          onChange={(v) => setAp((a) => void (a.characters[slot].enabled = v))}
        />
      )}
      {slot >= 2 && enabled && !ap.furniture.sofa2.visible && (
        <p className="rounded-lg bg-stone-50 p-3 text-xs leading-relaxed text-stone-500">Ligado, mas só aparece com o Sofá 2 ligado (em Móveis).</p>
      )}
      <div className={cx('flex flex-col gap-7', !enabled && 'pointer-events-none opacity-40')} aria-disabled={!enabled}>
        <TextField label="Nome" value={ch.name} maxLength={24} onChange={(v) => setAp((a) => void (a.characters[slot].name = v), `name-${slot}`)} />
        <Segmented<CharacterAge>
          label="Tipo"
          value={ch.age ?? 'adult'}
          onChange={(value) => setAp((a) => void (a.characters[slot].age = value))}
          options={[
            { id: 'adult', label: 'Adulto' },
            { id: 'child', label: 'Criança' },
          ]}
        />
        {sec('skinTone', 'Tom de pele', 'skinTone', 'swatch', ch.skinTone)}
        {sec('hairStyle', 'Estilo de cabelo', 'hairStyle', 'thumb', ch.hairStyle)}
        {sec('hairColor', 'Cor do cabelo', 'hairColor', 'swatch', ch.hairColor)}
        {sec('outfit', 'Roupa', 'outfit', 'thumb', ch.outfit)}
        {sec('outfitColor', 'Cor da roupa', 'outfitColor', 'swatch', ch.outfitColor)}
        {sec('accessory', 'Acessório', 'accessory', 'thumb', ch.accessory)}
        {sec('expression', 'Expressão', 'expression', 'thumb', ch.expression)}
      </div>
    </div>
  );
}

function PetPanel({ ap, setAp, locked, onUnlock }: { ap: HouseAppearance; setAp: SetAp; locked: boolean; onUnlock: () => void }) {
  const pet = ap.pet;
  const typeName = nameOf('petType', pet.type);
  const look = pet.appearanceByType[pet.type] ?? optionsFor('petAppearance', pet.type)[0]?.id ?? '';
  const colorTitle = pet.type === 'pet.passaro' ? 'Cor das penas' : 'Cor do pelo';
  const accessories = optionsFor('petAccessory').map((o) => {
    const fits = petAccessoryFits(o.id, pet.type);
    return { id: o.id, name: o.name, thumb: <OptionThumb type="petAccessory" optionId={o.id} appearance={ap} />, disabled: !fits, disabledReason: `${o.name} não combina com ${typeName.toLowerCase()}` };
  });
  return (
    <div className="flex flex-col gap-7" id="sec-pet">
      {locked && <div className="flex flex-col gap-3 rounded-xl border border-mansao/30 bg-mansao-soft/40 p-4 text-sm text-mansao-deep"><b>🔒 Pet da Mini Mansão</b><span>O pet fica disponível no plano completo.</span><ButtonLike onClick={onUnlock}>Conhecer Mini Mansão</ButtonLike></div>}
      {!locked && <>
      <Toggle
        label="Exibir animal no cantinho"
        description="Ocultar não apaga as escolhas: ao reativar, tudo volta como estava."
        checked={pet.enabled}
        onChange={(v) => setAp((a) => void (a.pet.enabled = v))}
      />
      <div className={cx('flex flex-col gap-7', !pet.enabled && 'pointer-events-none opacity-40')} aria-disabled={!pet.enabled}>
        <TextField label="Nome" value={pet.name} maxLength={20} onChange={(v) => setAp((a) => void (a.pet.name = v), 'pet-name')} />
        <Field title="Tipo" aside={typeName}>
          <ThumbGrid
            label="Tipo de animal"
            items={thumbsFor('petType', ap)}
            value={pet.type}
            onChange={(id) =>
              setAp((a) => {
                a.pet.type = id;
                // combinações validadas: se o acessório não serve no novo tipo, volta para "nenhum"
                if (!petAccessoryFits(a.pet.accessory, id)) a.pet.accessory = 'petAcc.nenhum';
              })
            }
          />
        </Field>
        <Field title={colorTitle} aside={nameOf('petAppearance', look, pet.type)}>
          <Swatches
            label={colorTitle}
            items={swatchesFor('petAppearance', 'fur', pet.type)}
            value={look}
            onChange={(id) => setAp((a) => void (a.pet.appearanceByType = { ...a.pet.appearanceByType, [a.pet.type]: id }))}
          />
        </Field>
        <Field title="Acessório" aside={nameOf('petAccessory', pet.accessory)} hint="Só aparecem ativos os acessórios que combinam com o tipo escolhido.">
          <ThumbGrid label="Acessório do animal" items={accessories} value={pet.accessory} onChange={(id) => setAp((a) => void (a.pet.accessory = id))} />
        </Field>
        <Toggle label="Animação" description="Respirar, piscar, mexer a cauda e pular ao ser clicado." checked={pet.animation} onChange={(v) => setAp((a) => void (a.pet.animation = v))} />
      </div>
      </>}
    </div>
  );
}

function ButtonLike({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="inline-flex min-h-9 w-fit cursor-pointer items-center rounded-lg bg-white px-3 text-xs font-semibold text-mansao-deep shadow-sm hover:bg-mansao-soft focus-visible:outline-2 focus-visible:outline-rose-500">{children}</button>;
}

function DecorPanel({ ap, setAp }: { ap: HouseAppearance; setAp: SetAp }) {
  return (
    <Group title="Decorações opcionais">
      {(Object.keys(decorationLabels) as DecorationKey[]).filter((k) => k !== 'wallPattern').map((k) => (
        <Toggle key={k} label={decorationLabels[k]} checked={ap.decorations[k]} onChange={(v) => setAp((a) => void (a.decorations[k] = v))} />
      ))}
      <p className="text-xs leading-relaxed text-stone-500">Plantas, almofadas e tapete também podem ser ocultados em Móveis.</p>
    </Group>
  );
}
