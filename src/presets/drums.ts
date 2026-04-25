import {
  TICKS_PER_BEAT,
  type DrumHit,
  type Pattern,
  type PatternEvent,
} from "../engine/types.js";
import type { DrumPreset } from "./types.js";

/** One bar of 4/4 in ticks. */
const BAR = 4 * TICKS_PER_BEAT;
/** One eighth-note in ticks. */
const EIGHTH = TICKS_PER_BEAT / 2;
/** One sixteenth-note in ticks. */
const SIXTEENTH = TICKS_PER_BEAT / 4;

/** Classic four-on-the-floor kick pattern across one bar of 4/4. */
export const drumFourOnTheFloor: Pattern<DrumHit> = {
  lengthTicks: BAR,
  events: [0, 1, 2, 3].map((beat) => ({
    tick: beat * TICKS_PER_BEAT,
    payload: { pad: "kick", velocity: 1 },
  })),
};

/** Same kicks but with a snare on beats 2 and 4 — the rock backbeat. */
const drumBackbeat: Pattern<DrumHit> = {
  lengthTicks: BAR,
  events: [
    { tick: 0, payload: { pad: "kick", velocity: 1 } },
    { tick: TICKS_PER_BEAT, payload: { pad: "snare", velocity: 0.9 } },
    { tick: 2 * TICKS_PER_BEAT, payload: { pad: "kick", velocity: 1 } },
    { tick: 3 * TICKS_PER_BEAT, payload: { pad: "snare", velocity: 0.9 } },
  ],
};

/** Off-beat hi-hats over a kick on every beat. */
const drumHatRoll: Pattern<DrumHit> = {
  lengthTicks: BAR,
  events: [
    { tick: 0, payload: { pad: "kick", velocity: 1 } },
    { tick: 2 * TICKS_PER_BEAT, payload: { pad: "kick", velocity: 1 } },
    ...Array.from(
      { length: 8 },
      (_, i): PatternEvent<DrumHit> => ({
        tick: i * EIGHTH + EIGHTH,
        payload: { pad: "closed-hat", velocity: 0.7 },
      }),
    ),
  ],
};

/** Half-time feel: kicks on 1, snare on 3, sixteenth-note hats throughout. */
const drumHalfTime: Pattern<DrumHit> = {
  lengthTicks: BAR,
  events: [
    { tick: 0, payload: { pad: "kick", velocity: 1 } },
    { tick: 2 * TICKS_PER_BEAT, payload: { pad: "snare", velocity: 0.9 } },
    ...Array.from(
      { length: 16 },
      (_, i): PatternEvent<DrumHit> => ({
        tick: i * SIXTEENTH,
        payload: { pad: "closed-hat", velocity: 0.5 },
      }),
    ),
  ],
};

/** Built-in drum presets. The generator's mid tier rotates within each preset. */
export const drumPresets: readonly DrumPreset[] = [
  {
    id: "drum.basic.four-on-the-floor",
    kind: "drum",
    name: "Four on the Floor",
    variants: [drumFourOnTheFloor, drumBackbeat],
  },
  {
    id: "drum.basic.hat-driven",
    kind: "drum",
    name: "Hat Driven",
    variants: [drumHatRoll, drumHalfTime],
  },
];
