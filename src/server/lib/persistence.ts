/**
 * Simple JSON-file persistence for Jobclaw server state.
 *
 * Avoids external DB dependencies while still letting data survive server restarts.
 * Writes are debounced to prevent thrashing during cron cycles.
 */

import fs from "fs";
import path from "path";

const DATA_DIR = path.resolve(process.cwd(), ".jobclaw-data");
const DB_FILE = path.join(DATA_DIR, "state.json");

export interface PersistedState {
  userProfile: unknown;
  jobPool: unknown[];
  applications: unknown[];
  autopilotQueue: unknown[];
  autopilotLogs: unknown[];
  autopilotRules: unknown;
  autopilotSkills: unknown;
  savedAt: string;
}

let writeTimer: NodeJS.Timeout | null = null;
let pendingState: PersistedState | null = null;

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function loadState(): Partial<PersistedState> {
  try {
    ensureDir();
    if (!fs.existsSync(DB_FILE)) {
      return {};
    }
    const raw = fs.readFileSync(DB_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (err) {
    console.warn("[persistence] Failed to load state:", (err as Error).message);
    return {};
  }
}

export function saveState(state: Omit<PersistedState, "savedAt">): void {
  pendingState = { ...state, savedAt: new Date().toISOString() };

  if (writeTimer) clearTimeout(writeTimer);
  writeTimer = setTimeout(() => {
    try {
      ensureDir();
      fs.writeFileSync(DB_FILE, JSON.stringify(pendingState, null, 2), "utf-8");
    } catch (err) {
      console.warn("[persistence] Failed to save state:", (err as Error).message);
    }
  }, 1000);
}
