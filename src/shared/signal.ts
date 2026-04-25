/**
 * Typed pub/sub for a single event channel.
 * Engine composes named instances per event (e.g. `transportChanged`).
 */
export class Signal<T> {
  private readonly listeners: Set<(payload: T) => void> = new Set();

  /** Register a listener; returns a function that detaches it. */
  on(handler: (payload: T) => void): () => void {
    this.listeners.add(handler);
    return () => {
      this.listeners.delete(handler);
    };
  }

  /** Notify every registered listener synchronously. */
  emit(payload: T): void {
    for (const handler of this.listeners) {
      handler(payload);
    }
  }
}
