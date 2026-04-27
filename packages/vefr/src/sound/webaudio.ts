import type { SoundOutput, VoiceId } from "../engine/sound-port.js";
import type { DrumHit } from "../engine/types.js";

/**
 * WebAudio implementation of {@link SoundOutput}.
 *
 * The pitched voices are pluck-style (fast attack + exponential decay) so
 * `lengthSeconds` stays decoupled from how long the note actually rings:
 * notes are always staccato chiptune-flavoured, and the pattern's
 * `lengthTicks` field controls only spacing between events. This is the
 * "pikopiko" envelope we want for BGM-style techno / lo-fi material.
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
   * Play a pitched note as a pluck: short attack, exponential decay.
   * `lengthSeconds` is intentionally ignored for envelope shaping — Phase 1
   * targets pikopiko BGM, and held notes were the main source of harshness
   * in the previous ADSR voice. Patterns control spacing via `lengthTicks`,
   * not held duration.
   */
  playNote(
    time: number,
    midi: number,
    _lengthSeconds: number,
    velocity: number,
    voice: VoiceId,
    gain: number,
  ): void {
    const t = Math.max(time, this.ctx.currentTime);
    const freq = 440 * 2 ** ((midi - 69) / 12);
    const osc = this.ctx.createOscillator();
    // Triangle gives the melody a softer "chip" timbre; square keeps the
    // bass punchy enough to sit under a four-on-the-floor kick.
    osc.type = voice === "bass" ? "square" : "triangle";
    osc.frequency.value = freq;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = voice === "bass" ? 700 : 2200;
    filter.Q.value = voice === "bass" ? 3 : 0.7;

    const env = this.ctx.createGain();
    const peak = Math.max(gain * velocity, 0.0001);
    const attack = 0.004;
    // Pluck decay: bass slightly longer so it sustains under the kick.
    const decay = voice === "bass" ? 0.18 : 0.13;
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
