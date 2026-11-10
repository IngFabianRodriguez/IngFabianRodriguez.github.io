import {
  MAX_PROCESSED,
  MAX_RECENT_FILES,
  MAX_STORED_RIDES,
  type ProcessedActivity,
  type RecentFile,
  type RideStore,
  type StoredRide,
} from "@/lib/persistence/rideStore";

export const DEFAULT_DB_NAME = "fit-power-lab";
const DB_VERSION = 1;
const RIDES = "rides";
const RECENT = "recent";
const PROCESSED = "processed";

type StoredRow = StoredRide & { seq: number };

function open(name: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      db.createObjectStore(RIDES, { keyPath: "id" });
      db.createObjectStore(RECENT, { keyPath: "key" });
      db.createObjectStore(PROCESSED, { keyPath: "key" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open the database."));
    request.onblocked = () => reject(new Error("The database is blocked by another tab."));
  });
}

/**
 * Runs `work` inside one transaction and resolves with its result once the transaction has
 * committed. `work` must only use the request callbacks it is given: awaiting anything else would
 * let the transaction close.
 */
function transact<T>(
  db: IDBDatabase,
  stores: string[],
  mode: IDBTransactionMode,
  work: (tx: IDBTransaction, done: (value: T) => void) => void,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(stores, mode);
    let result: T;
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error ?? new Error("The transaction failed."));
    tx.onabort = () => reject(tx.error ?? new Error("The transaction was aborted."));
    work(tx, (value) => {
      result = value;
    });
  });
}

function getAll<T>(tx: IDBTransaction, store: string, then: (rows: T[]) => void) {
  const request = tx.objectStore(store).getAll();
  request.onsuccess = () => then(request.result as T[]);
}

/** Keeps the newest `keep` rows by `order` (higher is newer) and deletes the rest. */
function trim<T>(
  tx: IDBTransaction,
  store: string,
  rows: T[],
  keep: number,
  order: (row: T) => number,
  keyOf: (row: T) => string,
) {
  const newestFirst = [...rows].sort((a, b) => order(b) - order(a));
  for (const old of newestFirst.slice(keep)) tx.objectStore(store).delete(keyOf(old));
}

/** The ride store of the app in the browser: raw IndexedDB, no library. */
export function createIndexedDbRideStore(name: string = DEFAULT_DB_NAME): RideStore {
  let database: Promise<IDBDatabase> | null = null;
  const db = () =>
    (database ??= open(name).catch((error: unknown) => {
      database = null;
      throw error;
    }));
  const listeners = new Set<() => void>();
  const changed = () => listeners.forEach((listener) => listener());

  async function write<T>(
    stores: string[],
    work: (tx: IDBTransaction, done: (value: T) => void) => void,
  ): Promise<T> {
    const result = await transact<T>(await db(), stores, "readwrite", work);
    changed();
    return result;
  }

  async function read<T>(store: string, pick: (rows: unknown[]) => T): Promise<T> {
    return transact<T>(await db(), [store], "readonly", (tx, done) => {
      getAll<unknown>(tx, store, (rows) => done(pick(rows)));
    });
  }

  return {
    saveRide: (ride) =>
      write<void>([RIDES], (tx) => {
        getAll<StoredRow>(tx, RIDES, (rows) => {
          const existing = rows.find((row) => row.id === ride.id);
          const seq = existing?.seq ?? rows.reduce((max, row) => Math.max(max, row.seq), 0) + 1;
          tx.objectStore(RIDES).put({ ...ride, seq });
          const after = [...rows.filter((row) => row.id !== ride.id), { ...ride, seq }];
          trim(
            tx,
            RIDES,
            after,
            MAX_STORED_RIDES,
            (row) => row.seq,
            (row) => row.id,
          );
        });
      }),

    removeRide: (id) =>
      write<void>([RIDES], (tx) => {
        tx.objectStore(RIDES).delete(id);
      }),

    loadRides: () =>
      read<StoredRide[]>(RIDES, (rows) =>
        (rows as StoredRow[]).sort((a, b) => a.seq - b.seq).map(({ seq: _seq, ...ride }) => ride),
      ),

    rememberRecent: (file) =>
      write<void>([RECENT], (tx) => {
        tx.objectStore(RECENT).put(file);
        getAll<RecentFile>(tx, RECENT, (rows) => {
          const after = [...rows.filter((row) => row.key !== file.key), file];
          trim(
            tx,
            RECENT,
            after,
            MAX_RECENT_FILES,
            (row) => row.openedAt,
            (row) => row.key,
          );
        });
      }),

    forgetRecent: (key) =>
      write<void>([RECENT], (tx) => {
        tx.objectStore(RECENT).delete(key);
      }),

    listRecent: () =>
      read<RecentFile[]>(RECENT, (rows) =>
        (rows as RecentFile[]).sort((a, b) => b.openedAt - a.openedAt),
      ),

    markProcessed: (items) =>
      write<void>([PROCESSED], (tx) => {
        for (const item of items) tx.objectStore(PROCESSED).put(item);
        getAll<ProcessedActivity>(tx, PROCESSED, (rows) => {
          const keys = new Set(items.map((item) => item.key));
          const after = [...rows.filter((row) => !keys.has(row.key)), ...items];
          trim(
            tx,
            PROCESSED,
            after,
            MAX_PROCESSED,
            (row) => row.processedAt,
            (row) => row.key,
          );
        });
      }),

    listProcessed: () =>
      read<ProcessedActivity[]>(PROCESSED, (rows) => rows as ProcessedActivity[]),

    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
