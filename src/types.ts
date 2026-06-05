export interface ContactInfo {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  github: string;
  website: string;
}

export interface BulletPoint {
  id: string;
  text: string;
  metrics: string; // Measured impact metrics
  traceableEvidence: string; // Links/sources backing this claim
  isAIRevised?: boolean;
  score?: number; // quality score 0-100
}

export interface Experience {
  id: string;
  company: string;
  title: string;
  department?: string;
  location: string;
  startDate: string; // YYYY-MM
  endDate: string; // YYYY-MM or 'Present'
  isCurrent: boolean;
  employmentType: 'Full-time' | 'Part-time' | 'Contract' | 'Freelance' | 'Internship';
  description: string;
  bullets: BulletPoint[];
  skillsUsed: string[];
  teamSize?: string;
  budgetScope?: string;
  managerScope?: string;
}

export interface Education {
  id: string;
  institution: string;
  degree: string;
  fieldOfStudy: string;
  startDate: string;
  endDate: string;
  grade?: string;
  activities?: string;
}

export interface GapExplanation {
  id: string;
  startDate: string;
  endDate: string;
  reason: string; // Explaining why the gap exists (e.g., sabbatical, personal upskilling)
  narrativeText: string; // Polished recruiter-facing text
  atsApproved: boolean;
}

export interface Profile {
  contactInfo: ContactInfo;
  headline: string;
  professionalSummary: string;
  skills: string[];
  certifications: string[];
  experiences: Experience[];
  education: Education[];
  gapExplanations: GapExplanation[];
  targetSectors: string[];
  targetRoles: string[];
  salaryTarget: string;
  workAuthorization: string;
}

export interface ResumeVariant {
  id: string;
  name: string;
  sector: string;
  seniority: 'Junior' | 'Mid' | 'Senior' | 'Lead' | 'Executive';
  type: 'ATS' | 'Premium';
  customTitle?: string;
  customSummary?: string;
  excludedExperienceIds: string[];
  customBullets: Record<string, string[]>; // expId -> bullet texts
  coverLetterTemplate?: string;
  outreachTemplate?: string;
  updatedAt: string;
}

export interface MatchBreakdown {
  keywordOverlapScore: number; // 0-100
  requiredOverlapScore: number; // 0-100
  seniorityFitScore: number; // 0-100
  transferableOverlapScore: number; // 0-100
  salaryAlignmentScore: number; // 0-100
}

export interface JobMatch {
  id: string;
  company: string;
  title: string;
  description: string;
  location: string;
  salary: string;
  requiredSkills: string[];
  preferredSkills: string[];
  seniority: string;
  source: string;
  sourceUrl: string;
  fitScore: number; // 0-100
  breakdown: MatchBreakdown;
  ingestedAt: string;
  freshnessScore: number; // 0-100
  isRecommended: boolean;
  isDraftGenerated?: boolean;
}

export interface ApplicationTimelineItem {
  id: string;
  status: 'Shortlisted' | 'Applied' | 'Interviewing' | 'Offer' | 'Archived' | 'Rejected';
  note: string;
  timestamp: string;
}

export interface Application {
  id: string;
  jobId: string;
  jobTitle: string;
  companyName: string;
  status: 'Shortlisted' | 'Applied' | 'Interviewing' | 'Offer' | 'Archived' | 'Rejected';
  resumeVariantId: string;
  coverLetter: string;
  outreachNotes: string;
  verificationAuditPassed: boolean;
  approvalPolicyStatus: 'Draft' | 'Ready for Review' | 'Pre-Staged' | 'Approved' | 'Sent';
  submittedAt?: string;
  recruiterName?: string;
  recruiterEmail?: string;
  interviewStages: string[];
  nextFollowUpDate?: string;
  timeline: ApplicationTimelineItem[];
  notes?: string;
}

export interface AuditMessage {
  type: 'gap' | 'consistency' | 'weak-bullet' | 'metric';
  severity: 'high' | 'medium' | 'low';
  message: string;
  suggestion: string;
  targetId?: string; // expId or bulletId
}

export interface SectorPack {
  id: string;
  name: string;
  shortDescription: string;
  keywords: string[];
  templateResume: string;
  exampleAtsBullets: string[];
  growthStats: string;
}

export interface AutopilotRuleSet {
  minFitScore: number;
  compensationFloor: number;
  remotePreference: string;
  maxCommute: number;
  applicationsPerHourLimit: number;
  applicationsPerDayLimit: number;
  neverApplySameRequisition: boolean;
  excludeRejectedCompaniesLast90days: boolean;
  excludeMissingCertifications: boolean;
}

export interface AutopilotSkillRegistry {
  profileSkills: {
    workAuthNeeded: string;
    noticePeriod: string;
    veteranChoice: string;
    consentToBgCheck: string;
  };
  synonymDictionary: Record<string, string>;
  screeningQA: Record<string, string>;
  atsSelectors: Record<string, { selector: string; description: string }>;
}

export interface QueueItem {
  id: string;
  jobTitle: string;
  companyName: string;
  fitScore: number;
  seniority: string;
  compensation: string;
  state: 'discovered' | 'normalized' | 'scored' | 'shortlisted' | 'prepared' | 'validation_passed' | 'submitted' | 'confirmed' | 'tracked' | 'error';
  errorType?: 'duplicate' | 'requires_user_input' | 'unsupported_platform' | 'captcha_blocked' | 'document_missing' | 'selector_failure' | 'policy_blocked' | 'selector_changed' | 'captcha_encountered' | 'missing_answer' | 'unsupported_field' | 'manual_review_required';
  errorMessage?: string;
  resumeVariant: string;
  lastActionDate: string;
  logs: string[];
  selectorSnapshot?: string;
  formPayload?: Record<string, unknown>;
  externalId?: string;
  sourceType?: 'adzuna' | 'jooble' | 'manual' | 'mock';
  sourceUrl?: string;
}

export interface AutopilotLog {
  id: string;
  timestamp: string;
  cron: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  type: 'deterministic' | 'llm-assist';
}

export interface AnalyticsStats {
  applicationCount: number;
  responseRate: number; // %
  interviewRate: number; // %
  offerRate: number; // %
  activePipelines: number;
  averageTailoringTimeMin: number;
  conversionSeries: { period: string; applied: number; interviews: number; offers: number }[];
  bulletPerformers: { bulletText: string; responseRate: number; sector: string }[];
  sourcePerformance: { source: string; volume: number; responseRate: number }[];
}
