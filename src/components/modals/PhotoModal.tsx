import { useState } from 'react';
import { useMediaUrl } from '../../hooks/useMediaUrl';
import type { Photo } from '../../types/house';
import { Icon, PixelButton } from '../ui/PixelButton';
import { BaseModal } from './BaseModal';

interface PhotoModalProps {
  open: boolean;
  onClose: () => void;
  photos: Photo[];
}

/** Galeria de fotos do quadro. Setas do teclado também navegam. */
export function PhotoModal({ open, onClose, photos }: PhotoModalProps) {
  const [index, setIndex] = useState(0);
  const total = photos.length;
  const photo = photos[Math.min(index, Math.max(0, total - 1))];
  const src = useMediaUrl(photo?.src);
  const go = (d: number) => setIndex((i) => (i + d + total) % total);

  if (!photo) {
    return (
      <BaseModal open={open} onClose={onClose} title="Quadro · Nossas fotografias" widthClass="max-w-[720px]">
        <p className="p-6 text-center">Ainda não há fotos no quadro.</p>
      </BaseModal>
    );
  }

  return (
    <BaseModal
      open={open}
      onClose={onClose}
      title="Quadro · Nossas fotografias"
      widthClass="max-w-[720px]"
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') go(-1);
        if (e.key === 'ArrowRight') go(1);
      }}
    >
      <div className="flex flex-col items-center gap-4 p-4 sm:p-6">
        <div className="flex w-full items-center gap-2 sm:gap-4">
          <PixelButton variant="paper" size="icon" onClick={() => go(-1)} aria-label="Foto anterior" className="shrink-0">
            <Icon name="left" />
          </PixelButton>

          <figure className="relative m-0 min-w-0 flex-1 border-4 border-wood bg-white p-2.5 pb-11 shadow-[6px_6px_0_rgba(70,53,63,.25)] sm:p-3.5 sm:pb-12">
            <img
              key={photo.id}
              src={src}
              alt={photo.alt}
              className="pixelated block aspect-[3/2] w-full object-cover motion-safe:animate-photo-in"
            />
            {photo.caption && (
              <figcaption className="absolute inset-x-0 bottom-2.5 text-center font-pixel text-base text-ink sm:text-lg">{photo.caption}</figcaption>
            )}
          </figure>

          <PixelButton variant="paper" size="icon" onClick={() => go(1)} aria-label="Próxima foto" className="shrink-0" data-autofocus>
            <Icon name="right" />
          </PixelButton>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex gap-1.5" aria-hidden="true">
            {photos.map((p, i) => (
              <span key={p.id} className={`size-2.5 border-2 border-ink ${i === index ? 'bg-rug' : 'bg-paper'}`} />
            ))}
          </div>
          <span className="font-pixel text-base" aria-live="polite">
            {index + 1}/{total}
          </span>
        </div>
      </div>
    </BaseModal>
  );
}
