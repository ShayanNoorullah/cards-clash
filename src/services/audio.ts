/**
 * Procedural audio: every sound effect and music track is synthesised with
 * the Web Audio API, so the game ships with zero audio files and zero
 * licensing questions. `src/data/audio-manifest.json` can map any sound id to
 * a real file later (it is then played instead of the synth).
 *
 * Browsers only allow audio after a user gesture: `unlock()` is called on the
 * first tap/key press. Without Web Audio (tests, old browsers) everything is a
 * silent no-op.
 */
import manifest from '../data/audio-manifest.json';
import { Rng } from '../engine/rng';
import { logger } from './logger';
import { getSettings, onSettingsChange, type Settings } from './settings';

const log = logger.child('Audio');

export const SFX_IDS = [
  'click',
  'back',
  'draw',
  'play',
  'summon',
  'spell',
  'building',
  'attack',
  'hit',
  'heroHit',
  'heal',
  'destroy',
  'floop',
  'freeze',
  'poison',
  'shield',
  'ultimate',
  'flip',
  'move',
  'turnStart',
  'endTurn',
  'victory',
  'defeat',
  'chest',
  'reveal',
  'rare',
  'coins',
  'levelUp',
  'star',
  'pick',
  'error',
  'charge',
] as const;
export type SfxId = (typeof SFX_IDS)[number];

export const MUSIC_IDS = ['menu', 'map', 'battle', 'boss'] as const;
export type MusicId = (typeof MUSIC_IDS)[number];

type Wave = OscillatorType;

/** One synth voice: a tone with an optional pitch slide, or a filtered noise burst. */
interface Voice {
  kind: 'tone' | 'noise';
  freq: number;
  to?: number;
  wave?: Wave;
  dur: number;
  gain: number;
  at?: number;
  filter?: number;
}

const tone = (freq: number, dur: number, wave: Wave, gain: number, at = 0, to?: number): Voice => {
  const v: Voice = { kind: 'tone', freq, dur, wave, gain, at };
  if (to !== undefined) v.to = to;
  return v;
};
const noise = (dur: number, filter: number, gain: number, at = 0): Voice => ({
  kind: 'noise',
  freq: 0,
  dur,
  gain,
  at,
  filter,
});
const arp = (notes: number[], step: number, wave: Wave, gain: number, dur = step * 1.6): Voice[] =>
  notes.map((f, i) => tone(f, dur, wave, gain, i * step));

/** Sound recipes (Hz, seconds, relative gain). */
export const SFX: Record<SfxId, Voice[]> = {
  click: [tone(880, 0.05, 'square', 0.12), tone(1320, 0.04, 'sine', 0.08, 0.02)],
  back: [tone(660, 0.06, 'square', 0.1, 0, 440)],
  draw: [noise(0.12, 4000, 0.18), tone(700, 0.06, 'triangle', 0.08, 0.04, 900)],
  play: [noise(0.1, 2000, 0.2), tone(220, 0.14, 'triangle', 0.25, 0, 330)],
  summon: [tone(330, 0.12, 'triangle', 0.25, 0, 660), tone(660, 0.18, 'sine', 0.15, 0.08, 990)],
  spell: [...arp([523, 659, 784, 1047], 0.05, 'sine', 0.16), noise(0.3, 6000, 0.08, 0.05)],
  building: [tone(110, 0.2, 'square', 0.18, 0, 80), noise(0.15, 800, 0.25)],
  attack: [noise(0.14, 3000, 0.22), tone(500, 0.1, 'sawtooth', 0.1, 0, 200)],
  hit: [noise(0.08, 1500, 0.35), tone(160, 0.12, 'square', 0.18, 0, 70)],
  heroHit: [tone(120, 0.25, 'sawtooth', 0.25, 0, 50), noise(0.2, 900, 0.3)],
  heal: [...arp([523, 784, 1047], 0.07, 'sine', 0.14, 0.25)],
  destroy: [noise(0.35, 1200, 0.35), tone(200, 0.35, 'sawtooth', 0.15, 0, 40)],
  floop: [tone(400, 0.18, 'sine', 0.2, 0, 1200), tone(1200, 0.12, 'triangle', 0.1, 0.12, 800)],
  freeze: [...arp([1568, 2093, 1760, 2349], 0.04, 'triangle', 0.1, 0.12), noise(0.25, 8000, 0.08)],
  poison: [tone(300, 0.25, 'sine', 0.18, 0, 150), tone(320, 0.2, 'sine', 0.1, 0.08, 160)],
  shield: [tone(880, 0.2, 'triangle', 0.15, 0, 1320), tone(1320, 0.25, 'sine', 0.08, 0.05)],
  ultimate: [
    ...arp([262, 330, 392, 523, 659, 784], 0.06, 'sawtooth', 0.1, 0.3),
    noise(0.6, 5000, 0.12, 0.1),
    tone(65, 0.6, 'sine', 0.3, 0.05),
  ],
  flip: [noise(0.25, 2500, 0.2), tone(300, 0.2, 'triangle', 0.12, 0, 150)],
  move: [noise(0.12, 2500, 0.15), tone(400, 0.1, 'sine', 0.1, 0, 600)],
  turnStart: [tone(523, 0.12, 'triangle', 0.14), tone(784, 0.16, 'triangle', 0.12, 0.09)],
  endTurn: [tone(784, 0.08, 'square', 0.1), tone(523, 0.12, 'square', 0.1, 0.07)],
  victory: [
    ...arp([523, 659, 784, 1047, 784, 1047], 0.11, 'square', 0.12, 0.3),
    tone(131, 0.8, 'triangle', 0.2, 0.2),
  ],
  defeat: [...arp([392, 330, 262, 196], 0.18, 'triangle', 0.16, 0.4), tone(98, 0.9, 'sine', 0.2, 0.4)],
  chest: [
    noise(0.3, 1500, 0.25),
    tone(220, 0.3, 'square', 0.12, 0, 440),
    ...arp([659, 880, 1319], 0.06, 'sine', 0.12),
  ],
  reveal: [noise(0.08, 5000, 0.12), tone(990, 0.08, 'sine', 0.1)],
  rare: [...arp([784, 988, 1175, 1568, 1976], 0.06, 'sine', 0.13, 0.3), noise(0.5, 9000, 0.06, 0.1)],
  coins: [...arp([1319, 1568, 1976], 0.05, 'square', 0.07, 0.08)],
  levelUp: [...arp([523, 659, 784, 1047, 1319], 0.08, 'triangle', 0.15, 0.25)],
  star: [tone(1047, 0.15, 'sine', 0.15, 0, 1568), tone(2093, 0.2, 'sine', 0.06, 0.05)],
  pick: [tone(660, 0.07, 'triangle', 0.14), tone(990, 0.09, 'triangle', 0.1, 0.05)],
  error: [tone(220, 0.12, 'square', 0.12), tone(180, 0.16, 'square', 0.12, 0.1)],
  charge: [tone(300, 0.3, 'sine', 0.1, 0, 900)],
};

/** A generative music track: chord loop, bass, pads, a seeded melody and optional drums. */
interface Track {
  bpm: number;
  /** MIDI root note. */
  root: number;
  /** Scale intervals (semitones). */
  scale: number[];
  /** Chord roots as scale degrees, one per bar. */
  chords: number[];
  melody: Wave;
  /** Chance that an 8th-note step plays a melody note. */
  density: number;
  drums: boolean;
}

const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const MINOR = [0, 2, 3, 5, 7, 8, 10];
const DORIAN = [0, 2, 3, 5, 7, 9, 10];

export const TRACKS: Record<MusicId, Track> = {
  menu: {
    bpm: 96,
    root: 60,
    scale: MAJOR,
    chords: [0, 5, 3, 4],
    melody: 'triangle',
    density: 0.45,
    drums: false,
  },
  map: {
    bpm: 104,
    root: 62,
    scale: DORIAN,
    chords: [0, 3, 6, 4],
    melody: 'sine',
    density: 0.4,
    drums: false,
  },
  battle: {
    bpm: 124,
    root: 57,
    scale: MINOR,
    chords: [0, 5, 6, 4],
    melody: 'square',
    density: 0.55,
    drums: true,
  },
  boss: {
    bpm: 136,
    root: 52,
    scale: MINOR,
    chords: [0, 1, 5, 4],
    melody: 'sawtooth',
    density: 0.6,
    drums: true,
  },
};

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

/** Note of a scale degree (wrapping into higher octaves). */
export function degreeToMidi(track: Track, degree: number): number {
  const len = track.scale.length;
  const octave = Math.floor(degree / len);
  const idx = ((degree % len) + len) % len;
  return track.root + octave * 12 + track.scale[idx]!;
}

interface AudioFileManifest {
  version: number;
  sounds: Partial<Record<string, string>>;
}

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private lastPlayed = new Map<SfxId, number>();
  private music: {
    id: MusicId;
    timer: ReturnType<typeof setInterval>;
    step: number;
    next: number;
    bus: GainNode;
  } | null = null;
  private wantedMusic: MusicId | null = null;
  private readonly files = (manifest as AudioFileManifest).sounds;

  constructor() {
    onSettingsChange((s) => this.applyVolumes(s));
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (!this.ctx) return;
        if (document.hidden) void this.ctx.suspend();
        else void this.ctx.resume();
      });
    }
  }

  get available(): boolean {
    return typeof window !== 'undefined' && ('AudioContext' in window || 'webkitAudioContext' in window);
  }

  /** Creates/resumes the audio context; call from a user gesture. */
  unlock(): void {
    if (!this.available) return;
    try {
      if (!this.ctx) {
        const Ctor =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.ctx = new Ctor();
        this.master = this.ctx.createGain();
        this.master.connect(this.ctx.destination);
        this.sfxGain = this.ctx.createGain();
        this.sfxGain.connect(this.master);
        this.musicGain = this.ctx.createGain();
        this.musicGain.connect(this.master);
        this.noiseBuffer = this.makeNoise(this.ctx);
        this.applyVolumes(getSettings());
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      if (this.wantedMusic && !this.music) this.startMusic(this.wantedMusic);
    } catch (err) {
      log.warn('Audio unavailable', err);
      this.ctx = null;
    }
  }

  private makeNoise(ctx: AudioContext): AudioBuffer {
    const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = buf.getChannelData(0);
    const rng = new Rng('noise');
    for (let i = 0; i < data.length; i++) data[i] = rng.next() * 2 - 1;
    return buf;
  }

  private applyVolumes(s: Readonly<Settings>): void {
    if (!this.ctx || !this.sfxGain || !this.musicGain) return;
    const t = this.ctx.currentTime;
    this.sfxGain.gain.setTargetAtTime(s.sfxVolume, t, 0.02);
    this.musicGain.gain.setTargetAtTime(s.musicVolume * 0.4, t, 0.05);
  }

  /** Plays a sound effect (rate-limited so bursts of identical events don't stack). */
  play(id: SfxId): void {
    const ctx = this.ctx;
    if (!ctx || !this.sfxGain || getSettings().sfxVolume <= 0) return;
    const now = ctx.currentTime;
    if (now - (this.lastPlayed.get(id) ?? -1) < 0.045) return;
    this.lastPlayed.set(id, now);
    const file = this.files[id];
    if (file) {
      const el = new Audio(file);
      el.volume = getSettings().sfxVolume;
      void el.play().catch(() => undefined);
      return;
    }
    for (const v of SFX[id]) this.voice(v, now, this.sfxGain);
  }

  private voice(v: Voice, base: number, out: AudioNode): void {
    const ctx = this.ctx!;
    const start = base + (v.at ?? 0);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, start);
    env.gain.exponentialRampToValueAtTime(Math.max(0.0002, v.gain), start + 0.008);
    env.gain.exponentialRampToValueAtTime(0.0001, start + v.dur);
    env.connect(out);
    if (v.kind === 'noise') {
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = v.filter ?? 2000;
      src.connect(f);
      f.connect(env);
      src.start(start, Math.random() * 0.5, v.dur + 0.05);
      return;
    }
    const osc = ctx.createOscillator();
    osc.type = v.wave ?? 'sine';
    osc.frequency.setValueAtTime(v.freq, start);
    if (v.to) osc.frequency.exponentialRampToValueAtTime(v.to, start + v.dur);
    osc.connect(env);
    osc.start(start);
    osc.stop(start + v.dur + 0.05);
  }

  /** Starts a context's music (no-op if it is already playing). */
  playMusic(id: MusicId): void {
    this.wantedMusic = id;
    if (this.music?.id === id) return;
    this.stopMusic();
    if (this.ctx) this.startMusic(id);
  }

  stopMusic(): void {
    const m = this.music;
    if (!m) return;
    clearInterval(m.timer);
    if (this.ctx) {
      const t = this.ctx.currentTime;
      m.bus.gain.setTargetAtTime(0, t, 0.25);
      setTimeout(() => m.bus.disconnect(), 1500);
    }
    this.music = null;
  }

  /** Stops music and forgets it (e.g. during victory/defeat stingers). */
  silenceMusic(): void {
    this.wantedMusic = null;
    this.stopMusic();
  }

  private startMusic(id: MusicId): void {
    const ctx = this.ctx;
    if (!ctx || !this.musicGain) return;
    const bus = ctx.createGain();
    bus.gain.setValueAtTime(0, ctx.currentTime);
    bus.gain.setTargetAtTime(1, ctx.currentTime, 0.6);
    bus.connect(this.musicGain);
    const track = TRACKS[id];
    const stepDur = 60 / track.bpm / 2; // 8th notes
    const rng = new Rng(`music:${id}`);
    // A fixed 8-bar melody so the loop is recognisable.
    const melody: (number | null)[] = Array.from({ length: 64 }, (_, i) =>
      rng.chance(i % 2 === 0 ? track.density : track.density * 0.5) ? rng.int(0, 7) : null,
    );
    const state = {
      id,
      step: 0,
      next: ctx.currentTime + 0.1,
      bus,
      timer: 0 as unknown as ReturnType<typeof setInterval>,
    };
    const schedule = () => {
      while (state.next < ctx.currentTime + 0.3) {
        this.musicStep(track, melody, state.step, state.next, stepDur, bus);
        state.step = (state.step + 1) % 64;
        state.next += stepDur;
      }
    };
    state.timer = setInterval(schedule, 80);
    schedule();
    this.music = state;
  }

  private musicStep(
    track: Track,
    melody: (number | null)[],
    step: number,
    t: number,
    stepDur: number,
    out: AudioNode,
  ): void {
    const bar = Math.floor(step / 8);
    const chord = track.chords[bar % track.chords.length]!;
    const inBar = step % 8;
    const note = (degree: number, octave: number) => midi(degreeToMidi(track, chord + degree) + octave * 12);
    // Pad: the chord's triad at the start of each bar.
    if (inBar === 0) {
      for (const d of [0, 2, 4]) this.voice(tone(note(d, 0), stepDur * 7.5, 'triangle', 0.05), t, out);
    }
    // Bass on beats 1 and 3 (plus a pickup in battle tracks).
    if (inBar === 0 || inBar === 4 || (track.drums && inBar === 7)) {
      this.voice(tone(note(0, -2), stepDur * 1.8, 'sine', 0.16), t, out);
    }
    // Melody from the fixed 8-bar pattern, using chord-friendly degrees.
    const m = melody[step];
    if (m !== null && m !== undefined) {
      this.voice(
        tone(note(m, 1), stepDur * 1.4, track.melody, track.melody === 'sine' ? 0.07 : 0.035),
        t,
        out,
      );
    }
    if (track.drums) {
      if (inBar === 0 || inBar === 4) this.voice(tone(120, 0.18, 'sine', 0.2, 0, 45), t, out);
      if (inBar === 2 || inBar === 6) this.voice(noise(0.12, 1800, 0.08), t, out);
      this.voice(noise(0.04, 9000, 0.03), t, out);
    }
  }
}

export const audio = new AudioEngine();
