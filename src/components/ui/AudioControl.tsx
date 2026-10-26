import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { resolveMedia } from '../../services/mediaStore';
import type { Track } from '../../types/house';
import { Icon, PixelButton } from './PixelButton';

interface AudioState {
  tracks: Track[];
  index: number;
  track: Track | undefined;
  playing: boolean;
  muted: boolean;
  currentTime: number;
  duration: number;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  select: (index: number) => void;
  seek: (seconds: number) => void;
  toggleMute: () => void;
}

const AudioContext = createContext<AudioState | null>(null);

/**
 * Um único <audio> para a casa inteira: garante que só uma música toca por vez,
 * que ela continua com o rádio fechado e que nada começa sem um clique.
 */
export function AudioProvider({ tracks, children }: { tracks: Track[]; children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const wantsPlay = useRef(false);

  const safeIndex = tracks.length ? Math.min(index, tracks.length - 1) : 0;
  const track = tracks[safeIndex];

  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'none';
    audioRef.current = audio;
    const onTime = () => setCurrentTime(audio.currentTime);
    const onMeta = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audioRef.current = null;
    };
  }, []);

  // Troca de faixa: carrega a nova e continua tocando se já estava tocando.
  const loadedSrc = useRef<string | null>(null);
  const loadTrack = useCallback(async (t: Track | undefined): Promise<boolean> => {
    const audio = audioRef.current;
    if (!audio || !t) return false;
    if (loadedSrc.current === t.src) return true;
    const url = await resolveMedia(t.src);
    if (!url) return false;
    loadedSrc.current = t.src;
    audio.src = url;
    setCurrentTime(0);
    setDuration(0);
    return true;
  }, []);

  useEffect(() => {
    // Não baixe a primeira faixa ao abrir a casa. Em links compartilhados,
    // o carregamento só deve começar quando a pessoa apertar play.
    if (!wantsPlay.current) return;
    void loadTrack(track).then((ok) => {
      if (ok) void audioRef.current?.play().catch(() => setPlaying(false));
    });
  }, [track, loadTrack]);

  // Ao terminar, passa para a próxima.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onEnded = () => setIndex((i) => (tracks.length ? (i + 1) % tracks.length : 0));
    audio.addEventListener('ended', onEnded);
    return () => audio.removeEventListener('ended', onEnded);
  }, [tracks.length]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = muted;
  }, [muted]);

  const play = useCallback(() => {
    wantsPlay.current = true;
    void loadTrack(track).then((ok) => {
      if (ok) void audioRef.current?.play().catch(() => setPlaying(false));
    });
  }, [track, loadTrack]);

  const pause = useCallback(() => {
    wantsPlay.current = false;
    audioRef.current?.pause();
  }, []);

  const value = useMemo<AudioState>(
    () => ({
      tracks,
      index: safeIndex,
      track,
      playing,
      muted,
      currentTime,
      duration,
      play,
      pause,
      toggle: () => (playing ? pause() : play()),
      next: () => setIndex((i) => (tracks.length ? (i + 1) % tracks.length : 0)),
      prev: () => setIndex((i) => (tracks.length ? (i - 1 + tracks.length) % tracks.length : 0)),
      select: (i: number) => {
        wantsPlay.current = true;
        if (i === safeIndex) play();
        else setIndex(i);
      },
      seek: (s: number) => {
        if (audioRef.current) audioRef.current.currentTime = s;
      },
      toggleMute: () => setMuted((m) => !m),
    }),
    [tracks, safeIndex, track, playing, muted, currentTime, duration, play, pause],
  );

  return <AudioContext.Provider value={value}>{children}</AudioContext.Provider>;
}

export function useAudio(): AudioState {
  const ctx = useContext(AudioContext);
  if (!ctx) throw new Error('useAudio precisa estar dentro de <AudioProvider>');
  return ctx;
}

export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** Botão global de som (silenciar / ativar). */
export function AudioControl() {
  const { muted, toggleMute } = useAudio();
  return (
    <PixelButton variant="dark" size="icon" onClick={toggleMute} aria-label={muted ? 'Ativar som' : 'Silenciar'} aria-pressed={muted}>
      <Icon name={muted ? 'mute' : 'sound'} />
    </PixelButton>
  );
}

/** Mini player que aparece quando a música toca com o rádio fechado. */
export function MiniPlayer({ onOpen }: { onOpen: () => void }) {
  const { playing, track, pause } = useAudio();
  if (!playing) return null;
  return (
    <div className="flex items-center gap-2 border-[3px] border-night-3 bg-night-2 py-1 pl-3 pr-1 text-sm text-highlight">
      <Icon name="note" className="size-3.5" />
      <button type="button" onClick={onOpen} className="cursor-pointer text-left hover:underline">
        Tocando: <b>{track?.title}</b>
      </button>
      <button type="button" onClick={pause} aria-label="Pausar música" className="flex size-8 cursor-pointer items-center justify-center bg-night text-highlight">
        <Icon name="pause" className="size-4" />
      </button>
    </div>
  );
}
