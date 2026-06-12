import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Import the real module — tests that need fresh module state will use dynamic import
import { AdzunaAdapter } from "../../src/server/lib/realJobAdapter";

function mockOk(data: unknown) {
  return { ok: true, status: 200, json: () => Promise.resolve(data) } as Response;
}

function mockError(status: number, statusText: string) {
  return { ok: false, status, statusText, json: () => Promise.resolve({}) } as Response;
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("realJobAdapter", () => {
  it("throws when constructed without appId", () => {
    expect(() => new AdzunaAdapter("", "key")).toThrow("requires both appId and appKey");
  });

  it("throws when constructed without appKey", () => {
    expect(() => new AdzunaAdapter("id", "")).toThrow("requires both appId and appKey");
  });

  describe("fetchJobs", () => {
    it("returns normalized jobs on successful fetch", async () => {
      const mockData = {
        results: [
          {
            id: "12345",
            title: "Warehouse Supervisor",
            company: { display_name: "Acme Corp" },
            location: { display_name: "Raleigh, NC" },
            description: "<p>Manage warehouse operations</p>",
            salary_min: 45000,
            salary_max: 65000,
            redirect_url: "https://adzuna.com/12345",
            created: "2026-06-01T10:00:00Z",
          },
        ],
      };
      vi.mocked(fetch).mockResolvedValueOnce(mockOk(mockData));

      const adapter = new AdzunaAdapter("test-id", "test-key");
      const jobs = await adapter.fetchJobs({ what: "warehouse", where: "Raleigh" });

      expect(jobs).toHaveLength(1);
      expect(jobs[0].title).toBe("Warehouse Supervisor");
      expect(jobs[0].company).toBe("Acme Corp");
      expect(jobs[0].location).toBe("Raleigh, NC");
      expect(jobs[0].description).not.toContain("<p>");
      expect(jobs[0].salaryMin).toBe(45000);
      expect(jobs[0].salaryMax).toBe(65000);
      expect(jobs[0].salaryText).toBe("$45,000 - $65,000");
      expect(jobs[0].url).toBe("https://adzuna.com/12345");
    });

    it("returns empty array when API response has no results", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(mockOk({ count: 0, results: [] }));

      const adapter = new AdzunaAdapter("test-id", "test-key");
      const jobs = await adapter.fetchJobs({ what: "warehouse", where: "Nowhere" });
      expect(jobs).toEqual([]);
    });

    it("returns empty array when results field is missing", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(mockOk({ count: 0 }));

      const adapter = new AdzunaAdapter("test-id", "test-key");
      const jobs = await adapter.fetchJobs({ what: "test", where: "test" });
      expect(jobs).toEqual([]);
    });

    it("throws on non-ok HTTP response", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(mockError(401, "Unauthorized"));

      const adapter = new AdzunaAdapter("bad-id", "bad-key");
      await expect(adapter.fetchJobs({ what: "test", where: "test" })).rejects.toThrow("Adzuna API error: 401");
    });

    it("throws on rate limit (429)", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(mockError(429, "Too Many Requests"));

      const adapter = new AdzunaAdapter("test-id", "test-key");
      await expect(adapter.fetchJobs({ what: "test", where: "test" })).rejects.toThrow("Adzuna API error: 429");
    });

    it("handles missing optional fields gracefully (schema drift)", async () => {
      const mockData = {
        results: [{ id: "999", title: "General Worker" }],
      };
      vi.mocked(fetch).mockResolvedValueOnce(mockOk(mockData));

      const adapter = new AdzunaAdapter("test-id", "test-key");
      const jobs = await adapter.fetchJobs({ what: "worker", where: "Anywhere" });

      expect(jobs).toHaveLength(1);
      expect(jobs[0].id).toBe("999");
      expect(jobs[0].company).toBe("Confidential");
      expect(jobs[0].location).toBe("Location unspecified");
      expect(jobs[0].salaryText).toBe("Salary not disclosed");
    });

    it("constructs proper URL with query parameters", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(mockOk({ results: [] }));

      const adapter = new AdzunaAdapter("app-id-123", "app-key-456");
      await adapter.fetchJobs({ what: "software engineer", where: "remote", country: "gb", resultsPerPage: 10, maxDaysOld: 7 });

      const calledUrl = vi.mocked(fetch).mock.calls[0][0] as string;
      expect(calledUrl).toContain("app_id=app-id-123");
      expect(calledUrl).toContain("app_key=app-key-456");
      expect(calledUrl).toContain("what=software+engineer");
      expect(calledUrl).toContain("where=remote");
      expect(calledUrl).toContain("results_per_page=10");
      expect(calledUrl).toContain("max_days_old=7");
      expect(calledUrl).toContain("/gb/search/1");
    });

    it("caps resultsPerPage at 50", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(mockOk({ results: [] }));

      const adapter = new AdzunaAdapter("id", "key");
      await adapter.fetchJobs({ what: "test", where: "test", resultsPerPage: 999 });
      const calledUrl = vi.mocked(fetch).mock.calls[0][0] as string;
      expect(calledUrl).toContain("results_per_page=50");
    });
  });

  describe("fetchNormalized", () => {
    it("returns NormalizedJob array with correct shape", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(mockOk({
        results: [
          {
            id: "555",
            title: "DevOps Engineer",
            company: { display_name: "Cloud Inc" },
            location: { display_name: "Austin, TX" },
            description: "Kubernetes CI/CD",
            salary_min: 100000,
            redirect_url: "https://adzuna.com/555",
            created: "2026-06-05T00:00:00Z",
          },
        ],
      }));

      const adapter = new AdzunaAdapter("id", "key");
      const normalized = await adapter.fetchNormalized({ what: "devops", where: "Austin" });

      expect(normalized).toHaveLength(1);
      expect(normalized[0]).toMatchObject({
        jobTitle: "DevOps Engineer",
        companyName: "Cloud Inc",
        location: "Austin, TX",
        sourceType: "adzuna",
        externalId: "555",
      });
      expect(normalized[0].compensation).toBeDefined();
      expect(normalized[0].sourceUrl).toBeDefined();
      expect(normalized[0].postedAt).toBeDefined();
    });
  });
});
