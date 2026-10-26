import { useCallback, useRef, useState } from 'react';
import type { ModalId } from '../types/house';

/**
 * Controla qual modal está aberto (apenas um por vez) e devolve o foco
 * ao objeto que abriu o modal quando ele fecha.
 */
export function useHouseModal() {
  const [active, setActive] = useState<ModalId | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  const open = useCallback((id: ModalId) => {
    openerRef.current = (document.activeElement as HTMLElement | null) ?? null;
    setActive(id);
  }, []);

  const close = useCallback(() => {
    setActive(null);
    const opener = openerRef.current;
    openerRef.current = null;
    if (opener && typeof opener.focus === 'function') {
      window.requestAnimationFrame(() => opener.focus());
    }
  }, []);

  return { active, open, close, isOpen: (id: ModalId) => active === id };
}
