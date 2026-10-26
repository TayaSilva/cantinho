import { formatTime, useAudio } from '../ui/AudioControl';
import { Icon, PixelButton } from '../ui/PixelButton';
import { BaseModal } from './BaseModal';

interface RadioModalProps {
  open: boolean;
  onClose: () => void;
  playlistName: string;
  keepPlayingOnClose: boolean;
}

/** Rádio retrô ampliado com a playlist de memórias. */
export function RadioModal({ open, onClose, playlistName, keepPlayingOnClose }: RadioModalProps) {
  const audio = useAudio();
  const { tracks, index, track, playing, muted, currentTime, duration } = audio;

  const handleClose = () => {
    if (!keepPlayingOnClose) audio.pause();
    onClose();
  };

  if (!track) {
    return (
      <BaseModal open={open} onClose={handleClose} title="Rádio · Playlist de memórias" widthClass="max-w-[640px]">
        <p className="p-6 text-center">A playlist ainda está vazia.</p>
      </BaseModal>
    );
  }

  return (
    <BaseModal open={open} onClose={handleClose} title="Rádio · Playlist de memórias" widthClass="max-w-[640px]">
      <div className="flex flex-col gap-5 p-5 sm:p-6">
        <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-6">
          <RadioArt playing={playing} needle={index / Math.max(1, tracks.length - 1)} />
          <div className="flex min-w-0 flex-col gap-1.5 text-center sm:text-left">
            <span className="text-[13px] font-bold uppercase tracking-[.08em] text-plum">{playlistName}</span>
            <span className="font-pixel text-[28px] font-semibold leading-tight">{track.title}</span>
            <span className="text-[15px] text-muted">{track.artist}</span>
            <span className={`text-[13px] font-bold ${playing ? 'text-[#8A3F55]' : 'text-muted'}`} aria-live="polite">
              {playing ? (muted ? '● Tocando (som silenciado)' : '● Tocando agora') : 'Pausado'}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="radio-progress" className="sr-only">Posição da música</label>
          <input
            id="radio-progress"
            type="range"
            min={0}
            max={duration || 0}
            step={1}
            value={Math.min(currentTime, duration || 0)}
            onChange={(e) => audio.seek(Number(e.target.value))}
            className="pixel-range"
            disabled={!duration}
          />
          <div className="flex justify-between text-[13px] text-muted">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-4">
          <PixelButton variant="paper" size="icon" className="size-[52px]" onClick={audio.prev} aria-label="Música anterior">
            <Icon name="prev" className="size-5" />
          </PixelButton>
          <PixelButton variant="accent" size="icon-lg" className="border-4" onClick={audio.toggle} aria-label={playing ? 'Pausar' : 'Tocar'} data-autofocus>
            <Icon name={playing ? 'pause' : 'play'} className="size-7" />
          </PixelButton>
          <PixelButton variant="paper" size="icon" className="size-[52px]" onClick={audio.next} aria-label="Próxima música">
            <Icon name="next" className="size-5" />
          </PixelButton>
        </div>

        <ol className="flex flex-col border-[3px] border-ink">
          {tracks.map((t, i) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => audio.select(i)}
                aria-current={i === index ? 'true' : undefined}
                className={`flex min-h-11 w-full cursor-pointer items-center gap-3 border-b-2 border-dashed border-wall-2 px-3.5 py-2.5 text-left text-[15px] hover:bg-wall ${
                  i === index ? 'bg-highlight font-bold' : ''
                }`}
              >
                <span className="w-6 font-pixel text-plum">{String(i + 1).padStart(2, '0')}</span>
                <span className="flex-1">{t.title}</span>
                {i === index && playing && <EqBars small />}
              </button>
            </li>
          ))}
        </ol>

        <p className="text-[13px] text-muted">
          {track.license ? `${track.license}.` : ''}{keepPlayingOnClose ? ' A música continua tocando quando você fecha o rádio.' : ''}
        </p>
      </div>
    </BaseModal>
  );
}

function EqBars({ small }: { small?: boolean }) {
  return (
    <span aria-hidden="true" className={`flex items-end gap-0.5 ${small ? 'h-3.5' : 'h-6'}`}>
      {[0, 1, 2, 3].map((i) => (
        <span key={i} className="eq-bar h-full w-1 bg-rug" style={{ animationDelay: `${i * 0.15}s` }} />
      ))}
    </span>
  );
}

/** Rádio pixelado ampliado. O ponteiro do dial anda conforme a faixa. */
function RadioArt({ playing, needle }: { playing: boolean; needle: number }) {
  const bars = ['#C98190', '#7E9C8E', '#C98190', '#7E9C8E', '#C98190'];
  return (
    <svg width="224" height="140" viewBox="0 0 64 40" shapeRendering="crispEdges" role="img" aria-label="Rádio retrô" className="w-48 shrink-0 sm:w-56">
      <rect x="44" y="0" width="1" height="6" fill="#46353F" transform="rotate(30 44 6)" />
      <rect x="2" y="5" width="60" height="33" fill="#46353F" />
      <rect x="3" y="6" width="58" height="31" fill="#E3A857" />
      <rect x="3" y="33" width="58" height="4" fill="#B97F3A" />
      <rect x="6" y="9" width="24" height="22" fill="#7A4B33" />
      <g fill="#C98A4A">
        {[11, 15, 19, 23, 27].map((y, r) =>
          [8, 12, 16, 20, 24].map((x) => <rect key={`${x}-${y}`} x={x + (r % 2 ? 2 : 0)} y={y} width="2" height="2" />),
        )}
      </g>
      <rect x="34" y="9" width="24" height="10" fill="#46353F" />
      <rect x="35" y="10" width="22" height="8" fill="#F8E6B5" />
      <g fill="#A7755B">
        {[37, 41, 45, 49, 53].map((x) => <rect key={x} x={x} y="15" width="1" height="2" />)}
      </g>
      <rect x={37 + needle * 16} y="10" width="1" height="8" fill="#C98190" className="transition-[x] duration-500" />
      {bars.map((c, i) => (
        <rect key={i} className={playing ? 'eq-bar' : ''} style={{ animationDelay: `${i * 0.13}s` }} x={35 + i * 4} y={playing ? 22 : 27} width="3" height={playing ? 9 : 4} fill={c} />
      ))}
      <rect x="55" y="23" width="4" height="4" fill="#46353F" />
      <rect x="55" y="28" width="4" height="4" fill="#46353F" />
      <rect x="6" y="38" width="6" height="2" fill="#46353F" />
      <rect x="52" y="38" width="6" height="2" fill="#46353F" />
    </svg>
  );
}
