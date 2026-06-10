/**
 * Preset genres used to organise the built-in catalogs (phrases, scale
 * groups). Purely an organisational axis — the engine attaches no semantics
 * to a genre; it only drives grouping in pickers and group-level selection.
 */
export type Genre = "techno" | "pop" | "disco" | "lofi" | "game" | "other";

/** Every {@link Genre} in canonical display order. */
export const GENRES: readonly Genre[] = ["techno", "pop", "disco", "lofi", "game", "other"];

/** Human-readable labels per genre, keyed for direct lookup. */
const GENRE_LABELS: Record<Genre, string> = {
  techno: "Techno",
  pop: "Pop",
  disco: "Disco",
  lofi: "Lo-fi",
  game: "Game",
  other: "Other",
};

/** Look up the human-readable label of a {@link Genre}. */
export function genreLabel(genre: Genre): string {
  return GENRE_LABELS[genre];
}
