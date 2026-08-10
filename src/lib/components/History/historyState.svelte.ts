import type { HistoryEntry, HistoryType, Optional, State } from '$lib/types';
import { readJSON, writeJSON } from '$lib/util/persist.svelte';
import { inputState } from '$lib/util/state.svelte';
import { logEvent } from '$lib/util/stats';
import { generateSlug } from 'random-word-slugs';
import { v4 as uuidV4 } from 'uuid';

const MAX_AUTO_HISTORY_LENGTH = 30;
const AUTO_SAVE_INTERVAL = 60_000;

interface Persisted<T> {
  value: T;
}

interface RemoteHistory {
  auto: HistoryEntry[];
  manual: HistoryEntry[];
}

const memoryPersisted = <T>(initial: T): Persisted<T> => {
  let value = $state.raw(initial);
  return {
    get value() {
      return value;
    },
    set value(next: T) {
      value = next;
    }
  };
};

const auto = memoryPersisted<HistoryEntry[]>([]);
const manual = memoryPersisted<HistoryEntry[]>([]);
const mode = memoryPersisted<HistoryType>('manual');
let loader = $state<HistoryEntry[]>([]);
let historyInitPromise: Promise<void> | undefined;

const isTest = import.meta.env.MODE === 'test';

const remoteSnapshot = (): RemoteHistory => ({
  auto: auto.value,
  manual: manual.value
});

const syncRemote = (): void => {
  if (isTest || typeof window === 'undefined') {
    return;
  }
  void fetch('/api/history', {
    body: JSON.stringify(remoteSnapshot()),
    headers: { 'Content-Type': 'application/json' },
    method: 'PUT'
  }).catch((error: unknown) => {
    console.error('Unable to save history to deployment storage', error);
  });
};

export const initHistory = (): Promise<void> => {
  if (historyInitPromise) {
    return historyInitPromise;
  }
  if (isTest || typeof window === 'undefined') {
    historyInitPromise = Promise.resolve();
    return historyInitPromise;
  }

  historyInitPromise = fetch('/api/history')
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`History request failed with ${response.status}`);
      }
      const data = (await response.json()) as Partial<RemoteHistory>;
      auto.value = Array.isArray(data.auto) ? data.auto : [];
      manual.value = Array.isArray(data.manual) ? data.manual : [];
      window.localStorage.removeItem('autoHistoryStore');
      window.localStorage.removeItem('manualHistoryStore');
    })
    .catch((error: unknown) => {
      console.error('Unable to load history from deployment storage', error);
    });
  return historyInitPromise;
};

const slotFor = (m: HistoryType): Persisted<HistoryEntry[]> | null => {
  switch (m) {
    case 'auto': {
      return auto;
    }
    case 'manual': {
      return manual;
    }
    default: {
      return null;
    }
  }
};

export const historyState = {
  get entries(): HistoryEntry[] {
    return slotFor(mode.value)?.value ?? loader;
  },
  get allEntries(): HistoryEntry[] {
    return [...auto.value, ...manual.value].sort((a, b) => b.time - a.time);
  },
  get loaderEntries(): HistoryEntry[] {
    return loader;
  },
  get mode(): HistoryType {
    return mode.value;
  }
};

export const setMode = (next: HistoryType): void => {
  mode.value = next;
};

export const stateKey = (state: State): string =>
  JSON.stringify({ code: state.code, mermaid: state.mermaid });

const createEntry = (state: State, type: 'auto' | 'manual', name?: string): HistoryEntry => ({
  id: uuidV4(),
  name: name?.trim() || generateSlug(2),
  state,
  time: Date.now(),
  type
});

const addEntry = (
  slot: Persisted<HistoryEntry[]>,
  state: State,
  type: 'auto' | 'manual',
  maxLength?: number,
  name?: string
): boolean => {
  const entries = slot.value;
  if (entries.length > 0 && stateKey(entries[0].state) === stateKey(state)) {
    return false;
  }
  const trimmed =
    maxLength && entries.length >= maxLength ? entries.slice(0, maxLength - 1) : entries;
  slot.value = [createEntry(state, type, name), ...trimmed];
  syncRemote();
  logEvent('history', { action: 'save', type });
  return true;
};

export const addManualEntry = (state: State, name?: string): boolean =>
  addEntry(manual, state, 'manual', undefined, name);

export const addAutoEntry = (state: State): boolean =>
  addEntry(auto, state, 'auto', MAX_AUTO_HISTORY_LENGTH);

export const setLoaderEntries = (entries: Optional<HistoryEntry, 'id'>[]): void => {
  loader = entries.map((entry) =>
    entry.id ? (entry as HistoryEntry) : { ...entry, id: uuidV4() }
  );
};

export const removeEntry = (id: string): void => {
  let removed = false;
  for (const slot of [auto, manual]) {
    const next = slot.value.filter((entry) => entry.id !== id);
    if (next.length !== slot.value.length) {
      slot.value = next;
      removed = true;
    }
  }
  if (removed) {
    syncRemote();
    logEvent('history', { action: 'clear', type: 'single' });
  }
};

export const renameEntry = (id: string, name: string): void => {
  const trimmed = name.trim();
  const slot = slotFor(mode.value);
  if (!trimmed || !slot) {
    return;
  }
  slot.value = slot.value.map((entry) => (entry.id === id ? { ...entry, name: trimmed } : entry));
  syncRemote();
  logEvent('history', { action: 'rename' });
};

export const clearActive = (): void => {
  const slot = slotFor(mode.value);
  if (!slot) {
    return;
  }
  slot.value = [];
  syncRemote();
  logEvent('history', { action: 'clear', type: 'all' });
};

const validateEntry = (entry: HistoryEntry): boolean =>
  Boolean(entry && entry.type && entry.state) && typeof entry.time === 'number';

export interface RestoreResult {
  restored: number;
  invalid: number;
  duplicates: number;
}

export const restoreEntries = (data: HistoryEntry[]): RestoreResult => {
  const valid = data.filter((entry) => validateEntry(entry));
  const invalid = data.length - valid.length;
  let restored = 0;

  const slots: [HistoryType, Persisted<HistoryEntry[]>][] = [
    ['auto', auto],
    ['manual', manual]
  ];
  for (const [type, slot] of slots) {
    const incoming = valid.filter(({ type: entryType }) => entryType === type);
    if (incoming.length === 0) {
      continue;
    }
    const existingIDs = slot.value.map(({ id }) => id);
    const fresh = incoming.filter(({ id }) => !existingIDs.includes(id));
    restored += fresh.length;
    slot.value = [...slot.value, ...fresh].sort((a, b) => b.time - a.time);
  }

  if (restored > 0) {
    syncRemote();
  }
  const duplicates = valid.length - restored;
  logEvent('history', { action: 'restore', duplicates, invalid, success: restored });
  return { restored, invalid, duplicates };
};

// The old migration remains test-compatible, but production history is loaded
// from the authenticated deployment API and never reads these browser keys.
export const injectHistoryIDs = (): void => {
  if (!isTest) {
    return;
  }
  for (const [key, type] of [
    ['manualHistoryStore', 'manual'],
    ['autoHistoryStore', 'auto']
  ] as const) {
    const entries = readJSON<HistoryEntry[]>(key, []);
    writeJSON(
      key,
      entries.map((entry) => (entry.id ? entry : { ...entry, id: uuidV4(), type }))
    );
  }
};

let autoSaveTimer: ReturnType<typeof setInterval> | undefined;

export const startAutoSave = (): (() => void) => {
  if (autoSaveTimer === undefined) {
    autoSaveTimer = setInterval(
      () => addAutoEntry($state.snapshot(inputState)),
      AUTO_SAVE_INTERVAL
    );
  }
  return stopAutoSave;
};

export const stopAutoSave = (): void => {
  if (autoSaveTimer !== undefined) {
    clearInterval(autoSaveTimer);
    autoSaveTimer = undefined;
  }
};
