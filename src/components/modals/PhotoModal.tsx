import { useEffect, useRef, useState } from 'react';
import { useMediaUrl } from '../../hooks/useMediaUrl';
import { mediaApiUrl, resolveMedia } from '../../services/mediaStore';
import type { Photo } from '../../types/house';
import { MediaLoader } from '../ui/MediaLoader';
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
  const [fallback, setFallback] = useState(false);
  const total = photos.length;
  const photo = photos[Math.min(index, Math.max(0, total - 1))];
  const src = useMediaUrl(photo?.src);
  const fallbackSrc = photo?.src ? mediaApiUrl(photo.src) : undefined;
  const shownSrc = fallback ? fallbackSrc : src;
  const go = (d: number) => setIndex((i) => (i + d + total) % total);

  // carregamento: a foto só aparece quando terminar de baixar
  const imgRef = useRef<HTMLImageElement>(null);
  const [loadedSrc, setLoadedSrc] = useState<string | undefined>();
  const [failed, setFailed] = useState(false);
  const loaded = !!shownSrc && loadedSrc === shownSrc;
  useEffect(() => {
    setFallback(false);
    setFailed(false);
  }, [photo?.src]);
  useEffect(() => {
    const img = imgRef.current;
    // imagem que já estava no cache: o onLoad pode ter disparado antes do React
    if (img && shownSrc && img.complete && img.naturalWidth > 0) setLoadedSrc(shownSrc);
  }, [shownSrc]);

  // adianta a próxima e a anterior, para a troca ser instantânea
  useEffect(() => {
    if (!open || total < 2) return;
    for (const d of [1, -1]) {
      const p = photos[(index + d + total) % total];
      resolveMedia(p?.src)
        .then((u) => {
          if (u) new Image().src = u;
        })
        .catch(() => {});
    }
  }, [open, index, total, photos]);

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
            <div className="relative aspect-[3/2] w-full bg-paper">
              {shownSrc && (
                <img
                  key={photo.id}
                  ref={imgRef}
                  src={shownSrc}
                  alt={photo.alt}
                  onLoad={() => setLoadedSrc(shownSrc)}
                  onError={() => (fallbackSrc && !fallback ? setFallback(true) : setFailed(true))}
                  className={`pixelated block size-full object-cover ${loaded ? 'motion-safe:animate-photo-in' : 'opacity-0'}`}
                />
              )}
              {!failed && <MediaLoader done={loaded} kind="foto" />}
              {failed && (
                <p role="alert" className="absolute inset-0 flex items-center justify-center p-4 text-center font-pixel text-base text-muted">
                  Não foi possível carregar esta foto.
                </p>
              )}
            </div>
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
