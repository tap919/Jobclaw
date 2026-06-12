import { describe, it, expect } from "vitest";
import type {
  Profile,
  JobMatch,
  Application,
  QueueItem,
  AutopilotRuleSet,
  MatchBreakdown,
  ApplicationTimelineItem,
  AuditMessage,
  SectorPack,
  AnalyticsStats,
  ResumeVariant,
} from "../../src/types";

function createMinimalProfile(): Profile {
  return {
    contactInfo: {
      fullName: "Test User",
      email: "test@example.com",
      phone: "555-0100",
      location: "Raleigh, NC",
      linkedin: "",
      github: "",
      website: "",
    },
    headline: "Warehouse Operations Professional",
    professionalSummary: "Experienced warehouse operator.",
    skills: ["stocking", "forklift"],
    certifications: [],
    experiences: [],
    education: [],
    gapExplanations: [],
    targetSectors: [],
    targetRoles: ["Warehouse Supervisor"],
    salaryTarget: "50000-70000",
    workAuthorization: "US Citizen",
  };
}

const validStatuses = ["Shortlisted", "Applied", "Interviewing", "Offer", "Archived", "Rejected"] as const;
const validSeniorities = ["Junior", "Mid", "Senior", "Lead", "Executive"] as const;
const validQueueStates = ["discovered", "normalized", "scored", "shortlisted", "prepared", "validation_passed", "submitted", "confirmed", "tracked", "error"] as const;
const validAuditTypes = ["gap", "consistency", "weak-bullet", "metric"] as const;
const validAuditSeverities = ["high", "medium", "low"] as const;

describe("types contract", () => {
  describe("Profile", () => {
    it("serializes and deserializes without data loss", () => {
      const profile = createMinimalProfile();
      const json = JSON.stringify(profile);
      const parsed = JSON.parse(json) as Profile;
      expect(parsed.contactInfo.fullName).toBe("Test User");
      expect(parsed.skills).toEqual(["stocking", "forklift"]);
      expect(parsed.targetRoles).toEqual(["Warehouse Supervisor"]);
      expect(parsed.salaryTarget).toBe("50000-70000");
    });

    it("round-trips optional fields as null when absent", () => {
      const profile = createMinimalProfile();
      const json = JSON.stringify(profile);
      const parsed = JSON.parse(json);
      // Optional fields that were empty arrays should stay as arrays
      expect(Array.isArray(parsed.experiences)).toBe(true);
      expect(Array.isArray(parsed.education)).toBe(true);
      expect(Array.isArray(parsed.gapExplanations)).toBe(true);
    });
  });

  describe("JobMatch", () => {
    it("serializes all fields correctly", () => {
      const breakdown: MatchBreakdown = {
        keywordOverlapScore: 85,
        requiredOverlapScore: 70,
        seniorityFitScore: 90,
        transferableOverlapScore: 60,
        salaryAlignmentScore: 100,
      };

      const job: JobMatch = {
        id: "job-001",
        company: "TestCorp",
        title: "Warehouse Lead",
        description: "Manage inventory and team.",
        location: "Raleigh, NC",
        salary: "$55,000 - $75,000",
        requiredSkills: ["inventory management", "team leadership"],
        preferredSkills: ["SAP"],
        seniority: "Mid",
        source: "adzuna",
        sourceUrl: "https://example.com/job/001",
        fitScore: 82,
        breakdown,
        ingestedAt: "2026-06-01T00:00:00Z",
        freshnessScore: 90,
        isRecommended: true,
      };

      const json = JSON.stringify(job);
      const parsed = JSON.parse(json) as JobMatch;
      expect(parsed.id).toBe("job-001");
      expect(parsed.fitScore).toBe(82);
      expect(parsed.breakdown.keywordOverlapScore).toBe(85);
      expect(parsed.requiredSkills).toHaveLength(2);
      expect(validSeniorities.includes(parsed.seniority as typeof validSeniorities[number])).toBe(true);
    });
  });

  describe("Application", () => {
    it("serializes all status fields correctly", () => {
      const app: Application = {
        id: "app-001",
        jobId: "job-001",
        jobTitle: "Warehouse Lead",
        companyName: "TestCorp",
        status: "Applied",
        resumeVariantId: "variant-warehouse",
        coverLetter: "Dear Hiring Manager...",
        outreachNotes: "Sent via LinkedIn",
        verificationAuditPassed: true,
        approvalPolicyStatus: "Ready for Review",
        interviewStages: [],
        timeline: [],
      };

      const json = JSON.stringify(app);
      const parsed = JSON.parse(json) as Application;
      expect(parsed.id).toBe("app-001");
      expect(parsed.status).toBe("Applied");
      expect(validStatuses.includes(parsed.status as typeof validStatuses[number])).toBe(true);
      expect(parsed.verificationAuditPassed).toBe(true);
    });

    it("allows optional recruiter fields", () => {
      const app: Application = {
        id: "app-002",
        jobId: "job-002",
        jobTitle: "Test",
        companyName: "TestCo",
        status: "Interviewing",
        resumeVariantId: "variant-general",
        coverLetter: "",
        outreachNotes: "",
        verificationAuditPassed: false,
        approvalPolicyStatus: "Draft",
        interviewStages: ["Phone Screen", "On-site"],
        timeline: [
          { id: "tl-1", status: "Applied", note: "Applied online", timestamp: "2026-06-01T00:00:00Z" },
        ],
        recruiterName: "Jane Doe",
        recruiterEmail: "jane@testco.com",
        nextFollowUpDate: "2026-06-15T00:00:00Z",
      };

      const json = JSON.stringify(app);
      const parsed = JSON.parse(json) as Application;
      expect(parsed.recruiterName).toBe("Jane Doe");
      expect(parsed.interviewStages).toHaveLength(2);
      expect(parsed.timeline).toHaveLength(1);
    });
  });

  describe("QueueItem", () => {
    it("serializes full queue item with error state", () => {
      const item: QueueItem = {
        id: "q-001",
        jobTitle: "Warehouse Associate",
        companyName: "BigBox Inc",
        fitScore: 75,
        seniority: "Mid",
        compensation: "$15/hr",
        state: "error",
        errorType: "captcha_blocked",
        errorMessage: "CAPTCHA encountered during submission",
        resumeVariant: "variant-warehouse",
        lastActionDate: "2026-06-01T00:00:00Z",
        logs: ["Discovered", "Scored 75%"],
        sourceType: "adzuna",
        sourceUrl: "https://adzuna.com/999",
      };

      const json = JSON.stringify(item);
      const parsed = JSON.parse(json) as QueueItem;
      expect(parsed.state).toBe("error");
      expect(validQueueStates.includes(parsed.state as typeof validQueueStates[number])).toBe(true);
      expect(parsed.errorType).toBe("captcha_blocked");
      expect(parsed.sourceType).toBe("adzuna");
    });
  });

  describe("AutopilotRuleSet", () => {
    it("serializes all numeric rules", () => {
      const rules: AutopilotRuleSet = {
        minFitScore: 55,
        compensationFloor: 40000,
        remotePreference: "hybrid",
        maxCommute: 30,
        applicationsPerHourLimit: 5,
        applicationsPerDayLimit: 20,
        neverApplySameRequisition: true,
        excludeRejectedCompaniesLast90days: true,
        excludeMissingCertifications: false,
      };

      const json = JSON.stringify(rules);
      const parsed = JSON.parse(json) as AutopilotRuleSet;
      expect(parsed.minFitScore).toBe(55);
      expect(parsed.compensationFloor).toBe(40000);
      expect(typeof parsed.neverApplySameRequisition).toBe("boolean");
    });
  });

  describe("AuditMessage", () => {
    it("serializes all audit variants", () => {
      const messages: AuditMessage[] = [
        { type: "gap", severity: "high", message: "Employment gap", suggestion: "Add explanation", targetId: "exp-1" },
        { type: "consistency", severity: "medium", message: "Date mismatch", suggestion: "Fix dates" },
        { type: "weak-bullet", severity: "low", message: "Missing metrics", suggestion: "Add numbers" },
        { type: "metric", severity: "high", message: "Unrealistic claim", suggestion: "Verify" },
      ];

      for (const msg of messages) {
        const json = JSON.stringify(msg);
        const parsed = JSON.parse(json) as AuditMessage;
        expect(validAuditTypes.includes(parsed.type as typeof validAuditTypes[number])).toBe(true);
        expect(validAuditSeverities.includes(parsed.severity as typeof validAuditSeverities[number])).toBe(true);
      }
    });
  });

  describe("SectorPack", () => {
    it("serializes all fields", () => {
      const pack: SectorPack = {
        id: "warehouse",
        name: "Warehouse & Logistics",
        shortDescription: "Jobs in distribution centers",
        keywords: ["forklift", "inventory"],
        templateResume: "# Resume",
        exampleAtsBullets: ["Reduced picking time 20%"],
        growthStats: "7% projected growth",
      };

      const json = JSON.stringify(pack);
      const parsed = JSON.parse(json) as SectorPack;
      expect(parsed.id).toBe("warehouse");
      expect(parsed.keywords).toContain("forklift");
      expect(parsed.exampleAtsBullets).toHaveLength(1);
    });
  });

  describe("ResumeVariant", () => {
    it("serializes with optional coverLetterTemplate", () => {
      const variant: ResumeVariant = {
        id: "v-wh",
        name: "Warehouse Focus",
        sector: "warehouse",
        seniority: "Mid",
        type: "ATS",
        excludedExperienceIds: [],
        customBullets: {},
        updatedAt: "2026-06-01T00:00:00Z",
        coverLetterTemplate: "Dear {name}, I have {years} years of experience...",
      };

      const json = JSON.stringify(variant);
      const parsed = JSON.parse(json) as ResumeVariant;
      expect(parsed.seniority).toBe("Mid");
      expect(validSeniorities.includes(parsed.seniority as typeof validSeniorities[number])).toBe(true);
      expect(parsed.coverLetterTemplate).toContain("Dear {name}");
    });
  });

  describe("AnalyticsStats", () => {
    it("serializes all metrics", () => {
      const stats: AnalyticsStats = {
        applicationCount: 50,
        responseRate: 30,
        interviewRate: 15,
        offerRate: 5,
        activePipelines: 3,
        averageTailoringTimeMin: 12,
        conversionSeries: [
          { period: "2026-05", applied: 20, interviews: 6, offers: 2 },
        ],
        bulletPerformers: [
          { bulletText: "Reduced costs 20%", responseRate: 40, sector: "warehouse" },
        ],
        sourcePerformance: [
          { source: "adzuna", volume: 30, responseRate: 25 },
        ],
      };

      const json = JSON.stringify(stats);
      const parsed = JSON.parse(json) as AnalyticsStats;
      expect(parsed.applicationCount).toBe(50);
      expect(parsed.responseRate).toBe(30);
      expect(parsed.conversionSeries).toHaveLength(1);
      expect(parsed.bulletPerformers).toHaveLength(1);
      expect(parsed.sourcePerformance).toHaveLength(1);
    });
  });
});
