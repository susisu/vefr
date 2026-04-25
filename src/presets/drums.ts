import {
  TICKS_PER_BEAT,
  type DrumHit,
  type Pattern,
  type PatternEvent,
} from "../engine/types.js";
import type { DrumPreset } from "./types.js";

/** Phrase length used by every preset variant: 2 musical bars in 4/4 = 32 sixteenths. */
const PHRASE = 8 * TICKS_PER_BEAT;
/** One musical beat in ticks. */
const BEAT = TICKS_PER_BEAT;
/** One eighth-note in ticks. */
const EIGHTH = TICKS_PER_BEAT / 2;
/** One sixteenth-note in ticks (the editor's step granularity). */
const SIXTEENTH = TICKS_PER_BEAT / 4;

/** Build a kick-on-every-beat pattern over `count` beats. */
function kicksOnBeats(count: number, velocity = 1): Array<PatternEvent<DrumHit>> {
  return Array.from(
    { length: count },
    (_, i): PatternEvent<DrumHit> => ({
      tick: i * BEAT,
      payload: { pad: "kick", velocity },
    }),
  );
}

/** Build off-beat hat hits (the "& of every beat") over `count` beats. */
function hatsOffbeat(
  count: number,
  pad: "closed-hat" | "open-hat",
  velocity: number,
): Array<PatternEvent<DrumHit>> {
  return Array.from(
    { length: count },
    (_, i): PatternEvent<DrumHit> => ({
      tick: i * BEAT + EIGHTH,
      payload: { pad, velocity },
    }),
  );
}

/** Build a closed-hat pattern at sixteenth-note resolution with a velocity callback. */
function sixteenthClosedHats(
  steps: number,
  velocityAt: (i: number) => number,
): Array<PatternEvent<DrumHit>> {
  return Array.from(
    { length: steps },
    (_, i): PatternEvent<DrumHit> => ({
      tick: i * SIXTEENTH,
      payload: { pad: "closed-hat", velocity: velocityAt(i) },
    }),
  );
}

/** Sugar for a single drum hit at a specific tick. */
function hit(tick: number, pad: DrumHit["pad"], velocity = 1): PatternEvent<DrumHit> {
  return { tick, payload: { pad, velocity } };
}

/** Tech-house: kick on every beat, off-beat closed-hat "tss" between kicks. */
const drumTechnoOffbeat: Pattern<DrumHit> = {
  lengthTicks: PHRASE,
  events: [...kicksOnBeats(8), ...hatsOffbeat(8, "closed-hat", 0.6)],
};

/** Same skeleton with open-hats for the classic tech-house shimmer. */
const drumTechnoOpenHat: Pattern<DrumHit> = {
  lengthTicks: PHRASE,
  events: [...kicksOnBeats(8), ...hatsOffbeat(8, "open-hat", 0.5)],
};

/** Driving techno: kick + claps on the backbeat + relentless 16th closed-hats. */
const drumTechnoDriving: Pattern<DrumHit> = {
  lengthTicks: PHRASE,
  events: [
    ...kicksOnBeats(8),
    // Snare = clap on beats 2, 4, 6, 8 (zero-indexed 1, 3, 5, 7).
    hit(BEAT, "snare", 0.85),
    hit(3 * BEAT, "snare", 0.85),
    hit(5 * BEAT, "snare", 0.85),
    hit(7 * BEAT, "snare", 0.85),
    ...sixteenthClosedHats(32, (i) => (i % 4 === 0 ? 0.5 : i % 2 === 0 ? 0.4 : 0.3)),
  ],
};

/**
 * Boom-bap lo-fi: kick on 1 + ghost kick on the "& of 2.5", snare on 2 and 4,
 * eighth-note hats throughout. Bar 2 mirrors the figure with the ghost moved
 * to the second half so the loop doesn't feel mechanical.
 */
const drumLofiBoomBap: Pattern<DrumHit> = {
  lengthTicks: PHRASE,
  events: [
    // Bar 1
    hit(0, "kick", 1),
    hit(7 * SIXTEENTH, "kick", 0.7),
    hit(BEAT, "snare", 0.85),
    hit(3 * BEAT, "snare", 0.85),
    // Bar 2 — ghost moves into the second half
    hit(4 * BEAT, "kick", 1),
    hit(4 * BEAT + 11 * SIXTEENTH, "kick", 0.7),
    hit(5 * BEAT, "snare", 0.85),
    hit(7 * BEAT, "snare", 0.85),
    // 8th note closed hats with a slight backbeat lilt.
    ...Array.from(
      { length: 16 },
      (_, i): PatternEvent<DrumHit> => ({
        tick: i * EIGHTH,
        payload: { pad: "closed-hat", velocity: i % 2 === 0 ? 0.45 : 0.55 },
      }),
    ),
  ],
};

/** Half-time lo-fi: sparse, with snare on the "3" of each bar and off-beat hats. */
const drumLofiHalfTime: Pattern<DrumHit> = {
  lengthTicks: PHRASE,
  events: [
    hit(0, "kick", 1),
    hit(2 * BEAT, "snare", 0.85),
    hit(4 * BEAT, "kick", 1),
    hit(6 * BEAT, "snare", 0.85),
    ...hatsOffbeat(8, "closed-hat", 0.45),
  ],
};

/** Minimal lo-fi: just kicks + snares with a couple of ghost kicks for a dub feel. */
const drumLofiMinimal: Pattern<DrumHit> = {
  lengthTicks: PHRASE,
  events: [
    hit(0, "kick", 1),
    hit(2 * BEAT, "snare", 0.85),
    hit(4 * BEAT, "kick", 1),
    hit(5 * BEAT, "kick", 0.55),
    hit(6 * BEAT, "snare", 0.85),
    hit(7 * BEAT + 2 * SIXTEENTH, "kick", 0.6),
  ],
};

/**
 * Driving break: kick 1, snare 2, syncopated kick on the "& of 3", snare 4 —
 * the canonical breakbeat skeleton, with a small double-kick fill in bar 2.
 */
const drumBreakDriving: Pattern<DrumHit> = {
  lengthTicks: PHRASE,
  events: [
    hit(0, "kick", 1),
    hit(BEAT, "snare", 0.9),
    hit(2 * BEAT + SIXTEENTH, "kick", 0.8),
    hit(3 * BEAT, "snare", 0.9),
    hit(4 * BEAT, "kick", 1),
    hit(5 * BEAT, "snare", 0.9),
    hit(6 * BEAT, "kick", 0.85),
    hit(6 * BEAT + 2 * SIXTEENTH, "kick", 0.7),
    hit(7 * BEAT, "snare", 0.9),
    ...sixteenthClosedHats(32, (i) => (i % 4 === 0 ? 0.55 : i % 2 === 0 ? 0.4 : 0.3)),
  ],
};

/** Half-time break: spacious feel, syncopated kick stab at the very end of each bar. */
const drumBreakHalfTime: Pattern<DrumHit> = {
  lengthTicks: PHRASE,
  events: [
    hit(0, "kick", 1),
    hit(2 * BEAT, "snare", 0.9),
    hit(3 * BEAT + 2 * SIXTEENTH, "kick", 0.7),
    hit(4 * BEAT, "kick", 1),
    hit(6 * BEAT, "snare", 0.9),
    hit(7 * BEAT + 2 * SIXTEENTH, "kick", 0.7),
    ...Array.from(
      { length: 16 },
      (_, i): PatternEvent<DrumHit> => ({
        tick: i * EIGHTH,
        payload: { pad: "closed-hat", velocity: 0.4 },
      }),
    ),
  ],
};

/** Built-in drum presets — techno + lo-fi + breakbeat flavours. */
export const drumPresets: readonly DrumPreset[] = [
  {
    id: "drum.techno.four",
    kind: "drum",
    name: "Techno Four",
    variants: [drumTechnoOffbeat, drumTechnoOpenHat, drumTechnoDriving],
  },
  {
    id: "drum.lofi.boom-bap",
    kind: "drum",
    name: "Lo-fi Boom Bap",
    variants: [drumLofiBoomBap, drumLofiHalfTime, drumLofiMinimal],
  },
  {
    id: "drum.break",
    kind: "drum",
    name: "Breakbeat",
    variants: [drumBreakDriving, drumBreakHalfTime],
  },
];
