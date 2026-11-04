import { useCallback, useMemo, useState } from "react";

const LIMIT = 120;

interface Stacks<T> {
  past: T[];
  /** The last recorded state: what undo returns to while a live change is in progress. */
  committed: T;
  present: T;
  future: T[];
}

/**
 * Undo/redo with live updates. `update` changes the present without recording (slider drags,
 * pointer moves); `commit` records everything since the last commit as one step; `apply` does both,
 * for discrete actions like adding a sticker. Updaters stay pure so StrictMode's double-invoke is safe.
 */
export function useHistory<T>(initial: T) {
  const [stacks, setStacks] = useState<Stacks<T>>({ past: [], committed: initial, present: initial, future: [] });

  const update = useCallback((fn: (prev: T) => T) => {
    setStacks((s) => {
      const present = fn(s.present);
      return present === s.present ? s : { ...s, present };
    });
  }, []);

  const commit = useCallback(() => {
    setStacks((s) =>
      s.present === s.committed
        ? s
        : { past: [...s.past, s.committed].slice(-LIMIT), committed: s.present, present: s.present, future: [] },
    );
  }, []);

  const apply = useCallback((fn: (prev: T) => T) => {
    setStacks((s) => {
      const next = fn(s.present);
      if (next === s.present) return s;
      return { past: [...s.past, s.committed].slice(-LIMIT), committed: next, present: next, future: [] };
    });
  }, []);

  const undo = useCallback(() => {
    setStacks((s) => {
      if (s.present !== s.committed) return { ...s, present: s.committed, future: [s.present, ...s.future] };
      if (!s.past.length) return s;
      const previous = s.past[s.past.length - 1];
      return { past: s.past.slice(0, -1), committed: previous, present: previous, future: [s.present, ...s.future] };
    });
  }, []);

  const redo = useCallback(() => {
    setStacks((s) => {
      if (!s.future.length) return s;
      const [next, ...rest] = s.future;
      return { past: [...s.past, s.committed].slice(-LIMIT), committed: next, present: next, future: rest };
    });
  }, []);

  const reset = useCallback((value: T) => {
    setStacks({ past: [], committed: value, present: value, future: [] });
  }, []);

  return useMemo(
    () => ({
      state: stacks.present,
      canUndo: stacks.past.length > 0 || stacks.present !== stacks.committed,
      canRedo: stacks.future.length > 0,
      update,
      commit,
      apply,
      undo,
      redo,
      reset,
    }),
    [stacks, update, commit, apply, undo, redo, reset],
  );
}
