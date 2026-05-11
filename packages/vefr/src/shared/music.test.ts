import { describe, expect, it } from "vitest";
import { degreeToMidi, intervalsOf, keyLabel, keyName, midiToFrequency } from "./music.js";

describe("intervalsOf", () => {
  it("returns 7 intervals for diatonic scales", () => {
    expect(intervalsOf("major")).toHaveLength(7);
    expect(intervalsOf("minor")).toHaveLength(7);
    expect(intervalsOf("dorian")).toHaveLength(7);
    expect(intervalsOf("mixolydian")).toHaveLength(7);
  });

  it("returns 5 intervals for pentatonic scales", () => {
    expect(intervalsOf("minor-pentatonic")).toHaveLength(5);
    expect(intervalsOf("major-pentatonic")).toHaveLength(5);
  });
});

describe("degreeToMidi", () => {
  it("returns C4 for degree 0 / octave 0 / C major", () => {
    expect(degreeToMidi({ key: 0, scale: "major" }, 0, 0)).toBe(60);
  });

  it("returns the major scale notes for degrees 0..6 in C major", () => {
    const ms = ({ scale = "major" as const, key = 0 } = {}): number[] =>
      [0, 1, 2, 3, 4, 5, 6].map((d) => degreeToMidi({ key, scale }, d, 0));
    expect(ms()).toEqual([60, 62, 64, 65, 67, 69, 71]);
  });

  it("wraps degree across the next octave at the end of the scale", () => {
    expect(degreeToMidi({ key: 0, scale: "major" }, 7, 0)).toBe(72);
  });

  it("wraps negative degrees into earlier octaves", () => {
    expect(degreeToMidi({ key: 0, scale: "major" }, -1, 0)).toBe(59);
  });

  it("respects the key transposition", () => {
    expect(degreeToMidi({ key: 7, scale: "major" }, 0, 0)).toBe(67); // G4
  });

  it("transposes down for a negative key", () => {
    expect(degreeToMidi({ key: -1, scale: "major" }, 0, 0)).toBe(59); // B3
    expect(degreeToMidi({ key: -11, scale: "major" }, 0, 0)).toBe(49); // C#3
  });

  it("uses pentatonic intervals for pentatonic scales", () => {
    const seq = [0, 1, 2, 3, 4].map((d) =>
      degreeToMidi({ key: 0, scale: "minor-pentatonic" }, d, 0),
    );
    expect(seq).toEqual([60, 63, 65, 67, 70]);
  });
});

describe("midiToFrequency", () => {
  it("returns 440 Hz for A4 (MIDI 69)", () => {
    expect(midiToFrequency(69)).toBeCloseTo(440, 5);
  });

  it("doubles per octave", () => {
    expect(midiToFrequency(81) / midiToFrequency(69)).toBeCloseTo(2, 5);
  });
});

describe("keyName", () => {
  it("labels C through B", () => {
    expect(keyName(0)).toBe("C");
    expect(keyName(7)).toBe("G");
    expect(keyName(11)).toBe("B");
  });
});

describe("keyLabel", () => {
  it("returns the bare pitch class for non-negative keys", () => {
    expect(keyLabel(0)).toBe("C");
    expect(keyLabel(11)).toBe("B");
  });

  it("prefixes ↓ for negative keys", () => {
    expect(keyLabel(-1)).toBe("↓B");
    expect(keyLabel(-11)).toBe("↓C#");
  });
});
