import type { DrumKitId, InstrumentId, SoundOutput } from "../engine/sound-port.js";
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
  keys: { oscType: "triangle", filterFreq: 1400, filterQ: 0.5, decay: 0.2 },
  bell: { oscType: "sine", filterFreq: 4000, filterQ: 0.5, decay: 0.6 },
  pluck: { oscType: "triangle", filterFreq: 2200, filterQ: 0.7, decay: 0.13 },
  bass: { oscType: "square", filterFreq: 700, filterQ: 3, decay: 0.18 },
  pick: { oscType: "triangle", filterFreq: 1100, filterQ: 2, decay: 0.12 },
  sub: { oscType: "sine", filterFreq: 200, filterQ: 1, decay: 0.25 },
  acid: { oscType: "sawtooth", filterFreq: 600, filterQ: 8, decay: 0.2 },
  growl: { oscType: "sawtooth", filterFreq: 380, filterQ: 4, decay: 0.28 },
  lead: { oscType: "sawtooth", filterFreq: 3000, filterQ: 1, decay: 0.22 },
  chip: { oscType: "square", filterFreq: 4000, filterQ: 0.5, decay: 0.1 },
  stab: { oscType: "sawtooth", filterFreq: 2500, filterQ: 5, decay: 0.06 },
  pad: { oscType: "sine", filterFreq: 1500, filterQ: 0.5, decay: 0.3 },
};

/**
 * Per-kit synthesis parameters. Each kit voices the same four pads
 * (kick / snare / closed-hat / open-hat); switching kits varies the
 * concrete numbers (filter cutoffs, decay lengths, click/tone ratios)
 * but not the topology.
 */
type DrumKitParams = {
  /**
   * Body sine sweep + a brief click. `click` may be `null` for kits
   * that want a transient-less boom (e.g. 808-style sub kicks).
   */
  kick: {
    pitchStart: number;
    pitchEnd: number;
    /** Seconds for the pitch ramp from `pitchStart` to `pitchEnd`. */
    pitchRamp: number;
    /** Body envelope decay (s). */
    bodyDecay: number;
    click: {
      filterType: "highpass" | "lowpass";
      freq: number;
      /** Click amplitude as a fraction of the post-velocity gain. */
      ampRatio: number;
      decay: number;
    } | null;
  };
  /**
   * Filtered noise burst + a low triangle "ring". Snare character mostly
   * lives in the noise filter and the noise/tone amplitude balance.
   */
  snare: {
    noise: {
      filterType: "highpass" | "bandpass";
      freq: number;
      q: number;
      ampRatio: number;
      decay: number;
    };
    tone: {
      freq: number;
      ampRatio: number;
      decay: number;
    };
  };
  /**
   * High-passed noise burst; `closedLength` and `openLength` set the two
   * pads' decays. `ampRatio` scales both relative to post-velocity gain.
   */
  hat: {
    hpFreq: number;
    closedLength: number;
    openLength: number;
    ampRatio: number;
  };
};

/**
 * Built-in kit voicings. Adding a kit only requires (a) widening
 * {@link DrumKitId} and (b) adding an entry here. `standard` keeps the
 * historical numbers so projects authored before the kit selector existed
 * sound bit-identical when stamped with `kitId: "standard"`.
 */
const DRUM_KITS: Record<DrumKitId, DrumKitParams> = {
  standard: {
    kick: {
      pitchStart: 140,
      pitchEnd: 40,
      pitchRamp: 0.08,
      bodyDecay: 0.32,
      click: { filterType: "highpass", freq: 1500, ampRatio: 0.35, decay: 0.018 },
    },
    snare: {
      noise: { filterType: "highpass", freq: 1800, q: 1, ampRatio: 0.9, decay: 0.13 },
      tone: { freq: 220, ampRatio: 0.4, decay: 0.08 },
    },
    hat: { hpFreq: 7000, closedLength: 0.04, openLength: 0.22, ampRatio: 0.5 },
  },
  lofi: {
    kick: {
      pitchStart: 100,
      pitchEnd: 32,
      pitchRamp: 0.1,
      bodyDecay: 0.45,
      click: { filterType: "lowpass", freq: 500, ampRatio: 0.22, decay: 0.04 },
    },
    snare: {
      noise: { filterType: "bandpass", freq: 1400, q: 2, ampRatio: 0.65, decay: 0.12 },
      tone: { freq: 200, ampRatio: 0.45, decay: 0.1 },
    },
    hat: { hpFreq: 5000, closedLength: 0.05, openLength: 0.18, ampRatio: 0.4 },
  },
  boom: {
    kick: {
      pitchStart: 80,
      pitchEnd: 25,
      pitchRamp: 0.12,
      bodyDecay: 0.7,
      click: null,
    },
    snare: {
      noise: { filterType: "highpass", freq: 2200, q: 1, ampRatio: 1.0, decay: 0.1 },
      tone: { freq: 200, ampRatio: 0.25, decay: 0.06 },
    },
    hat: { hpFreq: 7500, closedLength: 0.05, openLength: 0.32, ampRatio: 0.5 },
  },
};

/**
 * WebAudio implementation of {@link SoundOutput}.
 *
 * Pitched voices follow the {@link INSTRUMENT_PATCHES} table, looked up
 * by `instrumentId`. The envelope is always pluck-shaped (fast attack +
 * exponential decay) so `lengthSeconds` stays decoupled from how long
 * the note actually rings; pattern `lengthTicks` controls only spacing.
 *
 * Drum voices follow the {@link DRUM_KITS} table, looked up by `kitId`.
 * Same topology across kits (sine-sweep kick + click, noise+tone snare,
 * HP-noise hats) — the table tunes the numbers per kit.
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

  /** Dispatch a drum hit to the matching synth voice for the selected kit. */
  playDrum(time: number, hit: DrumHit, kitId: DrumKitId, gain: number): void {
    const t = Math.max(time, this.ctx.currentTime);
    const amp = gain * hit.velocity;
    const kit = DRUM_KITS[kitId];
    switch (hit.pad) {
      case "kick":
        this.synthKick(t, amp, kit.kick);
        return;
      case "snare":
        this.synthSnare(t, amp, kit.snare);
        return;
      case "closed-hat":
        this.synthHat(t, amp, kit.hat, kit.hat.closedLength);
        return;
      case "open-hat":
        this.synthHat(t, amp, kit.hat, kit.hat.openLength);
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
   * Sine sweep for the body + an optional brief filtered noise click for
   * the transient. Click filter type and cutoff differ per kit — `highpass`
   * gives a "modern click" snap, `lowpass` gives the dampened thud lo-fi
   * kits use, `null` drops the click entirely (808-style).
   */
  private synthKick(t: number, amp: number, params: DrumKitParams["kick"]): void {
    const osc = this.ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(params.pitchStart, t);
    osc.frequency.exponentialRampToValueAtTime(params.pitchEnd, t + params.pitchRamp);
    const body = this.ctx.createGain();
    body.gain.setValueAtTime(0.0001, t);
    body.gain.exponentialRampToValueAtTime(amp, t + 0.003);
    body.gain.exponentialRampToValueAtTime(0.0001, t + params.bodyDecay);
    osc.connect(body).connect(this.master);
    osc.start(t);
    osc.stop(t + params.bodyDecay + 0.02);

    if (params.click === null) return;
    const click = this.ctx.createBufferSource();
    click.buffer = this.drumNoiseBuffer;
    const clickFilter = this.ctx.createBiquadFilter();
    clickFilter.type = params.click.filterType;
    clickFilter.frequency.value = params.click.freq;
    const clickEnv = this.ctx.createGain();
    clickEnv.gain.setValueAtTime(amp * params.click.ampRatio, t);
    clickEnv.gain.exponentialRampToValueAtTime(0.0001, t + params.click.decay);
    click.connect(clickFilter).connect(clickEnv).connect(this.master);
    click.start(t);
    click.stop(t + params.click.decay + 0.01);
  }

  /**
   * Filtered noise burst for the body + a low triangle tone for the "ring".
   * Filter type / cutoff / Q on the noise side decide where the snare sits
   * on the bright-crack ↔ dampened-tap axis; the tone amplitude ratio
   * controls how much "drum" vs "noise" character it has.
   */
  private synthSnare(t: number, amp: number, params: DrumKitParams["snare"]): void {
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.drumNoiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = params.noise.filterType;
    filter.frequency.value = params.noise.freq;
    filter.Q.value = params.noise.q;
    const noiseEnv = this.ctx.createGain();
    noiseEnv.gain.setValueAtTime(0.0001, t);
    noiseEnv.gain.exponentialRampToValueAtTime(amp * params.noise.ampRatio, t + 0.003);
    noiseEnv.gain.exponentialRampToValueAtTime(0.0001, t + params.noise.decay);
    noise.connect(filter).connect(noiseEnv).connect(this.master);
    noise.start(t);
    noise.stop(t + params.noise.decay + 0.03);

    const tone = this.ctx.createOscillator();
    tone.type = "triangle";
    tone.frequency.value = params.tone.freq;
    const toneEnv = this.ctx.createGain();
    toneEnv.gain.setValueAtTime(0.0001, t);
    toneEnv.gain.exponentialRampToValueAtTime(amp * params.tone.ampRatio, t + 0.003);
    toneEnv.gain.exponentialRampToValueAtTime(0.0001, t + params.tone.decay);
    tone.connect(toneEnv).connect(this.master);
    tone.start(t);
    tone.stop(t + params.tone.decay + 0.02);
  }

  /**
   * High-passed noise burst — `length` selects closed vs. open hat decay.
   * `params.hpFreq` tunes the kit's overall hat brightness; `ampRatio`
   * scales relative to the post-velocity gain.
   */
  private synthHat(t: number, amp: number, params: DrumKitParams["hat"], length: number): void {
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.drumNoiseBuffer;
    const hp = this.ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = params.hpFreq;
    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(amp * params.ampRatio, t + 0.001);
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
