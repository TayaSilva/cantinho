import type { CSSProperties, ReactNode } from 'react';
import { SCENE } from '../../data/houseConfig';
import type { Rect } from '../../types/house';

/** Converte um retângulo da cena (base 320 × 224) em posição percentual. */
export function rectStyle(rect: Rect, z?: number, scene: { width: number; height: number } = SCENE): CSSProperties {
  return {
    left: ((rect.x / scene.width) * 100) + '%',
    top: ((rect.y / scene.height) * 100) + '%',
    width: ((rect.w / scene.width) * 100) + '%',
    height: ((rect.h / scene.height) * 100) + '%',
    zIndex: z,
  };
}

/**
 * Camada HTML posicionada sobre a cena (balões, áreas clicáveis, sprites
 * PNG opcionais). A arte em si é desenhada em camadas SVG por SceneSvg.
 */
export function HouseLayer({ rect, z, scene = SCENE, children, className = '' }: { rect: Rect; z?: number; scene?: { width: number; height: number }; children?: ReactNode; className?: string }) {
  return (
    <div className={`pointer-events-none absolute ${className}`} style={rectStyle(rect, z, scene)}>
      {children}
    </div>
  );
}
