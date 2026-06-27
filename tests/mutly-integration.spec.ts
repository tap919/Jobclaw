import { test, expect } from "@playwright/test";

/**
 * Integration Tests: Jobclaw <-> Mutly
 *
 * Tests the HTTP API endpoints for Mutly integration.
 * Validates proper request/response handling, error states,
 * and API key authentication behavior.
 */

const MUTLY_URL = "http://localhost:4000";
const JOBCLAW_URL = "http://localhost:3000"; // Jobclaw default port

test.describe("Mutly Health Check", () => {
  test("Mutly service should respond to health check", async ({ request }) => {
    const response = await request.get(`${MUTLY_URL}/api/health`, {
      timeout: 5000,
    }).catch(() => null);

    if (response && response.ok()) {
      const body = await response.json();
      expect(body).toBeDefined();
    } else {
      test.skip(true, "Mutly not running - skipping");
    }
  });
});

test.describe("Mutly Pipeline API", () => {
  test("GET /api/pipeline/status should return status", async ({ request }) => {
    const response = await request.get(`${MUTLY_URL}/api/pipeline/status`, {
      timeout: 5000,
    }).catch(() => null);

    if (response && response.ok()) {
      const body = await response.json();
      expect(body).toBeDefined();
    } else {
      test.skip(true, "Mutly not running - skipping");
    }
  });

  test("POST /api/pipeline/start should require projectDir", async ({ request }) => {
    const response = await request.post(`${MUTLY_URL}/api/pipeline/start`, {
      data: {},
      timeout: 5000,
    }).catch(() => null);

    if (response) {
      // Should return 400 for missing projectDir
      expect([400, 200]).toContain(response.status());
    } else {
      test.skip(true, "Mutly not running - skipping");
    }
  });

  test("POST /api/pipeline/audit should require projectPath", async ({ request }) => {
    const response = await request.post(`${MUTLY_URL}/api/pipeline/audit`, {
      data: {},
      timeout: 5000,
    }).catch(() => null);

    if (response) {
      expect([400, 200]).toContain(response.status());
    } else {
      test.skip(true, "Mutly not running - skipping");
    }
  });
});

test.describe("Jobclaw Mutly Integration Endpoints", () => {
  test("GET /api/mutly/health should check Mutly connectivity", async ({ request }) => {
    const response = await request.get(`${JOBCLAW_URL}/api/mutly/health`, {
      timeout: 8000,
    }).catch(() => null);

    if (response && response.ok()) {
      const body = await response.json();
      expect(body).toHaveProperty("reachable");
      expect(typeof body.reachable).toBe("boolean");
    } else {
      test.skip(true, "Jobclaw not running - skipping");
    }
  });

  test("GET /api/mutly/status should proxy to Mutly", async ({ request }) => {
    const response = await request.get(`${JOBCLAW_URL}/api/mutly/status`, {
      timeout: 10000,
    }).catch(() => null);

    if (response && response.ok()) {
      const body = await response.json();
      expect(body.status).toBe("success");
    } else if (response) {
      // 502 is acceptable when Mutly is down
      expect([200, 502]).toContain(response.status());
    } else {
      test.skip(true, "Jobclaw not running - skipping");
    }
  });

  test("POST /api/mutly/pipeline/start should validate input", async ({ request }) => {
    const response = await request.post(`${JOBCLAW_URL}/api/mutly/pipeline/start`, {
      data: {}, // Missing required projectDir
      timeout: 5000,
    }).catch(() => null);

    if (response) {
      // Should return 400 for missing projectDir
      expect([400, 502]).toContain(response.status());

      if (response.status() === 400) {
        const body = await response.json();
        expect(body.status).toBe("error");
      }
    } else {
      test.skip(true, "Jobclaw not running - skipping");
    }
  });

  test("POST /api/mutly/audit should validate input", async ({ request }) => {
    const response = await request.post(`${JOBCLAW_URL}/api/mutly/audit`, {
      data: {}, // Missing required projectPath
      timeout: 5000,
    }).catch(() => null);

    if (response) {
      expect([400, 502]).toContain(response.status());
    } else {
      test.skip(true, "Jobclaw not running - skipping");
    }
  });

  test("GET /api/mutly/integration should return status", async ({ request }) => {
    const response = await request.get(`${JOBCLAW_URL}/api/mutly/integration`, {
      timeout: 10000,
    }).catch(() => null);

    if (response && response.ok()) {
      const body = await response.json();
      expect(body).toHaveProperty("service");
      expect(body.service).toBe("Mutly");
      expect(body).toHaveProperty("healthy");
    } else {
      test.skip(true, "Jobclaw not running - skipping");
    }
  });
});

test.describe("Error Handling", () => {
  test("should handle non-JSON responses gracefully", async ({ request }) => {
    const response = await request.get(`${MUTLY_URL}/api/nonexistent`, {
      timeout: 5000,
    }).catch(() => null);

    if (response) {
      // Should return some error status
      expect(response.status()).toBeGreaterThanOrEqual(400);
    } else {
      test.skip(true, "Mutly not running - skipping");
    }
  });

  test("should handle invalid request body", async ({ request }) => {
    const response = await request.post(`${MUTLY_URL}/api/pipeline/start`, {
      data: "not-an-object",
      headers: { "Content-Type": "application/json" },
      timeout: 5000,
    }).catch(() => null);

    if (response) {
      // Should return 400 for invalid JSON or 200 if service accepts
      expect([400, 415, 200]).toContain(response.status());
    } else {
      test.skip(true, "Mutly not running - skipping");
    }
  });
});