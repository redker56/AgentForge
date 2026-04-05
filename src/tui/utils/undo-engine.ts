/**
 * Undo Engine -- timer-managed single-step undo buffer
 *
 * Manages one undo entry with an 8000ms expiry window.
 * Ticks at 250ms intervals, auto-clears when time runs out.
 */

export interface UndoEntry<T = unknown> {
  action: 'delete-skill' | 'remove-agent' | 'remove-project';
  snapshot: T;
  timestamp: number;
  remainingMs: number;
}

export interface UndoEngine {
  /** Push a new undo entry. Starts the countdown timer. Replaces any existing entry. */
  push(entry: Omit<UndoEntry, 'remainingMs'>): void;
  /** Pop and return the current entry. Stops the timer. Returns null if no entry. */
  pop(): UndoEntry | null;
  /** Clear the entry and stop the timer without returning it. */
  clear(): void;
  /** Get the current entry (read-only, does not stop timer). Returns null if no entry. */
  get(): UndoEntry | null;
  /** Returns true if an active entry exists with remainingMs > 0. */
  isActive(): boolean;
  /** Get remaining milliseconds on current entry. Returns 0 if no entry. */
  getRemainingMs(): number;
  /** Decrement remainingMs by tick interval. Returns updated remainingMs. Auto-clears at 0. */
  tick(): number;
  /** Stop the timer and clear internal state. Call on unmount. */
  destroy(): void;
}

const DEFAULT_TICK_MS = 250;
const DEFAULT_WINDOW_MS = 8000;

export function createUndoEngine(
  tickIntervalMs: number = DEFAULT_TICK_MS,
  windowMs: number = DEFAULT_WINDOW_MS,
): UndoEngine {
  let entry: UndoEntry | null = null;
  let timerRef: ReturnType<typeof setInterval> | null = null;

  function stopTimer(): void {
    if (timerRef !== null) {
      clearInterval(timerRef);
      timerRef = null;
    }
  }

  function startTimer(): void {
    stopTimer();
    timerRef = setInterval(() => {
      tick();
    }, tickIntervalMs);
  }

  function tick(): number {
    if (!entry) return 0;
    entry.remainingMs -= tickIntervalMs;
    if (entry.remainingMs <= 0) {
      entry.remainingMs = 0;
      stopTimer();
      entry = null;
      return 0;
    }
    return entry.remainingMs;
  }

  return {
    push(newEntry) {
      // Replace any existing entry
      stopTimer();
      entry = {
        ...newEntry,
        remainingMs: windowMs,
      };
      // Store the full timestamp from the pusher
      entry.timestamp = entry.timestamp ?? Date.now();
      startTimer();
    },

    pop() {
      if (!entry) return null;
      const current = entry;
      stopTimer();
      entry = null;
      return current;
    },

    clear() {
      stopTimer();
      entry = null;
    },

    get() {
      return entry;
    },

    isActive() {
      return entry !== null && entry.remainingMs > 0;
    },

    getRemainingMs() {
      return entry?.remainingMs ?? 0;
    },

    tick,

    destroy() {
      stopTimer();
      entry = null;
    },
  };
}
