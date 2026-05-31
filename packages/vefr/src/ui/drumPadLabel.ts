import type { DrumPad } from "../domain/pattern.js";

/**
 * Compact display label for each drum pad — short enough to fit on one
 * line in the editor's narrow pad column without wrapping. The engine's
 * literal `DrumPad` strings ("closed-hat", "open-hat") would otherwise
 * break across two lines and stretch the row taller than its neighbours.
 */
export function drumPadLabel(pad: DrumPad): string {
  switch (pad) {
    case "kick":
      return "kick";
    case "snare":
      return "snare";
    case "closed-hat":
      return "chh";
    case "open-hat":
      return "ohh";
    default:
      pad satisfies never;
      return pad;
  }
}
