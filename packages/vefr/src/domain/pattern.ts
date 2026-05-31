import type { Tick } from "./timing.js";

/** Built-in drum voices addressable by name. */
export type DrumPad = "kick" | "snare" | "closed-hat" | "open-hat";

/** Trigger event for a drum pad with a 0..1 velocity. */
export type DrumHit = {
  pad: DrumPad;
  velocity: number;
};

/**
 * Pitched event held in a {@link Pattern}.
 * `degree` is the scale degree (0-based), resolved against the global key /
 * scale at sound time. Allows transposition without rewriting patterns.
 */
export type Note = {
  degree: number;
  octave: number;
  velocity: number;
  lengthTicks: Tick;
};

/** A timed event inside a pattern. */
export type PatternEvent<T> = {
  tick: Tick;
  payload: T;
};

/**
 * A loopable pattern. The engine wraps `tick` modulo {@link Pattern.lengthTicks}
 * when scheduling, so a 4-beat pattern repeats every 4 beats.
 */
export type Pattern<T> = {
  lengthTicks: Tick;
  events: ReadonlyArray<PatternEvent<T>>;
};
