import type { RideSource } from "@/app/appState";

/** The rides kept between visits: the latest few, with the bytes they were read from. */
export const MAX_STORED_RIDES = 5;
/** Recent files are only a few numbers each, so the list can be longer. */
export const MAX_RECENT_FILES = 20;
export const MAX_PROCESSED = 2000;

export interface StoredRide {
  id: string;
  fileName: string;
  source: RideSource;
  /** The file as the user gave it (or a FIT written from the ride when that is not known). */
  bytes: Uint8Array;
  savedAt: number;
}

/** What is remembered about a file that was opened: metadata only, never its content. */
export interface RecentFile {
  /** `fileKey(fileName, sizeBytes)`. */
  key: string;
  fileName: string;
  sizeBytes: number;
  startTime: number | null;
  distanceM: number | null;
  durationS: number | null;
  openedAt: number;
}

/** An activity that was loaded in some session; used to say which device files are new. */
export interface ProcessedActivity {
  /** `activityKey` of the ride. */
  key: string;
  fileName: string;
  sizeBytes: number;
  processedAt: number;
}

export interface RideStore {
  /** Adds or replaces a ride; only the latest `MAX_STORED_RIDES` are kept. */
  saveRide(ride: StoredRide): Promise<void>;
  removeRide(id: string): Promise<void>;
  /** Oldest saved first, so adding them in order leaves the latest one active. */
  loadRides(): Promise<StoredRide[]>;
  /** Adds a file or moves it to the top of the recent list. */
  rememberRecent(file: RecentFile): Promise<void>;
  forgetRecent(key: string): Promise<void>;
  /** Newest first. */
  listRecent(): Promise<RecentFile[]>;
  markProcessed(items: ProcessedActivity[]): Promise<void>;
  listProcessed(): Promise<ProcessedActivity[]>;
  /** Called after every change made through this store; returns the function that stops it. */
  subscribe(listener: () => void): () => void;
}
