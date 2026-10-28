import { SCENE, Z } from '../../data/houseConfig';
import type { Rect } from '../../types/house';

type LabelPosition = 'top' | 'bottom' | 'inside';
import { rectStyle } from './HouseLayer';

interface InteractiveObjectProps {
  id: string;
  label: string;
  ariaLabel: string;
  hitbox: Rect;
  onActivate: () => void;
  showLabel?: boolean;
  pressed?: boolean;
  labelPosition?: LabelPosition;
  scene?: { width: number; height: number };
}

const LABEL_POS: Record<LabelPosition, string> = {
  top: 'bottom-full mb-1.5',
  bottom: 'top-full mt-1.5',
  inside: 'top-1/2 -translate-y-1/2',
};

/**
 * Área clicável invisível sobre um objeto da cena.
 * É um <button> de verdade: funciona com mouse, toque e teclado (Tab + Enter).
 * No hover/foco aparece uma setinha de pixel em cima; no modo ajuda, o nome do objeto.
 */
export function InteractiveObject({ id, label, ariaLabel, hitbox, onActivate, showLabel, pressed, labelPosition = 'top', scene = SCENE }: InteractiveObjectProps) {
  return (
    <button
      type="button"
      data-object={id}
      aria-label={ariaLabel}
      aria-pressed={pressed}
      title={label}
      onClick={onActivate}
      className="hotspot group absolute cursor-pointer border-0 bg-transparent p-0"
      style={rectStyle(hitbox, Z.hotspots, scene)}
    >
      {showLabel && (
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute left-1/2 -translate-x-1/2 ${LABEL_POS[labelPosition]} whitespace-nowrap border-2 border-ink bg-highlight px-2 py-0.5 font-pixel text-[13px] font-semibold text-ink shadow-[0_3px_0_rgba(30,22,29,.45)] motion-safe:animate-pop-in`}
        >
          {label}
        </span>
      )}
    </button>
  );
}
