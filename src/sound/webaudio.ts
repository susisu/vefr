import type { SoundOutput, VoiceId } from "../engine/sound-port.js";
import type { DrumHit } from "../engine/types.js";

/**
 * WebAudio implementation of {@link SoundOutput}.
 * Drum voices are synthesized from short noise bursts and a sine "kick";
 * pitched voices use an oscillator + lowpass + linear envelope (a small ADSR).
 * Reference: Apple "Sound Synthesis with the Web Audio API" overview, plus the
 * standard 808-style additive recipes used widely in WebAudio demos.
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
        this.synthHat(t, amp, 0.05);
        return;
      case "open-hat":
        this.synthHat(t, amp, 0.25);
        return;
      default:
        assertNever(hit.pad);
    }
  }

  /** Play a pitched note: oscillator → lowpass → envelope → master. */
  playNote(
    time: number,
    midi: number,
    lengthSeconds: number,
    velocity: number,
    voice: VoiceId,
    gain: number,
  ): void {
    const t = Math.max(time, this.ctx.currentTime);
    const freq = 440 * 2 ** ((midi - 69) / 12);
    const osc = this.ctx.createOscillator();
    osc.type = voice === "bass" ? "square" : "sawtooth";
    osc.frequency.value = freq;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = voice === "bass" ? 800 : 2400;
    const env = this.ctx.createGain();
    const peak = gain * velocity;
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(peak, t + 0.01);
    env.gain.linearRampToValueAtTime(peak * 0.6, t + 0.05);
    env.gain.setValueAtTime(peak * 0.6, t + lengthSeconds);
    env.gain.linearRampToValueAtTime(0, t + lengthSeconds + 0.05);
    osc.connect(filter).connect(env).connect(this.master);
    osc.start(t);
    osc.stop(t + lengthSeconds + 0.1);
  }

  /** Sine wave with descending pitch envelope — a "808-style" kick. */
  private synthKick(t: number, amp: number): void {
    const osc = this.ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.15);
    const env = this.ctx.createGain();
    env.gain.setValueAtTime(amp, t);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    osc.connect(env).connect(this.master);
    osc.start(t);
    osc.stop(t + 0.35);
  }

  /** Highpassed noise burst — a thin snare. */
  private synthSnare(t: number, amp: number): void {
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.drumNoiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 1200;
    const env = this.ctx.createGain();
    env.gain.setValueAtTime(amp, t);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    noise.connect(filter).connect(env).connect(this.master);
    noise.start(t);
    noise.stop(t + 0.2);
  }

  /** Highpassed noise burst — short for closed hat, longer for open hat. */
  private synthHat(t: number, amp: number, length: number): void {
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.drumNoiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 6000;
    const env = this.ctx.createGain();
    env.gain.setValueAtTime(amp * 0.5, t);
    env.gain.exponentialRampToValueAtTime(0.0001, t + length);
    noise.connect(filter).connect(env).connect(this.master);
    noise.start(t);
    noise.stop(t + length + 0.05);
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
