import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { getOption, str } from '../../data/catalog';
import {
  CHARACTER_SEATS,
  OPPOSITE_SOFA_A,
  editorHitboxes,
  MUSIC_NOTES,
  ROOM_OUTLINE,
  SCENE,
  targetLabels,
  visitorHotspots,
  Z,
} from '../../data/houseConfig';
import type { EditorTarget, VisitorAction } from '../../data/houseConfig';
import type { HouseAppearance, HouseContent, ModalId, PeriodTheme, Rect, SceneRuntime } from '../../types/house';
import { Character, characterAnchor, characterHitbox, CharacterFromBehind } from './Character';
import { DynamicWindow } from './DynamicWindow';
import {
  Bookshelf,
  Calendar,
  Chest,
  Cushions,
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
import { rectStyle } from './HouseLayer';
import { InteractiveObject } from './InteractiveObject';
import { iso, pts } from './iso';
import { Pet, petAnchor, petHitbox } from './Pet';
import { Room, StringLights } from './Room';

/** Pessoas 3 e 4 sentam no sofá 2, de costas; só existem com ele visível. */
const backAOf = (index: number) => (index < 2 ? undefined : OPPOSITE_SOFA_A);
const characterRect = (appearance: HouseAppearance, index: number): Rect =>
  characterHitbox(CHARACTER_SEATS[index], appearance.characters[index].age ?? 'adult', backAOf(index));
const characterSeated = (appearance: HouseAppearance, index: number) => index < 2 || appearance.furniture.sofa2.visible;

/* ==================================================================
 * Desenho da cena (um único SVG em camadas)
 * ================================================================== */

interface SceneSvgProps {
  appearance: HouseAppearance;
  theme: PeriodTheme;
  runtime: SceneRuntime;
  children?: ReactNode;
}

/**
 * Monta a casa inteira em camadas, na ordem do fundo para a frente:
 * piso → paredes → janela e objetos de parede → móveis → personagens → pet →
 * iluminação. Tudo vem da aparência escolhida no catálogo.
 */
export function SceneSvg({ appearance, theme, runtime, children }: SceneSvgProps) {
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

  return (
    <svg viewBox={`0 0 ${SCENE.width} ${SCENE.height}`} className="absolute inset-0 size-full" shapeRendering="crispEdges" role="img" aria-label="Sala da casinha em pixel art">
      {/* 1–2. piso e paredes */}
      <Room appearance={appearance} />
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

      {/* 5. personagens */}
      {appearance.characters.slice(0, 2).map((look, i) => (
        <Character key={i} look={look} seat={CHARACTER_SEATS[i]} index={i} />
      ))}
      {f.sofa.visible && <SofaFront opt={opt('sofa', 'sofa')} />}
      {f.lamp.visible && <Lamp opt={lampOpt} on={runtime.lampOn} />}
      {f.table.visible && <Table opt={opt('table', 'table')} items={deco.tableItems} />}

      {/* 6. animal */}
      {pet.enabled && <Pet pet={pet} happy={runtime.petHappy} sleeping={night && !runtime.petHappy} />}

      {/* sofá 2, de frente para o principal: fica mais perto da câmera que a mesa e o pet */}
      {f.sofa2.visible && (
        <g>
          <OppositeSofaSeat opt={opt('sofa2', 'sofa')} backA={OPPOSITE_SOFA_A} />
          <CharacterFromBehind look={appearance.characters[2]} seat={CHARACTER_SEATS[2]} backA={OPPOSITE_SOFA_A} />
          <CharacterFromBehind look={appearance.characters[3]} seat={CHARACTER_SEATS[3]} backA={OPPOSITE_SOFA_A} />
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
      <Lighting dim={dim} lit={lampLit} tint={str(lighting, 'tint')} glowColor={str(lighting, 'glow')} glow={glow} />
      {children}
    </svg>
  );
}

function Lighting({ dim, lit, tint, glowColor, glow }: { dim: number; lit: boolean; tint: string; glowColor: string; glow: { x: number; y: number } }) {
  return (
    <g pointerEvents="none" shapeRendering="auto">
      <defs>
        <clipPath id="room-clip">
          <polygon points={ROOM_OUTLINE} />
        </clipPath>
      </defs>
      <g clipPath="url(#room-clip)">
        <rect width={SCENE.width} height={SCENE.height} fill="#1B1430" opacity={dim} className="transition-opacity duration-700" />
        <g opacity={lit ? 1 : 0} className="transition-opacity duration-500">
          <rect width={SCENE.width} height={SCENE.height} fill={tint} opacity={0.08} />
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
  selected = null,
  onSelect,
  onOpenModal,
  onToggleLamp,
  onOpenChest,
}: HouseSceneProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [fitWidth, setFitWidth] = useState(0);
  const [bubble, setBubble] = useState<Bubble | null>(null);
  const [petHappy, setPetHappy] = useState(false);

  useLayoutEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const measure = () => {
      const { clientWidth: w, clientHeight: h } = el;
      setFitWidth(Math.max(0, Math.min(w, (h * SCENE.width) / SCENE.height)));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

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
  const sceneWidth = fitWidth * zoom;
  const editor = mode === 'editor';
  const phrases = [content.phrases.character1, content.phrases.character2, content.phrases.character3, content.phrases.character4];

  return (
    <div ref={viewportRef} className="scene-viewport relative flex size-full overflow-auto overscroll-contain">
      <div className="relative m-auto shrink-0" style={{ width: sceneWidth, aspectRatio: `${SCENE.width} / ${SCENE.height}` }}>
        <SceneSvg appearance={appearance} theme={theme} runtime={{ ...runtime, petHappy }}>
          {editor && <EditorRegions appearance={appearance} selected={selected} onSelect={onSelect} />}
        </SceneSvg>

        {editor && selected && <SelectionChip appearance={appearance} target={selected} />}

        {!editor && (
          <>
            {visitorHotspots
              .filter((h) => !h.requires || f[h.requires].visible)
              .map((h) => (
                <InteractiveObject
                  key={h.id}
                  id={h.id}
                  label={h.label}
                  ariaLabel={h.id === 'lamp' ? (runtime.lampOn ? 'Apagar a luminária' : 'Acender a luminária') : h.ariaLabel}
                  pressed={h.id === 'lamp' ? runtime.lampOn : undefined}
                  hitbox={h.hitbox}
                  labelPosition={h.labelPosition}
                  showLabel={showLabels}
                  onActivate={() => runAction(h.action, { x: h.hitbox.x + h.hitbox.w / 2, y: h.hitbox.y - 2 })}
                />
              ))}
            {appearance.characters.map((c, i) =>
              characterSeated(appearance, i) ? (
                <InteractiveObject
                  key={`char-${i}`}
                  id={`character${i + 1}`}
                  label={c.name}
                  ariaLabel={`Falar com ${c.name}`}
                  hitbox={characterRect(appearance, i)}
                  showLabel={showLabels}
                  onActivate={() => {
                    const p = characterAnchor(CHARACTER_SEATS[i], c.age ?? 'adult', backAOf(i));
                    say(phrases[i], p.x, p.y);
                  }}
                />
              ) : null,
            )}
            {pet.enabled && (
              <InteractiveObject
                id="pet"
                label={pet.name}
                ariaLabel={`Fazer carinho em ${pet.name}`}
                hitbox={petHitbox(pet)}
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
            style={{ left: `${(bubble.x / SCENE.width) * 100}%`, top: `${(bubble.y / SCENE.height) * 100}%`, zIndex: Z.bubble }}
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

const LEFT_WALL = pts([iso(0, 120, 0), iso(0, 0, 0), iso(0, 0, 80), iso(0, 120, 80)]);
const RIGHT_WALL = pts([iso(0, 0, 0), iso(120, 0, 0), iso(120, 0, 80), iso(0, 0, 80)]);
const FLOOR = pts([iso(0, 0), iso(120, 0), iso(120, 120), iso(0, 120)]);

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
const REGION_ORDER: EditorTarget[] = ['rug', 'window', 'frame', 'calendar', 'plants', 'bookshelf', 'tv', 'radio', 'sofa', 'cushions', 'character1', 'character2', 'lamp', 'table', 'pet', 'sofa2', 'character3', 'character4', 'chest'];

function EditorRegions({ appearance, selected, onSelect }: { appearance: HouseAppearance; selected: EditorTarget | null; onSelect?: (t: EditorTarget) => void }) {
  const props = (target: EditorTarget) => ({
    role: 'button',
    tabIndex: 0,
    'aria-label': `Editar ${targetLabels[target].toLowerCase()}`,
    'aria-pressed': selected === target,
    className: `editor-region ${selected === target ? 'is-selected' : ''}`,
    onClick: () => onSelect?.(target),
    onKeyDown: (e: KeyboardEvent<SVGElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSelect?.(target);
      }
    },
  });

  const selectedRects = selected && selected !== 'walls' && selected !== 'floor' && selected !== 'lighting' ? targetRects(appearance, selected) : [];

  return (
    <g shapeRendering="auto">
      <polygon points={LEFT_WALL} {...props('walls')} />
      <polygon points={RIGHT_WALL} {...props('walls')} />
      <polygon points={FLOOR} {...props('floor')} />
      {REGION_ORDER.flatMap((t) =>
        targetRects(appearance, t).map((r, i) => <rect key={`${t}-${i}`} x={r.x} y={r.y} width={r.w} height={r.h} rx={2} {...props(t)} />),
      )}
      {/* destaque discreto do elemento selecionado */}
      {selected === 'walls' && (
        <g className="selection-outline">
          <polygon points={LEFT_WALL} />
          <polygon points={RIGHT_WALL} />
        </g>
      )}
      {selected === 'floor' && (
        <g className="selection-outline">
          <polygon points={FLOOR} />
        </g>
      )}
      {selectedRects.map((r, i) => (
        <rect key={i} className="selection-outline" x={r.x} y={r.y} width={r.w} height={r.h} rx={2} />
      ))}
    </g>
  );
}

function SelectionChip({ appearance, target }: { appearance: HouseAppearance; target: EditorTarget }) {
  const rects = target === 'walls' ? [{ x: 40, y: 10, w: 240, h: 10 }] : target === 'floor' ? [{ x: 100, y: 150, w: 120, h: 10 }] : targetRects(appearance, target);
  if (rects.length === 0) return null;
  const r = rects[0];
  const name =
    target === 'character1' ? `Personagem 1 · ${appearance.characters[0].name}` : target === 'character2' ? `Personagem 2 · ${appearance.characters[1].name}` : target === 'character3' ? `Personagem 3 · ${appearance.characters[2].name}` : target === 'character4' ? `Personagem 4 · ${appearance.characters[3].name}` : target === 'pet' ? `Animalzinho · ${appearance.pet.name}` : targetLabels[target];
  return (
    <div
      className="pointer-events-none absolute -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-full bg-white px-2.5 py-1 font-sans text-xs font-semibold text-stone-900 shadow-md"
      style={{ ...rectStyle({ x: r.x + r.w / 2, y: r.y - 1.5, w: 0, h: 0 }), zIndex: Z.bubble }}
    >
      {name}
    </div>
  );
}
