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

const exampleProjects: HistoryEntry[] = [
  {
    id: 'example-firmware-boot-flow',
    name: 'Firmware Boot Flow',
    state: { code: 'flowchart TD\n  Reset["Power On Reset"] --> Boot["Bootloader"]\n  Boot --> Check{"Application valid?"}\n  Check -->|Yes| App["Start Application"]\n  Check -->|No| Recovery["Recovery Mode"]', grid: true, mermaid: '{"theme":"default"}', panZoom: true, rough: false, updateDiagram: true },
    time: Date.now() - 10 * 60_000,
    type: 'manual'
  },
  {
    id: 'example-rtos-task-scheduler',
    name: 'RTOS Task Scheduler',
    state: { code: 'flowchart LR\n  Timer["System Tick"] --> Scheduler["RTOS Scheduler"]\n  Scheduler --> Sensor["Sensor Task"]\n  Scheduler --> Control["Control Task"]\n  Scheduler --> Comms["Comms Task"]\n  Sensor --> Queue["Message Queue"] --> Control', grid: true, mermaid: '{"theme":"default"}', panZoom: true, rough: false, updateDiagram: true },
    time: Date.now() - 20 * 60_000,
    type: 'manual'
  },
  {
    id: 'example-can-bus-network',
    name: 'CAN Bus Network',
    state: { code: 'flowchart TB\n  ECU1["Powertrain ECU"] --- Bus["CAN Bus"]\n  ECU2["Body Control ECU"] --- Bus\n  ECU3["Instrument Cluster"] --- Bus\n  Bus --> Gateway["CAN Gateway"] --> Cloud["Telemetry"]', grid: true, mermaid: '{"theme":"default"}', panZoom: true, rough: false, updateDiagram: true },
    time: Date.now() - 30 * 60_000,
    type: 'manual'
  },
  {
    id: 'example-uart-driver-sequence',
    name: 'UART Driver Sequence',
    state: { code: 'sequenceDiagram\n  participant App as Application\n  participant Driver as UART Driver\n  participant DMA\n  participant Device\n  App->>Driver: uart_write(buffer)\n  Driver->>DMA: Configure TX transfer\n  DMA->>Device: Send bytes\n  Device-->>DMA: Transfer complete\n  DMA-->>Driver: IRQ\n  Driver-->>App: Callback', grid: true, mermaid: '{"theme":"default"}', panZoom: true, rough: false, updateDiagram: true },
    time: Date.now() - 40 * 60_000,
    type: 'manual'
  },
  {
    id: 'example-spi-peripheral-topology',
    name: 'SPI Peripheral Topology',
    state: { code: 'flowchart LR\n  MCU["MCU"] --> SCK["SCK"]\n  MCU --> MOSI["MOSI"]\n  MCU --> MISO["MISO"]\n  MCU --> CS1["CS1"] --> Flash["External Flash"]\n  MCU --> CS2["CS2"] --> Sensor["IMU Sensor"]', grid: true, mermaid: '{"theme":"default"}', panZoom: true, rough: false, updateDiagram: true },
    time: Date.now() - 50 * 60_000,
    type: 'manual'
  },
  {
    id: 'example-i2c-device-discovery',
    name: 'I2C Device Discovery',
    state: { code: 'flowchart TD\n  Start["I2C Start"] --> Address["Scan Address 0x08..0x77"]\n  Address --> Ack{"ACK received?"}\n  Ack -->|Yes| Register["Read device ID"]\n  Ack -->|No| Next["Next address"]\n  Register --> Next\n  Next --> Address\n  Next --> Done["Return device table"]', grid: true, mermaid: '{"theme":"default"}', panZoom: true, rough: false, updateDiagram: true },
    time: Date.now() - 60 * 60_000,
    type: 'manual'
  },
  {
    id: 'example-ota-update-pipeline',
    name: 'OTA Update Pipeline',
    state: { code: 'flowchart LR\n  Build["CI Build"] --> Sign["Sign Firmware"] --> Release["Release Server"]\n  Device["Device"] --> Check["Check Version"] --> Release\n  Release --> Download["Download Image"] --> Verify["Verify Signature"]\n  Verify --> Install["Install to Inactive Slot"] --> Reboot["Reboot"]', grid: true, mermaid: '{"theme":"default"}', panZoom: true, rough: false, updateDiagram: true },
    time: Date.now() - 70 * 60_000,
    type: 'manual'
  },
  {
    id: 'example-motor-control-state-machine',
    name: 'Motor Control State Machine',
    state: { code: 'stateDiagram-v2\n  [*] --> Idle\n  Idle --> Starting: start command\n  Starting --> Running: speed stable\n  Starting --> Fault: overcurrent\n  Running --> Stopping: stop command\n  Running --> Fault: protection trip\n  Stopping --> Idle: motor stopped\n  Fault --> Idle: reset', grid: true, mermaid: '{"theme":"default"}', panZoom: true, rough: false, updateDiagram: true },
    time: Date.now() - 80 * 60_000,
    type: 'manual'
  },
  {
    id: 'example-watchdog-recovery',
    name: 'Watchdog Recovery',
    state: { code: 'flowchart TD\n  Task["Critical Task"] --> Feed["Feed Watchdog"]\n  Feed --> Monitor["Watchdog Monitor"]\n  Task --> Error{"Task stalled?"}\n  Error -->|No| Feed\n  Error -->|Yes| Timeout["Watchdog Timeout"]\n  Timeout --> Reset["System Reset"] --> Log["Persist Reset Reason"]', grid: true, mermaid: '{"theme":"default"}', panZoom: true, rough: false, updateDiagram: true },
    time: Date.now() - 90 * 60_000,
    type: 'manual'
  },
  {
    id: 'example-embedded-system-architecture',
    name: 'Embedded System Architecture',
    state: { code: 'flowchart TB\n  subgraph Hardware\n    CPU["MCU / CPU"]\n    Memory["Flash + RAM"]\n    IO["GPIO / ADC / PWM"]\n  end\n  subgraph Software\n    BSP["Board Support Package"]\n    HAL["Hardware Abstraction"]\n    Services["System Services"]\n    App["Application"]\n  end\n  Hardware --> BSP --> HAL --> Services --> App', grid: true, mermaid: '{"theme":"default"}', panZoom: true, rough: false, updateDiagram: true },
    time: Date.now() - 100 * 60_000,
    type: 'manual'
  }
];

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
      const remoteAuto = Array.isArray(data.auto) ? data.auto : [];
      const remoteManual = Array.isArray(data.manual) ? data.manual : [];
      const localAuto = readJSON<HistoryEntry[]>('autoHistoryStore', []);
      const localManual = readJSON<HistoryEntry[]>('manualHistoryStore', []);
      const shouldMigrate =
        remoteAuto.length === 0 &&
        remoteManual.length === 0 &&
        (localAuto.length > 0 || localManual.length > 0);

      auto.value = shouldMigrate ? localAuto : remoteAuto;
      manual.value = shouldMigrate ? localManual : remoteManual;
      const existingIds = new Set(manual.value.map((entry) => entry.id));
      const missingExamples = exampleProjects.filter((entry) => !existingIds.has(entry.id));
      if (missingExamples.length > 0) {
        manual.value = [...manual.value, ...missingExamples];
      }
      if (shouldMigrate || missingExamples.length > 0) {
        await fetch('/api/history', {
          body: JSON.stringify(remoteSnapshot()),
          headers: { 'Content-Type': 'application/json' },
          method: 'PUT'
        });
      }
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

export const duplicateEntry = (id: string): boolean => {
  const source = [...auto.value, ...manual.value].find((entry) => entry.id === id);
  if (!source) {
    return false;
  }
  const name = source.name?.trim() || 'Untitled Project';
  manual.value = [
    createEntry(source.state, 'manual', `Copy of ${name}`),
    ...manual.value.slice(0, 499)
  ];
  syncRemote();
  logEvent('history', { action: 'duplicate' });
  return true;
};

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

export const toggleFavorite = (id: string): void => {
  for (const slot of [auto, manual]) {
    const entry = slot.value.find((item) => item.id === id);
    if (!entry) {
      continue;
    }
    slot.value = slot.value.map((item) =>
      item.id === id ? { ...item, favorite: !item.favorite } : item
    );
    syncRemote();
    return;
  }
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
