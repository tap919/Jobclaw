/**
 * Real Job Source Adapter — Adzuna
 *
 * Wraps the Adzuna Jobs API (https://developer.adzuna.com/docs/search).
 * Fetches real job listings from the U.S. (or any configured country) and
 * normalizes them into the queue format expected by the autopilot engine.
 *
 * Free tier: 250 calls/month. Sign up at https://developer.adzuna.com/
 */

export interface AdzunaJob {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryText: string;
  url: string;
  created: string;
  category?: string;
}

export interface NormalizedJob {
  jobTitle: string;
  companyName: string;
  description: string;
  location: string;
  compensation: string;
  sourceUrl: string;
  sourceType: "adzuna";
  externalId: string;
  postedAt: string;
  category?: string;
}

export interface FetchJobsParams {
  what: string;          // Job title / keyword query
  where: string;         // Location (e.g. "Knightdale, NC" or "remote")
  resultsPerPage?: number;
  page?: number;
  country?: string;      // ISO 3166-1 alpha-2 (e.g. "us", "gb")
  maxDaysOld?: number;   // Filter to jobs posted in the last N days
}

export class AdzunaAdapter {
  private appId: string;
  private appKey: string;
  private baseUrl = "https://api.adzuna.com/v1/api/jobs";

  constructor(appId: string, appKey: string) {
    if (!appId || !appKey) {
      throw new Error("AdzunaAdapter requires both appId and appKey");
    }
    this.appId = appId;
    this.appKey = appKey;
  }

  /**
   * Fetch jobs from Adzuna and return raw results.
   */
  async fetchJobs(params: FetchJobsParams): Promise<AdzunaJob[]> {
    const country = params.country || "us";
    const page = params.page || 1;
    const resultsPerPage = Math.min(params.resultsPerPage || 50, 50);
    const maxDaysOld = params.maxDaysOld || 30;

    const query = new URLSearchParams({
      app_id: this.appId,
      app_key: this.appKey,
      results_per_page: String(resultsPerPage),
      what: params.what,
      where: params.where,
      max_days_old: String(maxDaysOld),
      "content-type": "application/json"
    });

    const url = `${this.baseUrl}/${country}/search/${page}?${query.toString()}`;

    const response = await fetch(url, {
      method: "GET",
      headers: { "Accept": "application/json" }
    });

    if (!response.ok) {
      throw new Error(`Adzuna API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.results || !Array.isArray(data.results)) {
      return [];
    }

    return data.results.map((job: any) => this.normalizeRaw(job));
  }

  /**
   * Map a raw Adzuna result to a cleaner AdzunaJob shape.
   */
  private normalizeRaw(raw: any): AdzunaJob {
    const salaryMin = raw.salary_min ? Math.round(raw.salary_min) : undefined;
    const salaryMax = raw.salary_max ? Math.round(raw.salary_max) : undefined;
    const salaryText = salaryMin && salaryMax
      ? `$${salaryMin.toLocaleString()} - $${salaryMax.toLocaleString()}`
      : salaryMin
        ? `$${salaryMin.toLocaleString()}+`
        : "Salary not disclosed";

    return {
      id: String(raw.id),
      title: raw.title || "Untitled Role",
      company: raw.company?.display_name || "Confidential",
      location: raw.location?.display_name || "Location unspecified",
      description: (raw.description || "").replace(/<[^>]+>/g, "").trim(),
      salaryMin,
      salaryMax,
      salaryText,
      url: raw.redirect_url || "",
      created: raw.created || new Date().toISOString(),
      category: raw.category?.label
    };
  }

  /**
   * Fetch and normalize jobs into the queue-ready format.
   */
  async fetchNormalized(params: FetchJobsParams): Promise<NormalizedJob[]> {
    const raw = await this.fetchJobs(params);
    return raw.map(job => ({
      jobTitle: job.title,
      companyName: job.company,
      description: job.description,
      location: job.location,
      compensation: job.salaryText,
      sourceUrl: job.url,
      sourceType: "adzuna" as const,
      externalId: job.id,
      postedAt: job.created,
      category: job.category
    }));
  }
}
