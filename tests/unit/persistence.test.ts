import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from "vitest";
import path from "path";
import os from "os";
import fs from "fs";

// Intercept process.cwd() before importing the module under test
const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "jobclaw-test-"));
const origCwd = process.cwd;

function mockCwd(tmpDir: string) {
  vi.spyOn(process, "cwd").mockReturnValue(tmpDir);
}

beforeEach(() => {
  mockCwd(tmpRoot);
  fs.mkdirSync(path.join(tmpRoot, ".jobclaw-data"), { recursive: true });
});

afterEach(() => {
  // Clean up the state file but leave the directory for re-creation
  const stateFile = path.join(tmpRoot, ".jobclaw-data", "state.json");
  if (fs.existsSync(stateFile)) fs.unlinkSync(stateFile);
});

afterAll(() => {
  // Clean up entire temp dir once
  fs.rmSync(tmpRoot, { recursive: true, force: true });
});

describe("persistence module", () => {
  beforeEach(() => {
    vi.resetModules();
    // Re-mock cwd after module reset
    mockCwd(tmpRoot);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("loadState", () => {
    it("returns empty object when no state file exists", async () => {
      const { loadState } = await import("../../src/server/lib/persistence");
      const state = loadState();
      expect(state).toEqual({});
    });

    it("returns parsed state when valid JSON file exists", async () => {
      const testState = {
        userProfile: { headline: "Test" },
        jobPool: [{ id: "job-1", title: "Engineer" }],
        applications: [],
        autopilotQueue: [],
        autopilotLogs: [],
        autopilotRules: { minFitScore: 50 },
        autopilotSkills: {},
      };
      const stateFile = path.join(tmpRoot, ".jobclaw-data", "state.json");
      fs.writeFileSync(stateFile, JSON.stringify(testState, null, 2), "utf-8");

      const { loadState } = await import("../../src/server/lib/persistence");
      const state = loadState();
      expect(state).toEqual(testState);
    });

    it("returns empty object for corrupted JSON", async () => {
      const stateFile = path.join(tmpRoot, ".jobclaw-data", "state.json");
      fs.writeFileSync(stateFile, "{ this is not valid json }", "utf-8");

      const { loadState } = await import("../../src/server/lib/persistence");
      const state = loadState();
      expect(state).toEqual({});
    });

    it("returns empty object when JSON is not an object", async () => {
      const stateFile = path.join(tmpRoot, ".jobclaw-data", "state.json");
      fs.writeFileSync(stateFile, '"just a string"', "utf-8");

      const { loadState } = await import("../../src/server/lib/persistence");
      const state = loadState();
      expect(state).toEqual({});
    });
  });

  describe("saveState", () => {
    it("writes state to file after debounce delay", async () => {
      const testState = {
        userProfile: null,
        jobPool: [],
        applications: [],
        autopilotQueue: [{ id: "q-1", jobTitle: "Tester" }],
        autopilotLogs: [],
        autopilotRules: {},
        autopilotSkills: {},
      };

      const { saveState, loadState } = await import("../../src/server/lib/persistence");
      saveState(testState);

      // Before debounce fires, file should not exist yet
      const stateFile = path.join(tmpRoot, ".jobclaw-data", "state.json");
      expect(fs.existsSync(stateFile)).toBe(false);

      // Advance past the 1000ms debounce
      vi.advanceTimersByTime(1100);

      // Now the file should exist
      expect(fs.existsSync(stateFile)).toBe(true);
      const loaded = loadState();
      const items = loaded.autopilotQueue as Array<{ jobTitle: string }>;
      expect(items).toHaveLength(1);
      expect(items[0].jobTitle).toBe("Tester");
    });

    it("debounces multiple rapid calls, only writes last state", async () => {
      const { saveState, loadState } = await import("../../src/server/lib/persistence");

      saveState({ userProfile: null, jobPool: [{ id: "j1" }], applications: [], autopilotQueue: [], autopilotLogs: [], autopilotRules: {}, autopilotSkills: {} });
      vi.advanceTimersByTime(500);

      saveState({ userProfile: null, jobPool: [{ id: "j2" }], applications: [], autopilotQueue: [], autopilotLogs: [], autopilotRules: {}, autopilotSkills: {} });
      vi.advanceTimersByTime(500);

      saveState({ userProfile: null, jobPool: [{ id: "j3" }], applications: [], autopilotQueue: [], autopilotLogs: [], autopilotRules: {}, autopilotSkills: {} });
      vi.advanceTimersByTime(1100);

      const loaded = loadState();
      const pool = loaded.jobPool as Array<{ id: string }>;
      expect(pool).toHaveLength(1);
      expect(pool[0].id).toBe("j3");
    });

    it("includes savedAt timestamp", async () => {
      const { saveState, loadState } = await import("../../src/server/lib/persistence");

      const now = new Date("2026-06-01T12:00:00Z");
      vi.setSystemTime(now);

      saveState({ userProfile: null, jobPool: [], applications: [], autopilotQueue: [], autopilotLogs: [], autopilotRules: {}, autopilotSkills: {} });
      vi.advanceTimersByTime(1100);

      const loaded = loadState();
      expect(loaded.savedAt).toBeDefined();
      expect(typeof loaded.savedAt).toBe("string");
    });
  });
});
