import type { Project } from "./project.js";

/** Database name reserved for vefr's local storage. */
export const DB_NAME = "vefr";
/** IndexedDB schema version of the local store; bump when stores change. */
export const DB_VERSION = 1;
/** Object store that holds the most recent persisted project. */
export const STORE_PROJECTS = "projects";

/** Stable id used for the single autosave slot. */
export const AUTOSAVE_ID = "autosave";
/** Scratch id used by the atomic-swap autosave to land a write before promoting it. */
const PENDING_ID = "autosave.pending";

/** Open (or upgrade) the vefr IndexedDB database. */
export async function openDatabase(factory: IDBFactory = indexedDB): Promise<IDBDatabase> {
  return await new Promise((resolve, reject) => {
    const req = factory.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (): void => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
        db.createObjectStore(STORE_PROJECTS, { keyPath: "id" });
      }
    };
    req.onsuccess = (): void => {
      resolve(req.result);
    };
    req.onerror = (): void => {
      reject(req.error ?? new Error("open failed"));
    };
  });
}

/** Stored row layout. */
type StoredProjectRow = {
  id: string;
  project: Project;
  savedAt: number;
};

/** Read the autosave row, or undefined if there isn't one. */
export async function loadAutosave(db: IDBDatabase): Promise<Project | undefined> {
  return await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PROJECTS, "readonly");
    const store = tx.objectStore(STORE_PROJECTS);
    const req = store.get(AUTOSAVE_ID);
    req.onsuccess = (): void => {
      // eslint-disable-next-line @susisu/safe-typescript/no-type-assertion -- IDBRequest.result is typed `any`; rows are written exclusively by saveAutosave so the shape is enforced upstream.
      const row = req.result as StoredProjectRow | undefined;
      resolve(row?.project);
    };
    req.onerror = (): void => {
      reject(req.error ?? new Error("get failed"));
    };
  });
}

/**
 * Atomic-ish autosave: write the project to a pending slot, then promote it
 * to the canonical slot in a separate transaction. A crash mid-write leaves
 * the previous good autosave intact.
 */
export async function saveAutosave(db: IDBDatabase, project: Project): Promise<void> {
  await put(db, { id: PENDING_ID, project, savedAt: Date.now() });
  const pending = await get(db, PENDING_ID);
  if (!pending) throw new Error("pending row vanished mid-swap");
  await put(db, { id: AUTOSAVE_ID, project: pending.project, savedAt: pending.savedAt });
  await del(db, PENDING_ID);
}

/** Internal helper: put a row into STORE_PROJECTS. */
async function put(db: IDBDatabase, row: StoredProjectRow): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_PROJECTS, "readwrite");
    tx.objectStore(STORE_PROJECTS).put(row);
    tx.oncomplete = (): void => {
      resolve();
    };
    tx.onerror = (): void => {
      reject(tx.error ?? new Error("put failed"));
    };
  });
}

/** Internal helper: read a row from STORE_PROJECTS. */
async function get(db: IDBDatabase, id: string): Promise<StoredProjectRow | undefined> {
  return await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PROJECTS, "readonly");
    const req = tx.objectStore(STORE_PROJECTS).get(id);
    req.onsuccess = (): void => {
      // eslint-disable-next-line @susisu/safe-typescript/no-type-assertion -- IDBRequest.result is typed `any`; rows are written exclusively by saveAutosave so the shape is enforced upstream.
      resolve(req.result as StoredProjectRow | undefined);
    };
    req.onerror = (): void => {
      reject(req.error ?? new Error("get failed"));
    };
  });
}

/** Internal helper: delete a row from STORE_PROJECTS. */
async function del(db: IDBDatabase, id: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_PROJECTS, "readwrite");
    tx.objectStore(STORE_PROJECTS).delete(id);
    tx.oncomplete = (): void => {
      resolve();
    };
    tx.onerror = (): void => {
      reject(tx.error ?? new Error("delete failed"));
    };
  });
}

/** Whether `indexedDB` is usable in the current environment (e.g. some `file://` setups disable it). */
export function isIndexedDbAvailable(): boolean {
  try {
    return typeof indexedDB !== "undefined";
  } catch {
    return false;
  }
}

/**
 * Build a debounced autosave callback. Calls within `delayMs` of each other
 * are coalesced into one write; only the most recent project is persisted.
 */
export function debounceAutosave(
  db: IDBDatabase,
  delayMs: number = 500,
): (project: Project) => void {
  let pending: Project | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  return (project: Project): void => {
    pending = project;
    if (timer !== undefined) clearTimeout(timer);
    timer = setTimeout(() => {
      const next = pending;
      timer = undefined;
      pending = undefined;
      if (next) {
        saveAutosave(db, next).catch(() => {
          /* swallow — best effort autosave */
        });
      }
    }, delayMs);
  };
}
