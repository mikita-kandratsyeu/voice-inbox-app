import { useCallback, useRef } from 'react';

export type TextSelection = {
  start: number;
  end: number;
};

type HistoryEntry = {
  text: string;
  selection: TextSelection;
};

const MAX_HISTORY_SIZE = 50;
const UNDO_DEBOUNCE_MS = 500;

export function useUndoRedo() {
  const historyRef = useRef<HistoryEntry[]>([]);
  const currentIndexRef = useRef(-1);
  const lastSaveTimeRef = useRef(0);
  const pendingTextRef = useRef<string | null>(null);
  const pendingSelectionRef = useRef<TextSelection | null>(null);

  const pushToHistory = useCallback((text: string, selection: TextSelection) => {
    const entry: HistoryEntry = { text, selection };

    // Remove any "future" entries if we're not at the end
    if (currentIndexRef.current < historyRef.current.length - 1) {
      historyRef.current = historyRef.current.slice(0, currentIndexRef.current + 1);
    }

    // Don't add if identical to current
    const current = historyRef.current[currentIndexRef.current];
    if (current?.text === text) {
      return;
    }

    historyRef.current.push(entry);
    currentIndexRef.current = historyRef.current.length - 1;

    // Limit history size
    if (historyRef.current.length > MAX_HISTORY_SIZE) {
      historyRef.current.shift();
      currentIndexRef.current--;
    }
  }, []);

  const recordChange = useCallback(
    (text: string, selection: TextSelection) => {
      const now = Date.now();
      pendingTextRef.current = text;
      pendingSelectionRef.current = selection;

      // Debounce: only push to history if enough time has passed
      if (now - lastSaveTimeRef.current >= UNDO_DEBOUNCE_MS) {
        pushToHistory(text, selection);
        lastSaveTimeRef.current = now;
        pendingTextRef.current = null;
        pendingSelectionRef.current = null;
      }
    },
    [pushToHistory],
  );

  const flushPending = useCallback(() => {
    if (pendingTextRef.current !== null && pendingSelectionRef.current !== null) {
      pushToHistory(pendingTextRef.current, pendingSelectionRef.current);
      lastSaveTimeRef.current = Date.now();
      pendingTextRef.current = null;
      pendingSelectionRef.current = null;
    }
  }, [pushToHistory]);

  const undo = useCallback((): HistoryEntry | null => {
    flushPending();

    if (currentIndexRef.current <= 0) {
      return null;
    }

    currentIndexRef.current--;
    return historyRef.current[currentIndexRef.current] ?? null;
  }, [flushPending]);

  const redo = useCallback((): HistoryEntry | null => {
    flushPending();

    if (currentIndexRef.current >= historyRef.current.length - 1) {
      return null;
    }

    currentIndexRef.current++;
    return historyRef.current[currentIndexRef.current] ?? null;
  }, [flushPending]);

  const canUndo = useCallback((): boolean => {
    return currentIndexRef.current > 0 || pendingTextRef.current !== null;
  }, []);

  const canRedo = useCallback((): boolean => {
    return currentIndexRef.current < historyRef.current.length - 1;
  }, []);

  const reset = useCallback((initialText: string, initialSelection: TextSelection) => {
    historyRef.current = [{ text: initialText, selection: initialSelection }];
    currentIndexRef.current = 0;
    lastSaveTimeRef.current = Date.now();
    pendingTextRef.current = null;
    pendingSelectionRef.current = null;
  }, []);

  return {
    recordChange,
    flushPending,
    undo,
    redo,
    canUndo,
    canRedo,
    reset,
  };
}
