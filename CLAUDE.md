# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

vefr is a browser-based sequencer that layers manual and auto-composing tracks. It is built to run as a static bundle (no server required) and to be controllable entirely through a typed Control API so the UI is replaceable and external clients can drive it later.

## Workspace layout

pnpm monorepo with two packages:

- `packages/vefr/` — the browser app (Engine, Control API, UI, phrases, sound). The static bundle lives here.
- `packages/vefr-relay/` — optional Node HTTP/WS relay. Any HTTP client that speaks the wire protocol (`POST /rpc`) can drive a running browser instance through it. Not required for normal local use.

The relay is opt-in: the browser only dials it when `VITE_RELAY_ENABLED=true` at build time. Default `pnpm build` produces a static bundle with the relay client tree-shaken out.

## Commands

Package manager is **pnpm** (workspace; see `pnpm-workspace.yaml`). Do not use `npm run`.

Root scripts dispatch to the workspace:

- `pnpm dev` — Vite dev server for the browser (= `pnpm --filter @susisu/vefr dev`).
- `pnpm build` — production builds for every package.
- `pnpm typecheck` — `tsc --noEmit` in every package.
- `pnpm test` — Vitest single-run in every package.
- `pnpm lint` / `pnpm lint:check` — ESLint at the workspace root (the first form auto-fixes).
- `pnpm format` / `pnpm format:check` — Prettier.

Per-package or single-file:

- `pnpm --filter @susisu/vefr-relay dev` — start the relay (tsx watch).
- `pnpm --filter @susisu/vefr-relay start` — start the relay without watch (production-style; runs via tsx so the cross-package TS source resolves).
- `pnpm --filter @susisu/vefr test:dev` — Vitest watch for the browser package.
- Single test file: `pnpm --filter @susisu/vefr test src/engine/engine.test.ts`.
- Single test by name: `pnpm --filter @susisu/vefr test -t "scheduler advances"`.

Clean up ESLint warnings, not just errors. Use `eslint-disable` only at unavoidable `any`/`as` boundaries and always with an `-- explanation` comment.

## Architecture

Layered, with a strict dependency direction enforced by code review **and** by ESLint (`no-restricted-imports` per layer in `eslint.config.js`). Each layer may depend only on layers below it. Paths below are relative to `packages/vefr/`.

```
ui ──► api ──► engine ──► domain   (domain = pure model + auto + phrases; bottom of the graph)
                  ▲
                  │
                sound  (adapter implementing the engine's SoundOutput port; reads domain too)
```

The single real boundary is **pure domain (no time, no IO) vs runtime**: `domain/` is timeless and side-effect-free; `engine/` drives it through time and pushes into a `SoundOutput` port. `auto/` and `phrases/` are _inside_ the domain — they are domain services / reference data, not a layer between domain and engine.

External-control overlay (optional, opt-in at build):

```
[any HTTP client] ──HTTP──► [vefr-relay] ──WS──► [browser]
                                                 relay-client.ts dispatches
                                                 into InProcessControlApi
```

- **`src/domain/`** — the pure domain model: types, constants, defaults and behaviour, organised by concept (no catch-all "types" module). Each module owns one concept and co-locates its type + logic:
  - `music.ts` (scale tables, keys, `ScaleId`, `Tonality` (key + scale), `degreeToMidi`), `instrument.ts` (instrument / drum-kit id catalog + `PitchedRole` + role defaults), `timing.ts` (`Tick`, `TICKS_PER_BEAT = 96` (PPQN 96), `BEATS_PER_BAR = 4` (meter is fixed at 4/4), `Timing` (tempo)), `pattern.ts` (`DrumPad` / `DrumHit` / `Note` / `Pattern`), `mix.ts` (`Mix` — global master output gain; the third global axis next to tonality/timing).
  - `track.ts` — the `Track` aggregate (discriminated over `kind` × `source`), `TrackRef` / `refById` / `refByName`, color + octave bounds, the API-facing contract types (`NewTrackInput`, `TrackPatch`, `AutoConfigPatch`) and `TrackError`. (`EngineInitial` / `PhraseLookup` are engine-construction seams and live in `engine/engine.ts`, not here.)
  - `phrase/` — built-in phrase library: `phrase.ts` (`Phrase` templates + `PhraseId` + `LOOP_STEPS`), the `drums`/`melody`/`bass` catalog (authored at 32 sixteenth-step / 2-bar resolution), and `registry.ts` (`getPhrase` resolver + `phraseExists` + `list*`).
  - `auto/` — domain service: `params.ts` (`AutoParams` + defaults + `defaultAutoParamsFor`) and `generator.ts` (the `(seed, loop, params, phraseTemplates)` → loop pure functions, co-located with their I/O types `DrumGeneratorInput` / `PitchedGeneratorInput` / `MaterializedPhrase`). Variation collapses to two loop-counted periods, `microPeriodLoops` (per-event drop / walk / ghost re-roll) and `macroPeriodLoops` (template rotation slot); `0` = infinity (lock); strengths are constants in `generator.ts`. One loop = `LOOP_BARS` musical bars (currently 2; defined in `engine/engine.ts`) — the only place `bar` enters the pipeline.
  - Internal DAG (acyclic): `music` / `instrument` / `timing` / `mix` are leaves; `pattern → timing`; `phrase → pattern, instrument`; `auto → pattern, phrase, timing` (+ `src/shared/rng`); `track → pattern, instrument, auto, phrase`.
- **`src/engine/`** — the runtime over the domain (transport). `Engine` owns transport, the track list, and the dispatch loop, and enforces track-name uniqueness. `Scheduler` look-aheads ~100 ms via `setTimeout` and converts `Tick`s to `AudioContext.currentTime` seconds; `Clock` wraps the audio clock so tests can swap in a fake. `sound-port.ts` is the `SoundOutput` interface the engine pushes events into (the instrument / kit id vocabulary it speaks lives in `domain/instrument`). Engine never touches WebAudio directly; the phrase catalog is injected as `resolvePhrase` so the runtime stays content-free.
- **`src/sound/`** — `SoundOutput` implementations (adapters). `webaudio.ts` is the production sink (Oscillator + ADSR for pitched, noise-based drums); `mock.ts` is for tests. Depends on `engine/sound-port` + `domain`, so swapping in Web MIDI later is an additional adapter, not a refactor.
- **`src/api/`** — the **Control API**.
  - `types.ts` is the public façade (`ControlApi` + sub-APIs `timing`, `tonality`, `mix`, `playback`, `track`, `project`). All methods are synchronous; recoverable errors go through `Result<T, E>`. Contract types come from `domain/track`, not the `Engine` class.
  - `inprocess.ts` is the in-runtime implementation backed directly by an `Engine`.
  - `schema.ts` holds the valibot schemas describing the persisted shape (shape only — no parser, no phrase catalog). Several leaf schemas (`TrackSchema`, `patternSchema`, `ScaleIdSchema`, etc.) are reused by the protocol layer.
  - `project.ts` is the JSON snapshot/parse layer (`schemaVersion`; reject incompatible versions instead of silently coercing). It validates phrase references against the built-in catalog directly (imports `phraseExists` from `domain/phrase/registry`).
  - `storage.ts` handles IndexedDB autosave.
  - `protocol.ts` defines the wire frames for the relay (HTTP `RpcRequest`, WS `req`/`res`) plus per-method valibot schemas (reusing `api/schema`). Re-exported from the package as `@susisu/vefr/protocol` so `vefr-relay` consumes the same types.
  - `relay-client.ts` is the browser-side WS dispatcher: receives a req batch, runs every op synchronously against `InProcessControlApi`, writes back a single res frame. The whole batch executes in one tick so the audio scheduler cannot fire mid-batch (`(key, scale, bpm)` updates land atomically).
- **`src/ui/`** — React 19 + Vite. Talks to the engine **only** through `ControlApi`. Importing from `engine/**` (runtime), `sound/**`, or `api/inprocess*` is blocked by `no-restricted-imports`. All of `domain/**` (model, catalogs, the pure auto generator, defaults) and `api/types` are allowed. State subscription uses `useSyncExternalStore` against the API's `onChange` handlers.
- **`src/shared/`** — domain-free utilities only: `rng.ts` (deterministic `mulberry32` + `hashSeeds`) and `signal.ts` (tiny pub/sub). Anything with musical meaning lives in `domain/`, not here.

### `packages/vefr-relay/`

- `src/index.ts` — process entry. Reads `VEFR_RELAY_PORT` (default 8787) and `VEFR_RELAY_HOST` (default `127.0.0.1`).
- `src/relay.ts` — stateless router. `POST /rpc` accepts `{ ops: [...] }`, forwards as a single WS req frame to the (single) attached browser, awaits the matching res frame, and returns the per-op results. HTTP error mapping: 400 (bad JSON / schema), 503 (no browser), 502 (timeout / mid-flight disconnect), 409 (second concurrent `/browser` upgrade).
- The relay binds to loopback only and ships **no authentication** — the trust boundary is "same machine". Adding auth or non-local bind would be a follow-up before exposing externally.
- Subscriptions / state push are intentionally not implemented (commands only). The plan if/when they're added: browser pushes `evt` frames to the relay; clients subscribe per channel; high-frequency channels (`playheadStep`, `activePhrase`) need rate-limiting.

### Data model invariants worth keeping in mind

- `Note.degree` is a **scale degree** (0-based, can be negative or exceed scale length — wraps with octave). It is resolved to MIDI at sound time using the global `key` + `scale`. Patterns therefore transpose for free; never bake absolute pitches into a pattern.
- `Track` is a discriminated union over `kind` ("drum" | "pitched") **and** `source` ("manual" | "auto"). Use `DistributiveOmit` (see `domain/track.ts`) when stripping fields off `Track`; the built-in `Omit` collapses the union and drops variant-specific fields like `pattern` / `phraseIds`.
- Tracks have both an opaque `id` and a unique human-readable `name`. Ref them via `TrackRef` (`refById` / `refByName`) — uniqueness of names is engine-enforced.
- Auto tracks must be reproducible from `(seed, loop, params, phraseIds)` alone. Don't keep "live" auto state outside the seed; that's why `seed` is a saved field of the `Project`.
- `Project` JSON carries `schemaVersion` (`CURRENT_SCHEMA_VERSION` in `api/project.ts`). When you change the persisted shape, bump the version and add a migration — don't silently coerce.
- The wire protocol carries its own `PROTOCOL_VERSION` (separate from `schemaVersion`). Any breaking frame change bumps that constant in `api/protocol.ts`.

## Coding conventions specific to this repo

- **JSDoc on every exported function, variable, and class.** This project overrides the global "no comments by default" preference. One-line is fine; explain _why_ when the contract isn't obvious from the signature.
- TypeScript is `strict` + `exactOptionalPropertyTypes` + `noUncheckedIndexedAccess` + `noPropertyAccessFromIndexSignature` + `verbatimModuleSyntax`. Practical consequences:
  - Imports between `.ts`/`.tsx` files use the `.js` extension (NodeNext + verbatim module syntax).
  - Use `import type { ... }` for type-only imports.
  - Indexing into arrays/records yields `T | undefined` — handle the `undefined` case.
  - For optional fields whose value is ever passed back into the API (e.g. `Partial<...>` patches), use valibot's `v.exactOptional` rather than `v.optional` so the parsed shape is `{ field?: T }` (not `{ field?: T | undefined }`) and lands in the API without an extra strip step.
- Errors that callers can recover from go through `Result<T, E>` (see `api/types.ts`). Genuinely exceptional conditions still `throw`.
- Prettier: print width 100, double quotes, trailing commas, `experimentalTernaries` + `experimentalOperatorPosition: "start"`. Run `pnpm format` rather than hand-formatting.

## Testing

- Vitest, run via `pnpm test`. Coverage is **not** the target — tests act as executable specs for the engine/auto/api/relay layers.
- Inject the deterministic bits at boundaries: pass a fake `Clock` (`engine/clock.ts` exports `TestClock`), fixed `seed`, and the `mock.ts` `RecordingSoundOutput` to observe "what was played when". Avoid mocking inside the layer being tested.
- Relay tests in `packages/vefr-relay/src/relay.test.ts` start a real HTTP+WS server on port `0` and dial it the same way an external client would — no internal mocks.
- The UI is intentionally untested for now; revisit when the UI shape stabilizes.

## Browser-only verification

Audio playback, IndexedDB autosave, drag/drop UI, **and the relay round-trip end-to-end** (UI updates from an external HTTP call) cannot be verified headlessly. After making changes that touch those areas, ask the user to run `pnpm dev` (and `pnpm --filter @susisu/vefr-relay dev` if the change involves the relay) and verify in the browser rather than claiming the change is done.
