# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

vefr is a browser-based sequencer that layers manual and auto-composing tracks. It is built to run as a static bundle (no server required) and to be controllable entirely through a typed Control API so the UI is replaceable and external clients can drive it later.

## Commands

Package manager is **pnpm** (see `pnpm-workspace.yaml`). Do not use `npm run`.

- `pnpm dev` — Vite dev server.
- `pnpm build` — production static build.
- `pnpm typecheck` — `tsc --noEmit`.
- `pnpm lint` / `pnpm lint:check` — ESLint (the first form auto-fixes).
- `pnpm format` / `pnpm format:check` — Prettier.
- `pnpm test` — Vitest single-run.
- `pnpm test:dev` — Vitest watch mode.
- Single test file: `pnpm test src/engine/engine.test.ts`. Single test by name: `pnpm test -t "scheduler advances"`.

Clean up ESLint warnings, not just errors. Use `eslint-disable` only at unavoidable `any`/`as` boundaries and always with an `-- explanation` comment.

## Architecture

Layered, with a strict dependency direction enforced by code review and (for the UI) by ESLint:

```
ui ──► api ──► engine ◄── auto
                  ▲
                  │
                sound  (engine pushes events into a SoundOutput port)
```

- **`src/engine/`** — pure timing + state core. `Engine` owns transport, global music state, the track list, and the dispatch loop. `Scheduler` look-aheads ~100 ms via `setTimeout` and converts `Tick`s to `AudioContext.currentTime` seconds; `Clock` wraps the audio clock so tests can swap in a fake. `sound-port.ts` is the interface the engine pushes events into — engine never touches WebAudio directly. Time grid is `TICKS_PER_BEAT = 96` (PPQN 96).
- **`src/auto/`** — pure functions that take `(seed, bar, params, phraseTemplates)` and return a bar of events. The variation model collapses to two periods: `microPeriodBars` (per-event drop / walk / ghost dice re-roll) and `macroPeriodBars` (template rotation slot). `0` means "infinity" (lock). Variation strengths are constants in `generator.ts`, not user-tunable.
- **`src/sound/`** — `SoundOutput` implementations. `webaudio.ts` is the production sink (Oscillator + ADSR for pitched, noise-based drums); `mock.ts` is for tests. Engine uses only the port, so swapping in Web MIDI later is an additional adapter, not a refactor.
- **`src/api/`** — the **Control API**. `types.ts` is the public façade (`ControlApi` + sub-APIs `transport`, `global`, `track`, `project`). `inprocess.ts` is the in-runtime implementation backed directly by an `Engine`. `project.ts` is the JSON snapshot/parse layer (`schemaVersion` + valibot schema; reject incompatible versions instead of silently coercing). `storage.ts` handles IndexedDB autosave.
- **`src/ui/`** — React 19 + Vite. Talks to the engine **only** through `ControlApi`. Importing from `engine/engine`, `engine/scheduler`, `engine/clock`, `engine/sound-port`, `auto/**`, `sound/**`, or `api/inprocess*` from under `src/ui/` is blocked by `no-restricted-imports` in `eslint.config.js`. Type-only imports from `src/engine/types` and `src/api/types` are allowed. State subscription uses `useSyncExternalStore` against the API's `onChange` handlers.
- **`src/phrases/`** — built-in phrase library (drums / melody / bass), grouped by genre. `index.ts` indexes them by `PhraseId` and exposes `getPhrase` (resolver passed into the engine) + `phraseExists` (used by the project parser to validate references). Phrases are authored at 32 sixteenth-step / 2-bar resolution.
- **`src/shared/`** — `music.ts` (scale tables, `degreeToMidi`), `rng.ts` (deterministic `mulberry32` + `hashSeeds`), `signal.ts` (tiny pub/sub).

### Data model invariants worth keeping in mind

- `Note.degree` is a **scale degree** (0-based, can be negative or exceed scale length — wraps with octave). It is resolved to MIDI at sound time using the global `key` + `scale`. Patterns therefore transpose for free; never bake absolute pitches into a pattern.
- `Track` is a discriminated union over `kind` ("drum" | "pitched") **and** `source` ("manual" | "auto"). Use `DistributiveOmit` (see `engine.ts`) when stripping fields off `Track`; the built-in `Omit` collapses the union and drops variant-specific fields like `pattern` / `phraseIds`.
- Tracks have both an opaque `id` and a unique human-readable `name`. Ref them via `TrackRef` (`refById` / `refByName`) — uniqueness of names is engine-enforced.
- Auto tracks must be reproducible from `(seed, bar, params, phraseIds)` alone. Don't keep "live" auto state outside the seed; that's why `seed` is a saved field of the `Project`.
- `Project` JSON carries `schemaVersion` (`CURRENT_SCHEMA_VERSION` in `api/project.ts`). When you change the persisted shape, bump the version and add a migration — don't silently coerce.

## Coding conventions specific to this repo

- **JSDoc on every exported function, variable, and class.** This project overrides the global "no comments by default" preference. One-line is fine; explain *why* when the contract isn't obvious from the signature.
- TypeScript is `strict` + `exactOptionalPropertyTypes` + `noUncheckedIndexedAccess` + `noPropertyAccessFromIndexSignature` + `verbatimModuleSyntax`. Practical consequences:
  - Imports between `.ts`/`.tsx` files use the `.js` extension (NodeNext + verbatim module syntax).
  - Use `import type { ... }` for type-only imports.
  - Indexing into arrays/records yields `T | undefined` — handle the `undefined` case.
- Errors that callers can recover from go through `Result<T, E>` (see `api/types.ts`). Genuinely exceptional conditions still `throw`.
- Prettier: print width 100, double quotes, trailing commas, `experimentalTernaries` + `experimentalOperatorPosition: "start"`. Run `pnpm format` rather than hand-formatting.

## Testing

- Vitest, run via `pnpm test`. Coverage is **not** the target — tests act as executable specs for the engine/auto/api layers.
- Inject the deterministic bits at boundaries: pass a fake `Clock`, fixed `seed`, and the `mock.ts` `SoundOutput` to observe "what was played when". Avoid mocking inside the layer being tested.
- The UI is intentionally untested for now; revisit when the UI shape stabilizes.

## Browser-only verification

Audio playback, IndexedDB autosave, and any drag/drop UI cannot be verified headlessly. After making changes that touch those areas, ask the user to run `pnpm dev` and verify in the browser rather than claiming the change is done.
