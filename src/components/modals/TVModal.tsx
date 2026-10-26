import { useEffect, useRef, useState } from 'react';
import { useMediaUrl } from '../../hooks/useMediaUrl';
import type { Video } from '../../types/house';
import { useAudio } from '../ui/AudioControl';
import { BaseModal } from './BaseModal';

interface TVModalProps {
  open: boolean;
  onClose: () => void;
  videos: Video[];
}

/** TV retrô ampliada com os vídeos do casal. */
export function TVModal({ open, onClose, videos }: TVModalProps) {
  const [current, setCurrent] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audio = useAudio();
  const video = videos[Math.min(current, Math.max(0, videos.length - 1))];
  const src = useMediaUrl(video?.src);
  const poster = useMediaUrl(video?.poster);

  // Pausa ao fechar o modal.
  useEffect(() => {
    if (!open) videoRef.current?.pause();
  }, [open]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = audio.muted;
  }, [audio.muted, current, open]);

  if (!video) {
    return (
      <BaseModal open={open} onClose={onClose} title="TV · Nossos vídeos" look="dark" widthClass="max-w-[820px]">
        <p className="p-6 text-center">Ainda não há vídeos.</p>
      </BaseModal>
    );
  }

  return (
    <BaseModal open={open} onClose={onClose} title="TV · Nossos vídeos" look="dark" widthClass="max-w-[820px]">
      <div className="flex flex-col gap-4 p-4 sm:p-5">
        <div className="flex flex-col gap-4 md:flex-row">
          <div className="relative min-w-0 flex-1 overflow-hidden rounded-[18px] border-[6px] border-ink bg-ink-deep">
            <video
              key={video.id}
              ref={videoRef}
              src={src}
              poster={poster}
              controls
              playsInline
              preload="metadata"
              onPlay={() => audio.pause()}
              className="pixelated block aspect-[16/10] w-full bg-ink-deep object-cover"
              data-autofocus
            >
              Seu navegador não consegue reproduzir este vídeo.
            </video>
            <div aria-hidden="true" className="crt-lines pointer-events-none absolute inset-0" />
          </div>

          <div className="flex flex-col gap-2.5 border-[3px] border-ink-deep bg-night-3 p-3 md:w-52">
            <span className="text-xs font-bold uppercase tracking-[.08em] text-wall-2">Canais</span>
            <ul className="flex flex-col gap-2.5">
              {videos.map((v, i) => (
                <li key={v.id}>
                  <button
                    type="button"
                    onClick={() => setCurrent(i)}
                    aria-current={i === current ? 'true' : undefined}
                    className={`flex min-h-11 w-full cursor-pointer flex-col items-start gap-0.5 border-[3px] border-ink-deep px-3 py-2 text-left text-ink hover:brightness-105 ${
                      i === current ? 'bg-highlight' : 'bg-wall-2'
                    }`}
                  >
                    <span className="font-pixel text-[15px] font-semibold">{v.title}</span>
                    <span className="text-xs">Canal {i + 1}</span>
                  </button>
                </li>
              ))}
            </ul>
            <div aria-hidden="true" className="mt-auto flex justify-center gap-2 pt-2">
              <span className="size-[18px] border-[3px] border-ink-deep bg-[#E3A857]" />
              <span className="size-[18px] border-[3px] border-ink-deep bg-rug" />
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="font-pixel text-lg font-semibold">{video.title}</span>
          {video.description && <span className="text-sm text-wall-2">{video.description}</span>}
        </div>
      </div>
    </BaseModal>
  );
}
