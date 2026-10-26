import { PixelButton } from '../ui/PixelButton';
import { BaseModal } from './BaseModal';

interface MemoryChestModalProps {
  open: boolean;
  onClose: () => void;
  message: string;
  count: number;
  onAnother: () => void;
}

/** Mensagem surpresa sorteada ao abrir o baú. */
export function MemoryChestModal({ open, onClose, message, count, onAnother }: MemoryChestModalProps) {
  return (
    <BaseModal open={open} onClose={onClose} title="Baú de surpresas" widthClass="max-w-[540px]">
      <div className="flex flex-col items-center gap-4 p-6 text-center sm:p-7">
        <svg width="120" height="96" viewBox="0 0 20 16" shapeRendering="crispEdges" aria-hidden="true" className="motion-safe:animate-hop">
          <rect x="2" y="1" width="16" height="5" fill="#CF9A78" />
          <rect x="2" y="1" width="16" height="1" fill="#46353F" />
          <rect x="2" y="6" width="16" height="9" fill="#A7755B" />
          <rect x="2" y="7" width="16" height="2" fill="#3A2A2E" />
          <rect x="2" y="10" width="16" height="1" fill="#E3B04B" />
          <rect x="9" y="9" width="2" height="3" fill="#E3B04B" />
          <rect className="twinkle" x="9" y="0" width="1" height="1" fill="#FFE27A" />
          <rect className="twinkle twinkle-1" x="5" y="2" width="1" height="1" fill="#FFF6D8" />
          <rect className="twinkle twinkle-2" x="14" y="3" width="1" height="1" fill="#FFF6D8" />
        </svg>
        <span className="font-pixel text-sm text-plum">Surpresa nº {count}</span>
        <p key={message} role="status" className="font-pixel text-2xl font-medium leading-snug motion-safe:animate-fade-in sm:text-[26px]">
          “{message}”
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <PixelButton variant="primary" size="sm" onClick={onAnother} data-autofocus>Abrir outra surpresa</PixelButton>
          <PixelButton variant="paper" size="sm" onClick={onClose}>Fechar o baú</PixelButton>
        </div>
      </div>
    </BaseModal>
  );
}
