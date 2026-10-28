import type { PetAppearance } from '../types/house';

type PetSoundKind = 'cat' | 'dog';

let audioContext: AudioContext | null = null;

function context() {
  if (audioContext) return audioContext;
  const AudioContextConstructor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextConstructor) return null;
  audioContext = new AudioContextConstructor();
  return audioContext;
}

function tone(ctx: AudioContext, start: number, duration: number, from: number, to: number, volume: number, type: OscillatorType = 'triangle') {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(from, start);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, to), start + duration);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain).connect(ctx.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

/** Efeitos curtos sintetizados para não depender de arquivos externos. */
export function playPetSound(kind: string) {
  if (kind !== 'cat' && kind !== 'dog') return;
  const ctx = context();
  if (!ctx) return;
  const start = ctx.currentTime + 0.01;
  void ctx.resume();

  if (kind === 'dog') {
    tone(ctx, start, 0.14, 210, 105, 0.18, 'square');
    tone(ctx, start + 0.16, 0.12, 175, 85, 0.14, 'square');
    return;
  }

  tone(ctx, start, 0.42, 420, 760, 0.12, 'triangle');
  tone(ctx, start + 0.08, 0.34, 720, 330, 0.055, 'sine');
}

export function petSoundKind(pet: PetAppearance): PetSoundKind | null {
  const kind = pet.type.includes('gato') ? 'cat' : pet.type.includes('cachorro') ? 'dog' : null;
  return kind;
}
