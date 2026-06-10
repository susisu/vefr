import * as v from "valibot";
import { DRUM_KIT_IDS, INSTRUMENT_IDS } from "../domain/instrument.js";
import { KEY_MAX, KEY_MIN, SCALE_IDS } from "../domain/music.js";
import type { DrumHit, Note, Pattern } from "../domain/pattern.js";
import {
  PITCHED_OCTAVE_MAX,
  PITCHED_OCTAVE_MIN,
  TRACK_COLOR_IDS,
  type Track,
} from "../domain/track.js";

// valibot schemas describing the persisted project shape. Kept separate from
// the parse pipeline (`project.ts`) so the wire protocol layer can reuse the
// leaf schemas without dragging in the parser or the phrase catalog.

/** A positive integer. */
export const PositiveInteger = v.pipe(v.number(), v.integer(), v.minValue(1));
/** A non-negative integer (used for ticks, period loops, etc.). */
export const NonNegativeInteger = v.pipe(v.number(), v.integer(), v.minValue(0));
/** Velocity / volume / etc. — a normalized 0..1. */
export const NormalizedNumber = v.pipe(v.number(), v.minValue(0), v.maxValue(1));

/** Engine-recognised scale ids; mirrors `SCALE_IDS` from the domain. */
export const ScaleIdSchema = v.picklist(SCALE_IDS);

/** Engine-recognised drum pads. */
export const DrumPadSchema = v.picklist(["kick", "snare", "closed-hat", "open-hat"]);

/** Pitched-track role: melody or bass. */
export const PitchedRoleSchema = v.picklist(["melody", "bass"]);

/** Built-in instrument id picklist; mirrors `INSTRUMENT_IDS` from the domain. */
export const InstrumentIdSchema = v.picklist(INSTRUMENT_IDS);

/** Built-in drum-kit id picklist; mirrors `DRUM_KIT_IDS` from the domain. */
export const DrumKitIdSchema = v.picklist(DRUM_KIT_IDS);

/** Per-track decorative LED color id; mirrors `TRACK_COLOR_IDS` from the domain. */
export const TrackColorIdSchema = v.picklist(TRACK_COLOR_IDS);

/**
 * Per-track octave offset accepted by pitched tracks. Whole octaves,
 * inclusive `[PITCHED_OCTAVE_MIN, PITCHED_OCTAVE_MAX]` (currently -3..+3).
 */
export const PitchedOctaveSchema = v.pipe(
  v.number(),
  v.integer(),
  v.minValue(PITCHED_OCTAVE_MIN),
  v.maxValue(PITCHED_OCTAVE_MAX),
);

/** Schema for {@link DrumHit} payloads. */
export const DrumHitSchema = v.object({
  pad: DrumPadSchema,
  velocity: NormalizedNumber,
});

/** Schema for {@link Note} payloads. */
export const NoteSchema = v.object({
  degree: v.pipe(v.number(), v.integer()),
  octave: v.pipe(v.number(), v.integer()),
  velocity: NormalizedNumber,
  lengthTicks: PositiveInteger,
});

/**
 * Build a {@link Pattern} schema parameterised over the payload shape.
 * Each event's `tick` is constrained to `[0, lengthTicks)`.
 */
export function patternSchema<P>(payload: v.GenericSchema<P>): v.GenericSchema<Pattern<P>> {
  const eventSchema = v.object({
    tick: NonNegativeInteger,
    payload,
  });
  return v.pipe(
    v.object({
      lengthTicks: PositiveInteger,
      events: v.array(eventSchema),
    }),
    v.check(
      (p): boolean => p.events.every((e) => e.tick < p.lengthTicks),
      "every event tick must be less than lengthTicks",
    ),
  );
}

/** Schema for {@link AutoParams}. Periods of 0 mean "infinity" (slot frozen at 0). */
export const AutoParamsSchema = v.object({
  microPeriodLoops: NonNegativeInteger,
  macroPeriodLoops: NonNegativeInteger,
});

/** Fields shared by every track. */
const TrackBaseShape = {
  id: v.string(),
  name: v.string(),
  mute: v.boolean(),
  volume: NormalizedNumber,
  color: TrackColorIdSchema,
};

/** Track-base + auto-body fields, pre-merged so leaf schemas only spread once. */
const AutoTrackBaseShape = {
  ...TrackBaseShape,
  source: v.literal("auto"),
  phraseIds: v.array(v.string()),
  seed: v.pipe(v.number(), v.integer()),
  params: AutoParamsSchema,
};

/** Manual drum track. */
export const DrumManualSchema = v.object({
  ...TrackBaseShape,
  kind: v.literal("drum"),
  kitId: DrumKitIdSchema,
  mutedPads: v.array(DrumPadSchema),
  source: v.literal("manual"),
  pattern: patternSchema<DrumHit>(DrumHitSchema),
});

/** Auto drum track. */
export const DrumAutoSchema = v.object({
  ...AutoTrackBaseShape,
  kind: v.literal("drum"),
  kitId: DrumKitIdSchema,
  mutedPads: v.array(DrumPadSchema),
});

/** Manual pitched track. */
export const PitchedManualSchema = v.object({
  ...TrackBaseShape,
  kind: v.literal("pitched"),
  role: PitchedRoleSchema,
  instrumentId: InstrumentIdSchema,
  octave: PitchedOctaveSchema,
  source: v.literal("manual"),
  pattern: patternSchema<Note>(NoteSchema),
});

/** Auto pitched track. */
export const PitchedAutoSchema = v.object({
  ...AutoTrackBaseShape,
  kind: v.literal("pitched"),
  role: PitchedRoleSchema,
  instrumentId: InstrumentIdSchema,
  octave: PitchedOctaveSchema,
});

/** Top-level track schema, flat union of the four leaf shapes. */
export const TrackSchema: v.GenericSchema<Track> = v.union([
  DrumManualSchema,
  DrumAutoSchema,
  PitchedManualSchema,
  PitchedAutoSchema,
]);

/** Schema for the saved timing config (tempo). */
export const TimingSchema = v.object({
  bpm: v.pipe(v.number(), v.minValue(1)),
});

/** Schema for the saved tonality (key + scale). */
export const TonalitySchema = v.object({
  key: v.pipe(v.number(), v.integer(), v.minValue(KEY_MIN), v.maxValue(KEY_MAX)),
  scale: ScaleIdSchema,
});

/** Schema for the saved mix settings (master output gain). */
export const MixSchema = v.object({
  masterVolume: NormalizedNumber,
});

/** Schema for the v1 project body (everything below `schemaVersion`). */
export const ProjectV1BodySchema = v.object({
  timing: TimingSchema,
  tonality: TonalitySchema,
  mix: MixSchema,
  tracks: v.array(TrackSchema),
  globalSeed: v.optional(v.pipe(v.number(), v.integer())),
});
