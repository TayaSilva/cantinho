import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { getOption, str } from '../../data/catalog';
import {
  CHARACTER_SEATS,
  OPPOSITE_SOFA_A,
  editorHitboxes,
  MUSIC_NOTES,
  ROOM_OUTLINE,
  sceneFor,
  targetLabels,
  visitorHotspots,
  Z,
} from '../../data/houseConfig';
import type { EditorTarget, SceneVariant, VisitorAction } from '../../data/houseConfig';
import type { HouseAppearance, HouseContent, ModalId, PeriodTheme, Rect, SceneRuntime } from '../../types/house';
import { Character, characterAnchor, characterHitbox, CharacterFromBehind } from './Character';
import { DynamicWindow } from './DynamicWindow';
import {
  Bookshelf,
  Calendar,
  Chest,
  Cushions,
  Computer,
  Desk,
  Armchair,
  Lamp,
  OppositeSofaBack,
  OppositeSofaSeat,
  lampGlowCenter,
  PhotoFrame,
  Plant,
  Polaroid,
  Radio,
  Rug,
  SofaBack,
  SofaFront,
  Table,
  TV,
} from './Furniture';
import { InteractiveObject } from './InteractiveObject';
import { iso, pts } from './iso';
import { Pet, petAnchor, petHitbox } from './Pet';
import { Room, StringLights } from './Room';

/** Pessoas 3 e 4 sentam no sofá 2, de costas. A 2, 3 e 4 podem ser ocultadas; 3 e 4 também somem sem o sofá 2. */
const backAOf = (index: number) => (index < 2 ? undefined : OPPOSITE_SOFA_A);
const characterRect = (appearance: HouseAppearance, index: number): Rect =>
  characterHitbox(CHARACTER_SEATS[index], appearance.characters[index].age ?? 'adult', backAOf(index));
const characterSeated = (appearance: HouseAppearance, index: number) =>
  index === 0 || (appearance.characters[index].enabled !== false && (index < 2 || appearance.furniture.sofa2.visible));

/* ==================================================================
 * Desenho da cena (um único SVG em camadas)
 * ================================================================== */

interface SceneSvgProps {
  appearance: HouseAppearance;
  variant?: SceneVariant;
  theme: PeriodTheme;
  runtime: SceneRuntime;
  children?: ReactNode;
}

/**
 * Monta a casa inteira em camadas, na ordem do fundo para a frente:
 * piso → paredes → janela e objetos de parede → móveis → personagens → pet →
 * iluminação. Tudo vem da aparência escolhida no catálogo.
 */
export function SceneSvg({ appearance, variant = appearance.environment.layout, theme, runtime, children }: SceneSvgProps) {
  const scene = sceneFor(variant);
  const f = appearance.furniture;
  const deco = appearance.decorations;
  const opt = <K extends keyof typeof f>(k: K, type: Parameters<typeof getOption>[0]) => getOption(type, f[k].model);
  const lampOpt = opt('lamp', 'lamp');
  const plantOpt = opt('plants', 'plants');
  const lighting = getOption('lighting', appearance.environment.lighting);
  const lampLit = f.lamp.visible && runtime.lampOn;
  const glow = lampGlowCenter(lampOpt);
  const dim = theme.dim * (lampLit ? 0.55 : 1);
  const night = theme.stars;
  const pet = appearance.pet;
  const showPet = variant === 'mansao' && pet.enabled;

  return (
    <svg viewBox={`0 0 ${scene.width} ${scene.height}`} className="absolute inset-0 size-full" shapeRendering="crispEdges" role="img" aria-label="Sala do cantinho em pixel art">
      {/* 1–2. piso e paredes */}
      <Room appearance={appearance} variant={variant} />
      {deco.stringLights && <StringLights />}

      {/* 3. janela e objetos de parede */}
      <DynamicWindow appearance={appearance} theme={theme} />
      {f.frame.visible && <PhotoFrame opt={opt('frame', 'frame')} />}
      {deco.polaroid && <Polaroid />}
      {f.calendar.visible && <Calendar opt={opt('calendar', 'calendar')} />}

      {/* 4. móveis do fundo para a frente */}
      {f.rug.visible && <Rug opt={opt('rug', 'rug')} />}
      {deco.backPlant && <Plant opt={plantOpt} origin={[1, 1]} size={7} />}
      {f.bookshelf.visible && <Bookshelf opt={opt('bookshelf', 'bookshelf')} books={getOption('books', appearance.books)} />}
      {f.tv.visible && <TV opt={opt('tv', 'tv')} on={runtime.tvOn} />}
      {f.radio.visible && <Radio opt={opt('radio', 'radio')} />}
      {f.plants.visible && <Plant opt={plantOpt} origin={[108, 3]} size={9} />}
      {f.sofa.visible && <SofaBack opt={opt('sofa', 'sofa')} />}
      {f.cushions.visible && <Cushions opt={opt('cushions', 'cushions')} />}
      {variant === 'mansao' && f.desk.visible && <Desk opt={opt('desk', 'desk')} />}
      {variant === 'mansao' && f.computer.visible && <Computer opt={opt('computer', 'computer')} />}
      {variant === 'mansao' && f.armchair.visible && <Armchair opt={opt('armchair', 'armchair')} />}

      {/* 5. personagens */}
      {appearance.characters.slice(0, 2).map((look, i) =>
        characterSeated(appearance, i) ? <Character key={i} look={look} seat={CHARACTER_SEATS[i]} index={i} /> : null,
      )}
      {f.sofa.visible && <SofaFront opt={opt('sofa', 'sofa')} />}
      {f.lamp.visible && <Lamp opt={lampOpt} on={runtime.lampOn} />}
      {f.table.visible && <Table opt={opt('table', 'table')} items={deco.tableItems} />}

      {/* 6. animal */}
      {showPet && <Pet pet={pet} happy={runtime.petHappy} sleeping={night && !runtime.petHappy} />}

      {/* sofá 2, de frente para o principal: fica mais perto da câmera que a mesa e o pet */}
      {variant === 'mansao' && f.sofa2.visible && (
        <g>
          <OppositeSofaSeat opt={opt('sofa2', 'sofa')} backA={OPPOSITE_SOFA_A} />
          {[2, 3].map((i) =>
            characterSeated(appearance, i) ? <CharacterFromBehind key={i} look={appearance.characters[i]} seat={CHARACTER_SEATS[i]} backA={OPPOSITE_SOFA_A} /> : null,
          )}
          <OppositeSofaBack opt={opt('sofa2', 'sofa')} backA={OPPOSITE_SOFA_A} />
        </g>
      )}

      {f.chest.visible && <Chest opt={opt('chest', 'chest')} open={runtime.chestOpen} />}

      {/* 7. efeitos */}
      {runtime.musicPlaying && f.radio.visible && (
        <g>
          <path className="music-note" d={`M${MUSIC_NOTES.x} ${MUSIC_NOTES.y}h1v-5h3v1h-2v5h-2z`} fill="#46353F" />
          <path className="music-note music-note-late" d={`M${MUSIC_NOTES.x + 7} ${MUSIC_NOTES.y - 4}h1v-4h3v1h-2v4h-2z`} fill="#C98190" />
        </g>
      )}
      <Lighting dim={dim} lit={lampLit} tint={str(lighting, 'tint')} glowColor={str(lighting, 'glow')} glow={glow} scene={scene} />
      {children}
    </svg>
  );
}

function Lighting({ dim, lit, tint, glowColor, glow, scene }: { dim: number; lit: boolean; tint: string; glowColor: string; glow: { x: number; y: number }; scene: { width: number; height: number } }) {
  return (
    <g pointerEvents="none" shapeRendering="auto">
      <defs>
        <clipPath id="room-clip">
          <polygon points={ROOM_OUTLINE} />
        </clipPath>
      </defs>
      <g clipPath="url(#room-clip)">
        <rect width={scene.width} height={scene.height} fill="#1B1430" opacity={dim} className="transition-opacity duration-700" />
        <g opacity={lit ? 1 : 0} className="transition-opacity duration-500">
          <rect width={scene.width} height={scene.height} fill={tint} opacity={0.08} />
          <circle cx={glow.x} cy={glow.y} r={46} fill={glowColor} opacity={0.16} />
          <circle cx={glow.x} cy={glow.y} r={26} fill={glowColor} opacity={0.22} />
        </g>
      </g>
    </g>
  );
}

/* ==================================================================
 * Cena completa (visitante ou editor)
 * ================================================================== */

interface HouseSceneProps {
  appearance: HouseAppearance;
  content: HouseContent;
  theme: PeriodTheme;
  clock: string;
  runtime: Omit<SceneRuntime, 'petHappy'>;
  showLabels?: boolean;
  /** 1 = casa inteira visível; maior = aproximar com rolagem. */
  zoom?: number;
  /** Visitante interage com os objetos; no editor, clicar seleciona. */
  mode?: 'visitor' | 'editor';
  variant?: SceneVariant;
  selected?: EditorTarget | null;
  onSelect?: (target: EditorTarget) => void;
  onOpenModal?: (id: ModalId) => void;
  onToggleLamp?: () => void;
  onOpenChest?: () => void;
}

interface Bubble {
  text: string;
  x: number;
  y: number;
  key: number;
}

export function HouseScene({
  appearance,
  content,
  theme,
  clock,
  runtime,
  showLabels = false,
  zoom = 1,
  mode = 'visitor',
  variant = appearance.environment.layout,
  selected = null,
  onSelect,
  onOpenModal,
  onToggleLamp,
  onOpenChest,
}: HouseSceneProps) {
  const scene = sceneFor(variant);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [fitWidth, setFitWidth] = useState(0);
  const [bubble, setBubble] = useState<Bubble | null>(null);
  const [petHappy, setPetHappy] = useState(false);

  useLayoutEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const measure = () => {
      const { clientWidth: w, clientHeight: h } = el;
       setFitWidth(Math.max(0, Math.min(w, (h * scene.width) / scene.height)));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [scene.height, scene.width]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
    el.scrollTop = (el.scrollHeight - el.clientHeight) / 2;
  }, [zoom, fitWidth]);

  useEffect(() => {
    if (!bubble) return;
    const id = window.setTimeout(() => setBubble(null), 3200);
    return () => window.clearTimeout(id);
  }, [bubble]);

  useEffect(() => {
    if (!petHappy) return;
    const id = window.setTimeout(() => setPetHappy(false), 1400);
    return () => window.clearTimeout(id);
  }, [petHappy]);

  const say = (text: string, x: number, y: number) => setBubble({ text, x, y, key: Date.now() });

  const runAction = (action: VisitorAction, anchor: { x: number; y: number }) => {
    setBubble(null);
    if (action.kind === 'modal') onOpenModal?.(action.modal);
    else if (action.kind === 'toggle-lamp') onToggleLamp?.();
    else if (action.kind === 'open-chest') onOpenChest?.();
    else say(`Lá fora: ${theme.label.toLowerCase()} · ${clock}`, anchor.x, anchor.y);
  };

  const f = appearance.furniture;
  const pet = appearance.pet;
  const quizReady = content.quiz.published && content.quiz.questions.length > 0 && content.quiz.questions.every((q) => q.prompt.trim() && q.options.length >= 2 && q.options.every((option) => option.text.trim()));
  const sceneWidth = fitWidth * zoom;
  const editor = mode === 'editor';
  const phrases = [content.phrases.character1, content.phrases.character2, content.phrases.character3, content.phrases.character4];

  return (
    <div ref={viewportRef} className="scene-viewport relative flex size-full overflow-auto overscroll-contain">
      <div className="relative m-auto shrink-0" style={{ width: sceneWidth, aspectRatio: `${scene.width} / ${scene.height}` }}>
        <SceneSvg appearance={appearance} variant={variant} theme={theme} runtime={{ ...runtime, petHappy }}>
          {editor && <EditorRegions appearance={appearance} variant={variant} selected={selected} onSelect={onSelect} />}
        </SceneSvg>

        {!editor && (
          <>
            {visitorHotspots
              .filter((h) => (!h.requires || f[h.requires].visible) && (h.id !== 'computer' || (variant === 'mansao' && quizReady)))
              .map((h) => (
                <InteractiveObject
                  key={h.id}
                  id={h.id}
                  label={h.label}
                  ariaLabel={h.id === 'lamp' ? (runtime.lampOn ? 'Apagar a luminária' : 'Acender a luminária') : h.ariaLabel}
                  pressed={h.id === 'lamp' ? runtime.lampOn : undefined}
                  hitbox={h.hitbox}
                  scene={scene}
                  labelPosition={h.labelPosition}
                  showLabel={showLabels}
                  onActivate={() => runAction(h.action, { x: h.hitbox.x + h.hitbox.w / 2, y: h.hitbox.y - 2 })}
                />
              ))}
            {appearance.characters.map((c, i) =>
              (variant === 'mansao' || i < 2) && characterSeated(appearance, i) ? (
                <InteractiveObject
                  key={`char-${i}`}
                  id={`character${i + 1}`}
                  label={c.name}
                  ariaLabel={`Falar com ${c.name}`}
                  hitbox={characterRect(appearance, i)}
                  scene={scene}
                  showLabel={showLabels}
                  onActivate={() => {
                    const p = characterAnchor(CHARACTER_SEATS[i], c.age ?? 'adult', backAOf(i));
                    say(phrases[i], p.x, p.y);
                  }}
                />
              ) : null,
            )}
            {variant === 'mansao' && pet.enabled && (
              <InteractiveObject
                id="pet"
                label={pet.name}
                ariaLabel={`Fazer carinho em ${pet.name}`}
                hitbox={petHitbox(pet)}
                scene={scene}
                showLabel={showLabels}
                onActivate={() => {
                  setPetHappy(true);
                  const p = petAnchor(pet);
                  say(content.phrases.pet.replace('{nome}', pet.name), p.x, p.y);
                }}
              />
            )}
          </>
        )}

        {bubble && (
          <div
            key={bubble.key}
            role="status"
            className="pointer-events-none absolute flex -translate-x-1/2 -translate-y-full flex-col items-center motion-safe:animate-pop-in"
            style={{ left: `${(bubble.x / scene.width) * 100}%`, top: `${(bubble.y / scene.height) * 100}%`, zIndex: Z.bubble }}
          >
            <div className="max-w-64 border-[3px] border-ink bg-[#FFF8EE] px-3.5 py-2 text-center font-pixel text-sm text-ink shadow-[4px_4px_0_rgba(30,22,29,.35)] sm:whitespace-nowrap sm:text-[15px]">
              {bubble.text}
            </div>
            <div className="h-2 w-3 bg-ink [clip-path:polygon(0_0,100%_0,50%_100%)]" />
          </div>
        )}
      </div>
    </div>
  );
}

/* ==================================================================
 * Editor: áreas de seleção sobre a cena
 * ================================================================== */

const editorRegionPoints = (side: number) => ({
  left: pts([iso(0, side, 0), iso(0, 0, 0), iso(0, 0, 80), iso(0, side, 80)]),
  right: pts([iso(0, 0, 0), iso(side, 0, 0), iso(side, 0, 80), iso(0, 0, 80)]),
  floor: pts([iso(0, 0), iso(side, 0), iso(side, side), iso(0, side)]),
});

/** Retângulos clicáveis de um alvo do editor (considera visibilidade). */
export function targetRects(appearance: HouseAppearance, target: EditorTarget): Rect[] {
  const charIndex = ['character1', 'character2', 'character3', 'character4'].indexOf(target);
  if (charIndex >= 0) return characterSeated(appearance, charIndex) ? [characterRect(appearance, charIndex)] : [];
  if (target === 'pet') return appearance.pet.enabled ? [petHitbox(appearance.pet)] : [];
  if (target in appearance.furniture) {
    const key = target as keyof HouseAppearance['furniture'];
    if (!appearance.furniture[key].visible) return [];
  }
  return editorHitboxes[target] ?? [];
}

/** Ordem de empilhamento: o que vem depois fica por cima. */
const REGION_ORDER: EditorTarget[] = ['rug', 'window', 'frame', 'calendar', 'plants', 'bookshelf', 'tv', 'radio', 'desk', 'computer', 'armchair', 'sofa', 'cushions', 'character1', 'character2', 'lamp', 'table', 'pet', 'sofa2', 'character3', 'character4', 'chest'];

function EditorRegions({ appearance, variant, selected, onSelect }: { appearance: HouseAppearance; variant: SceneVariant; selected: EditorTarget | null; onSelect?: (t: EditorTarget) => void }) {
  const points = editorRegionPoints(variant === 'mansao' ? 150 : 120);
  const props = (target: EditorTarget) => ({
    role: 'button',
    tabIndex: 0,
    'aria-label': `Editar ${targetLabels[target].toLowerCase()}`,
    'aria-pressed': selected === target,
    className: 'editor-region',
    onClick: () => onSelect?.(target),
    onKeyDown: (e: KeyboardEvent<SVGElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSelect?.(target);
      }
    },
  });

  return (
    <g shapeRendering="auto">
      <polygon points={points.left} {...props('walls')} />
      <polygon points={points.right} {...props('walls')} />
      <polygon points={points.floor} {...props('floor')} />
      {REGION_ORDER.flatMap((t) =>
        targetRects(appearance, t).map((r, i) => <rect key={`${t}-${i}`} x={r.x} y={r.y} width={r.w} height={r.h} rx={2} {...props(t)} />),
      )}
    </g>
  );
}
