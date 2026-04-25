import { TICKS_PER_BEAT, type DrumHit, type Pattern, type PresetId } from "../engine/types.js";

/** Preset for an auto drum track: a name + variants over the same drum kit. */
export type DrumPreset = {
  id: PresetId;
  kind: "drum";
  name: string;
  variants: ReadonlyArray<Pattern<DrumHit>>;
};

/** Union of every preset shape recognised by the registry. */
export type Preset = DrumPreset;

/** Classic four-on-the-floor kick pattern across one bar of 4/4. */
export const drumFourOnTheFloor: Pattern<DrumHit> = {
  lengthTicks: 4 * TICKS_PER_BEAT,
  events: [
    { tick: 0, payload: { pad: "kick", velocity: 1 } },
    { tick: TICKS_PER_BEAT, payload: { pad: "kick", velocity: 1 } },
    { tick: 2 * TICKS_PER_BEAT, payload: { pad: "kick", velocity: 1 } },
    { tick: 3 * TICKS_PER_BEAT, payload: { pad: "kick", velocity: 1 } },
  ],
};

/** Built-in preset registry. M3 expands this; M1 ships a single drum preset. */
const builtinPresets: readonly Preset[] = [
  {
    id: "drum.basic.four-on-the-floor",
    kind: "drum",
    name: "Four on the Floor",
    variants: [drumFourOnTheFloor],
  },
];

/** Index lookup keyed by preset id. */
const presetsById = new Map(builtinPresets.map((p) => [p.id, p]));

/** Return every preset known to the engine. */
export function listPresets(): readonly Preset[] {
  return builtinPresets;
}

/** Look up a preset by id; undefined if unknown. */
export function getPreset(id: PresetId): Preset | undefined {
  return presetsById.get(id);
}
