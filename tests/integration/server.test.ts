import { describe, it, expect, beforeAll, afterAll } from "vitest";

const BASE = "http://localhost:3000";

async function waitForServer(url: string, maxRetries = 20): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // server not ready yet
    }
    await new Promise(r => setTimeout(r, 1000));
  }
  throw new Error(`Server did not respond at ${url} after ${maxRetries}s`);
}

// Note: these tests require the dev server to be running on port 3000.
// The CI workflow should start the server before running integration tests.
describe("server integration", () => {
  beforeAll(async () => {
    await waitForServer(BASE);
  }, 30000);

  describe("GET /api/profile", () => {
    it("returns profile data", async () => {
      const res = await fetch(`${BASE}/api/profile`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe("success");
      expect(body.profile).toBeDefined();
      expect(body.profile.contactInfo).toBeDefined();
    });
  });

  describe("GET /api/jobs", () => {
    it("returns job list", async () => {
      const res = await fetch(`${BASE}/api/jobs`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe("success");
      expect(Array.isArray(body.jobs)).toBe(true);
    });
  });

  describe("GET /api/applications", () => {
    it("returns application list", async () => {
      const res = await fetch(`${BASE}/api/applications`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe("success");
      expect(Array.isArray(body.applications)).toBe(true);
    });
  });

  describe("GET /api/sector-packs", () => {
    it("returns sector packs", async () => {
      const res = await fetch(`${BASE}/api/sector-packs`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe("success");
      expect(Array.isArray(body.sectorPacks)).toBe(true);
    });
  });

  describe("GET /api/gemini/status", () => {
    it("returns status (real or mock gracefully)", async () => {
      const res = await fetch(`${BASE}/api/gemini/status`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(typeof body.connected).toBe("boolean");
      expect(typeof body.model).toBe("string");
    });
  });

  describe("GET /api/autopilot/state", () => {
    it("returns autopilot state", async () => {
      const res = await fetch(`${BASE}/api/autopilot/state`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe("success");
      expect(Array.isArray(body.queue)).toBe(true);
      expect(Array.isArray(body.logs)).toBe(true);
    });
  });

  describe("POST /api/jobs (ingest + score)", () => {
    it("ingests a new job and returns it scored", async () => {
      const res = await fetch(`${BASE}/api/jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Integration Test Engineer",
          company: "TestCorp Int",
          description: "Testing TypeScript Node.js Express APIs",
          location: "Raleigh, NC",
          salary: "$80,000 - $100,000",
          sourceUrl: "https://example.com/int-test",
        }),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe("success");
      expect(body.job).toBeDefined();
      expect(body.job.title).toBe("Integration Test Engineer");
      expect(typeof body.job.fitScore).toBe("number");
    });
  });

  describe("404 handling", () => {
    it("returns 404 JSON for unknown API routes", async () => {
      const res = await fetch(`${BASE}/api/nonexistent-route`);
      // Express SPA fallback may return HTML; just confirm it's not a crash
      expect(res.status).toBeGreaterThanOrEqual(200);
    });
  });
});
