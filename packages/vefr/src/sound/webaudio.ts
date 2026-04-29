import type { InstrumentId, SoundOutput } from "../engine/sound-port.js";
import type { DrumHit } from "../engine/types.js";

/**
 * WebAudio-side patch parameters keyed by {@link InstrumentId}.
 * Each entry shapes a pluck-style voice: oscillator + lowpass + simple
 * exp-attack/decay envelope. `lengthSeconds` from `playNote` is
 * intentionally ignored — this stays the "pikopiko" voice family for now.
 */
type WebAudioPatch = {
  /** Oscillator wave shape used for the body. */
  oscType: OscillatorType;
  /** Lowpass cutoff frequency (Hz). */
  filterFreq: number;
  /** Lowpass resonance Q. Higher values get more nasal / vocal. */
  filterQ: number;
  /** Exponential decay length (s) following the 4 ms attack. */
  decay: number;
};

/**
 * Built-in WebAudio patches. Adding a new id only requires (a) widening
 * {@link InstrumentId} and (b) adding an entry here. Drum voices are
 * unaffected — they live on a parallel synthesis path inside `playDrum`.
 *
 * `pluck` and `bass` reproduce the historical role-based tuning so
 * projects that default to those keep sounding identical; the rest fill
 * out the character grid (sustained vs. short, bright vs. dark, melody
 * vs. bass) without leaving the single-osc + lowpass + pluck-envelope
 * synthesis template.
 */
const INSTRUMENT_PATCHES: Record<InstrumentId, WebAudioPatch> = {
  pluck: { oscType: "triangle", filterFreq: 2200, filterQ: 0.7, decay: 0.13 },
  bass: { oscType: "square", filterFreq: 700, filterQ: 3, decay: 0.18 },
  lead: { oscType: "sawtooth", filterFreq: 3000, filterQ: 1, decay: 0.22 },
  pad: { oscType: "sine", filterFreq: 1500, filterQ: 0.5, decay: 0.3 },
  bell: { oscType: "sine", filterFreq: 4000, filterQ: 0.5, decay: 0.6 },
  keys: { oscType: "triangle", filterFreq: 1400, filterQ: 0.5, decay: 0.2 },
  sub: { oscType: "sine", filterFreq: 200, filterQ: 1, decay: 0.25 },
  chip: { oscType: "square", filterFreq: 4000, filterQ: 0.5, decay: 0.1 },
  stab: { oscType: "sawtooth", filterFreq: 2500, filterQ: 5, decay: 0.06 },
};

/**
 * WebAudio implementation of {@link SoundOutput}.
 *
 * Pitched voices follow the {@link INSTRUMENT_PATCHES} table, looked up
 * by `instrumentId`. The envelope is always pluck-shaped (fast attack +
 * exponential decay) so `lengthSeconds` stays decoupled from how long
 * the note actually rings; pattern `lengthTicks` controls only spacing.
 *
 * Drums are layered: kick = sine body + noise click; snare = noise burst +
 * triangle body; hats = high-passed noise.
 */
export class WebAudioSoundOutput implements SoundOutput {
  private readonly master: GainNode;
  private readonly drumNoiseBuffer: AudioBuffer;

  constructor(private readonly ctx: AudioContext) {
    this.master = ctx.createGain();
    this.master.gain.value = 0.4;
    this.master.connect(ctx.destination);
    this.drumNoiseBuffer = createNoiseBuffer(ctx, 0.5);
  }

  /** Set the master gain (0..1). */
  setMasterVolume(gain: number): void {
    this.master.gain.value = gain;
  }

  /** Dispatch a drum hit to the matching synth voice. */
  playDrum(time: number, hit: DrumHit, gain: number): void {
    const t = Math.max(time, this.ctx.currentTime);
    const amp = gain * hit.velocity;
    switch (hit.pad) {
      case "kick":
        this.synthKick(t, amp);
        return;
      case "snare":
        this.synthSnare(t, amp);
        return;
      case "closed-hat":
        this.synthHat(t, amp, 0.04);
        return;
      case "open-hat":
        this.synthHat(t, amp, 0.22);
        return;
      default:
        assertNever(hit.pad);
    }
  }

  /**
   * Play a pitched note as a pluck: short attack, exponential decay,
   * with timbre selected by `instrumentId` via {@link INSTRUMENT_PATCHES}.
   * `lengthSeconds` is intentionally ignored for envelope shaping —
   * patterns control spacing via `lengthTicks`, not held duration.
   */
  playNote(
    time: number,
    midi: number,
    _lengthSeconds: number,
    velocity: number,
    instrumentId: InstrumentId,
    gain: number,
  ): void {
    const t = Math.max(time, this.ctx.currentTime);
    const patch = INSTRUMENT_PATCHES[instrumentId];
    const freq = 440 * 2 ** ((midi - 69) / 12);
    const osc = this.ctx.createOscillator();
    osc.type = patch.oscType;
    osc.frequency.value = freq;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = patch.filterFreq;
    filter.Q.value = patch.filterQ;

    const env = this.ctx.createGain();
    const peak = Math.max(gain * velocity, 0.0001);
    const attack = 0.004;
    const decay = patch.decay;
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(peak, t + attack);
    env.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    osc.connect(filter).connect(env).connect(this.master);
    osc.start(t);
    osc.stop(t + attack + decay + 0.02);
  }

  /**
   * Sine sweep for the body + a brief high-passed noise click for the snap.
   * Produces a kick that reads on small speakers without booming the mix.
   */
  private synthKick(t: number, amp: number): void {
    const osc = this.ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.08);
    const body = this.ctx.createGain();
    body.gain.setValueAtTime(0.0001, t);
    body.gain.exponentialRampToValueAtTime(amp, t + 0.003);
    body.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
    osc.connect(body).connect(this.master);
    osc.start(t);
    osc.stop(t + 0.34);

    const click = this.ctx.createBufferSource();
    click.buffer = this.drumNoiseBuffer;
    const clickHp = this.ctx.createBiquadFilter();
    clickHp.type = "highpass";
    clickHp.frequency.value = 1500;
    const clickEnv = this.ctx.createGain();
    clickEnv.gain.setValueAtTime(amp * 0.35, t);
    clickEnv.gain.exponentialRampToValueAtTime(0.0001, t + 0.018);
    click.connect(clickHp).connect(clickEnv).connect(this.master);
    click.start(t);
    click.stop(t + 0.025);
  }

  /**
   * High-passed noise burst for the body + a low triangle tone for the
   * "ring" — together they read more like a snare than noise alone.
   */
  private synthSnare(t: number, amp: number): void {
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.drumNoiseBuffer;
    const hp = this.ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 1800;
    const noiseEnv = this.ctx.createGain();
    noiseEnv.gain.setValueAtTime(0.0001, t);
    noiseEnv.gain.exponentialRampToValueAtTime(amp * 0.9, t + 0.003);
    noiseEnv.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
    noise.connect(hp).connect(noiseEnv).connect(this.master);
    noise.start(t);
    noise.stop(t + 0.16);

    const tone = this.ctx.createOscillator();
    tone.type = "triangle";
    tone.frequency.value = 220;
    const toneEnv = this.ctx.createGain();
    toneEnv.gain.setValueAtTime(0.0001, t);
    toneEnv.gain.exponentialRampToValueAtTime(amp * 0.4, t + 0.003);
    toneEnv.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
    tone.connect(toneEnv).connect(this.master);
    tone.start(t);
    tone.stop(t + 0.1);
  }

  /** High-passed noise burst — `length` controls closed vs. open hat decay. */
  private synthHat(t: number, amp: number, length: number): void {
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.drumNoiseBuffer;
    const hp = this.ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 7000;
    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(amp * 0.5, t + 0.001);
    env.gain.exponentialRampToValueAtTime(0.0001, t + length);
    noise.connect(hp).connect(env).connect(this.master);
    noise.start(t);
    noise.stop(t + length + 0.02);
  }
}

/** Pre-render a uniform white-noise buffer for reuse across drum voices. */
function createNoiseBuffer(ctx: AudioContext, durationSec: number): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * durationSec);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

/** Compile-time exhaustiveness helper for `switch` statements. */
function assertNever(_x: never): never {
  throw new Error("unreachable");
}
