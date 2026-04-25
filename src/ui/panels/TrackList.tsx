import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FocusEvent,
  type KeyboardEvent,
  type ReactElement,
} from "react";
import { refById, type PitchedRole, type Track } from "../../engine/types.js";
import { Chip, Knob, LED, Panel } from "../components/index.js";
import { useControlApi } from "../context.js";
import { useTracks } from "../hooks.js";
import { trackTone } from "../trackTone.js";
import { buildNewTrackInput, type TrackKindChoice } from "./trackFactory.js";

/** Vertical list of tracks with per-track controls and drag-to-reorder. */
export function TrackList(): ReactElement {
  const api = useControlApi();
  const tracks = useTracks();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  /** Resolve dnd-kit's ids back to track positions and forward to the engine. */
  const onDragEnd = (e: DragEndEvent): void => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const toIndex = tracks.findIndex((t) => t.id === over.id);
    if (toIndex < 0) return;
    api.track.move(refById(String(active.id)), toIndex);
  };

  const ids = tracks.map((t) => t.id);
  return (
    <Panel title="Tracks" meta={<>{tracks.length} CH</>}>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <ul className="track-list">
            {tracks.map((track) => (
              <SortableTrackRow key={track.id} track={track} />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
      <AddTrackRow />
    </Panel>
  );
}

/** A single sortable track row. Wraps {@link TrackRowBody} with dnd-kit wiring. */
function SortableTrackRow({ track }: { track: Track }): ReactElement {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: track.id,
  });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : undefined,
  };
  return (
    <li ref={setNodeRef} style={style} className="track-row">
      <button
        type="button"
        className="drag-handle"
        aria-label={`Drag ${track.name}`}
        {...attributes}
        {...listeners}
      >
        ⋮⋮
      </button>
      <TrackRowBody track={track} />
    </li>
  );
}

/** Mute / volume / rename / delete controls. Sortable wrapper supplies the `<li>`. */
function TrackRowBody({ track }: { track: Track }): ReactElement {
  const api = useControlApi();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const tone = trackTone(track);

  /** Apply a mute toggle through the ControlApi. */
  const onMuteToggle = (): void => {
    api.track.update(refById(track.id), { mute: !track.mute });
  };

  /** Apply a volume change from the inline knob. */
  const onVolumeChange = (volume: number): void => {
    if (Number.isFinite(volume)) {
      api.track.update(refById(track.id), { volume });
    }
  };

  /** Two-step delete: first click arms; second confirms. Avoids accidental loss. */
  const onDeleteClick = (): void => {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    api.track.remove(refById(track.id));
  };

  /** Cancel an armed delete (escape hatch when the user changes their mind). */
  const onCancelDelete = (): void => {
    setConfirmingDelete(false);
  };

  const kindLabel = track.kind === "drum" ? "DRUM" : track.role.toUpperCase();
  const sourceLabel = track.source.toUpperCase();

  return (
    <>
      <RenameField track={track} />
      <span className="track-kind">
        <Chip tone={tone} width={72}>
          {kindLabel}
        </Chip>{" "}
        <Chip width={72}>{sourceLabel}</Chip>
      </span>
      <button
        type="button"
        className={`track-mute ${track.mute ? "is-muted" : ""}`}
        onClick={onMuteToggle}
        aria-label={track.mute ? `Unmute ${track.name}` : `Mute ${track.name}`}
        title={track.mute ? "Unmute" : "Mute"}
      >
        <LED on={!track.mute} tone={tone} /> {track.mute ? "MUTE" : "ON"}
      </button>
      <Knob
        label="VOL"
        value={track.volume}
        min={0}
        max={1}
        step={0.01}
        onChange={onVolumeChange}
        format={(v) =>
          Math.round(v * 100)
            .toString()
            .padStart(3, " ")
        }
        size={30}
        tone={tone}
      />
      {confirmingDelete ?
        <span className="track-delete-confirm">
          <button type="button" className="danger" onClick={onDeleteClick}>
            Confirm
          </button>
          <button type="button" onClick={onCancelDelete}>
            Cancel
          </button>
        </span>
      : <button
          type="button"
          className="track-delete"
          aria-label={`Delete ${track.name}`}
          onClick={onDeleteClick}
        >
          ✕
        </button>
      }
    </>
  );
}

/**
 * Inline rename input. Keeps a local string while editing so per-keystroke
 * engine updates don't have to round-trip; commits on blur or Enter. On a
 * name conflict the engine rejects the patch and we revert the field.
 */
function RenameField({ track }: { track: Track }): ReactElement {
  const api = useControlApi();
  const [value, setValue] = useState(track.name);
  const [error, setError] = useState<string | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Sync the local mirror back to engine truth whenever `track.name` changes
  // from a non-edit path (project import, autosave restore). Skip while the
  // user is actively typing in this field — clobbering their input would
  // be hostile.
  useEffect(() => {
    if (document.activeElement === inputRef.current) return;
    setValue(track.name);
    setError(undefined);
  }, [track.name]);

  /** Push the local value to the engine; revert on conflict. */
  const commit = (): void => {
    if (value === track.name) {
      setError(undefined);
      return;
    }
    if (value.trim() === "") {
      setValue(track.name);
      setError(undefined);
      return;
    }
    const r = api.track.update(refById(track.id), { name: value });
    if (!r.ok) {
      if (r.error.code === "name-conflict") {
        setError(`name "${value}" is already in use`);
      }
      setValue(track.name);
    } else {
      setError(undefined);
    }
  };

  /** Local mirror update; engine update is deferred to commit. */
  const onChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setValue(e.target.value);
    setError(undefined);
  };

  /** Commit on blur. */
  const onBlur = (_e: FocusEvent<HTMLInputElement>): void => {
    commit();
  };

  /** Enter commits, Escape reverts. */
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    } else if (e.key === "Escape") {
      setValue(track.name);
      setError(undefined);
      e.currentTarget.blur();
    }
  };

  return (
    <span className="track-name-field">
      <input
        ref={inputRef}
        className="track-name-input"
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        aria-label={`Rename ${track.name}`}
      />
      {error !== undefined ?
        <span className="track-name-error">{error}</span>
      : null}
    </span>
  );
}

/** String-encoded selection key for the add-track dropdown. */
type ChoiceKey =
  | "drum-manual"
  | "drum-auto"
  | "melody-manual"
  | "melody-auto"
  | "bass-manual"
  | "bass-auto";

/** Dropdown options laid out in the order they're shown. */
const CHOICES: ReadonlyArray<{ key: ChoiceKey; label: string }> = [
  { key: "drum-manual", label: "Manual Drum" },
  { key: "drum-auto", label: "Auto Drum" },
  { key: "melody-manual", label: "Manual Melody" },
  { key: "melody-auto", label: "Auto Melody" },
  { key: "bass-manual", label: "Manual Bass" },
  { key: "bass-auto", label: "Auto Bass" },
];

/** Set form of {@link CHOICES} used to validate untrusted strings (`<select>` value). */
const CHOICE_KEYS: ReadonlySet<string> = new Set<string>(CHOICES.map((c) => c.key));

/** Type guard for the dropdown's reported `value`. */
function isChoiceKey(value: string): value is ChoiceKey {
  return CHOICE_KEYS.has(value);
}

/** Decode a {@link ChoiceKey} into the structured form the factory consumes. */
function decodeChoice(key: ChoiceKey): TrackKindChoice {
  switch (key) {
    case "drum-manual":
      return { kind: "drum", source: "manual" };
    case "drum-auto":
      return { kind: "drum", source: "auto" };
    case "melody-manual":
      return { kind: "pitched", role: "melody" satisfies PitchedRole, source: "manual" };
    case "melody-auto":
      return { kind: "pitched", role: "melody" satisfies PitchedRole, source: "auto" };
    case "bass-manual":
      return { kind: "pitched", role: "bass" satisfies PitchedRole, source: "manual" };
    case "bass-auto":
      return { kind: "pitched", role: "bass" satisfies PitchedRole, source: "auto" };
    default:
      key satisfies never;
      return { kind: "drum", source: "manual" };
  }
}

/** Footer row that adds a new track of the chosen kind/role/source. */
function AddTrackRow(): ReactElement {
  const api = useControlApi();
  const [choice, setChoice] = useState<ChoiceKey>("drum-manual");

  /** Build the input from the dropdown choice and forward to the API. */
  const onAdd = (): void => {
    api.track.add(buildNewTrackInput(api, decodeChoice(choice)));
  };

  return (
    <div className="track-add-row">
      <select
        value={choice}
        onChange={(e) => {
          if (isChoiceKey(e.target.value)) setChoice(e.target.value);
        }}
        aria-label="New track type"
      >
        {CHOICES.map((c) => (
          <option key={c.key} value={c.key}>
            {c.label}
          </option>
        ))}
      </select>
      <button type="button" onClick={onAdd}>
        + Add Track
      </button>
    </div>
  );
}
