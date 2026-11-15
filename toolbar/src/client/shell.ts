// What the toolbar shows: which app's window is open, whether the overlay is,
// and which apps have a badge. A small store outside React, so apps (which
// aren't React yet) can read and change it, and the shell renders from it.

export type ShellState = {
  /** The app whose window is open. */
  open: string | undefined;
  /** The full-viewport overlay. It and the app windows take turns. */
  overlay: boolean;
  /** Apps showing a badge. */
  notified: ReadonlySet<string>;
};

export type Shell = ReturnType<typeof createShell>;

export function createShell() {
  let state: ShellState = { open: undefined, overlay: false, notified: new Set() };
  const listeners = new Set<() => void>();
  const toggleListeners = new Map<string, Set<(open: boolean) => void>>();
  const notifyToggle = (id: string | undefined, isOpen: boolean) =>
    id !== undefined && toggleListeners.get(id)?.forEach((listener) => listener(isOpen));

  function update(patch: Partial<ShellState>) {
    const was = state.open;
    state = { ...state, ...patch };
    listeners.forEach((listener) => listener());
    if (was === state.open) return;
    notifyToggle(was, false);
    notifyToggle(state.open, true);
  }

  return {
    get: () => state,
    /** For `useSyncExternalStore`. Returns an unsubscribe. */
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    /** Opens app `id`'s window, closing the overlay. `undefined` closes the window. */
    setOpen(id: string | undefined) {
      update(id === undefined ? { open: undefined } : { open: id, overlay: false });
    },
    /** Opens or closes the overlay. Opening it closes any app window. */
    setOverlay(on: boolean) {
      update(on ? { open: undefined, overlay: true } : { overlay: false });
    },
    notify(id: string, on: boolean) {
      // Apps call this on every render; skip it when nothing changes.
      if (state.notified.has(id) === on) return;
      const notified = new Set(state.notified);
      if (on) notified.add(id);
      else notified.delete(id);
      update({ notified });
    },
    /** Calls `listener` when app `id`'s window opens or closes. */
    onToggle(id: string, listener: (open: boolean) => void) {
      let set = toggleListeners.get(id);
      if (!set) toggleListeners.set(id, (set = new Set()));
      set.add(listener);
    },
  };
}
