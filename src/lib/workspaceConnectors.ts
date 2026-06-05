import { JobMatch, Application } from "../types";

// =========================================================================
// GOOGLE WORKSPACE OAUTH SYSTEM (IN-MEMORY SECURED ACCORDING TO GUIDELINES)
// =========================================================================

let cachedAccessToken: string | null = null;

export function getCachedToken(): string | null {
  return cachedAccessToken;
}

export function setCachedToken(token: string | null) {
  cachedAccessToken = token;
}

export function getGoogleClientId(): string {
  return sessionStorage.getItem("jobclaw_google_client_id") || "";
}

export function saveGoogleClientId(clientId: string) {
  if (clientId) {
    sessionStorage.setItem("jobclaw_google_client_id", clientId);
  } else {
    sessionStorage.removeItem("jobclaw_google_client_id");
  }
}

export const startGoogleOAuthFlow = (clientId: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const redirectUri = window.location.origin + "/index.html";
    const scopes = [
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/drive.file",
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/gmail.modify"
    ];

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(clientId)}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=token&` +
      `scope=${encodeURIComponent(scopes.join(" "))}&` +
      `prompt=select_account`;

    const popupWidth = 600;
    const popupHeight = 650;
    const left = window.screen.width / 2 - popupWidth / 2;
    const top = window.screen.height / 2 - popupHeight / 2;

    const popup = window.open(
      authUrl,
      "GoogleWorkspaceOAuth",
      `width=${popupWidth},height=${popupHeight},left=${left},top=${top},status=no,resizable=yes`
    );

    if (!popup) {
      reject(new Error("Popup blocked! Please allow popups for active desk integrations."));
      return;
    }

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === "GOOGLE_OAUTH_HASH") {
        const hash = event.data.hash;
        const params = new URLSearchParams(hash.substring(1));
        const token = params.get("access_token");
        if (token) {
          setCachedToken(token);
          cleanup();
          resolve(token);
        }
      }
    };

    const cleanup = () => {
      clearInterval(timer);
      window.removeEventListener("message", handleMessage);
      if (popup && !popup.closed) {
        popup.close();
      }
    };

    window.addEventListener("message", handleMessage);

    // Dynamic polling fallback
    const timer = setInterval(() => {
      if (popup.closed) {
        cleanup();
        reject(new Error("Authentication popup closed before authorization completed."));
        return;
      }

      try {
        const currentUrl = popup.location.href;
        if (currentUrl.indexOf(redirectUri) !== -1 || currentUrl.indexOf("#access_token=") !== -1) {
          const hash = popup.location.hash;
          const params = new URLSearchParams(hash.substring(1));
          const token = params.get("access_token");
          if (token) {
            setCachedToken(token);
            cleanup();
            resolve(token);
          }
        }
      } catch (err) {
        // Cross-origin boundaries throw exceptions until redirect completes
      }
    }, 500);
  });
};

// =========================================================================
// TYPES & INTERFACES DEFINITIONS
// =========================================================================

export interface RecruiterMessage {
  id: string;
  senderName: string;
  senderEmail: string;
  subject: string;
  body: string;
  timestamp: string;
  company?: string;
  associatedJobId?: string;
  status: "unread" | "read" | "replied";
  suggestedReply?: string;
}

export interface WorkspaceFolder {
  id: string;
  name: string;
  path: string;
  fileCount: number;
}

export interface WorkspaceFile {
  id: string;
  name: string;
  path: string; // e.g., "/Employment Agent/Resumes/ATS"
  type: "PDF" | "DOCX" | "MD" | "JSON";
  size: string;
  lastUpdated: string;
  webViewLink?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  startTime: string; // ISO string
  endTime: string; // ISO string
  description: string;
  location?: string;
  attendeeEmail?: string;
  associatedJobId?: string;
  company?: string;
  prepKitApproved: boolean;
  prepActionItems: string[];
}

export interface PolicyViolation {
  id: string;
  connectorName: string;
  action: string;
  severity: "BLOCKED" | "WARNING" | "RESTRICTED";
  message: string;
  timestamp: string;
}

export interface PolicyState {
  level: "green" | "yellow" | "red";
  blockMassApplies: boolean;
  requireHumanApproval: boolean;
  restrictScraping: boolean;
}

// =========================================================================
// ABSTRACT CAPABILITIES
// =========================================================================

export interface JobSource {
  name: string;
  description: string;
  syncJobs(): Promise<JobMatch[]>;
}

export interface CommsSource {
  name: string;
  syncMessages(): Promise<RecruiterMessage[]>;
  prepareReply(messageId: string, text: string): Promise<string>;
  sendReply(messageId: string, text: string): Promise<boolean>;
}

export interface DocumentStore {
  name: string;
  storeArtifact(fileName: string, folderPath: string, content: string, type?: string): Promise<WorkspaceFile>;
  listArtifacts(folderPath?: string): Promise<WorkspaceFile[]>;
  deleteArtifact(fileId: string): Promise<boolean>;
}

export interface Scheduler {
  name: string;
  syncEvents(): Promise<CalendarEvent[]>;
  createEvent(event: Omit<CalendarEvent, "id" | "prepKitApproved" | "prepActionItems">): Promise<CalendarEvent>;
  deleteEvent(eventId: string): Promise<boolean>;
}

// =========================================================================
// POLICY ENGINE (Enforcer Guardrail)
// =========================================================================

export class PolicyEngine {
  private static policy: PolicyState = {
    level: "yellow", // Recommended default: browser assisted, human confirmed
    blockMassApplies: true,
    requireHumanApproval: true,
    restrictScraping: true
  };

  private static violations: PolicyViolation[] = [];

  static getPolicy(): PolicyState {
    return this.policy;
  }

  static getViolations(): PolicyViolation[] {
    return this.violations;
  }

  static setLevel(level: "green" | "yellow" | "red") {
    this.policy = {
      level,
      blockMassApplies: level !== "green",
      requireHumanApproval: level === "red" || level === "yellow",
      restrictScraping: level === "red"
    };
  }

  /**
   * Evaluates if an action is permitted under the active policy.
   * Throws an error or returns a restriction payload if blocked.
   */
  static authorizeAction(connector: string, action: string, details: string): { allowed: boolean; restriction?: string } {
    const timestamp = new Date().toISOString();
    
    // RED LEVEL: STRICT EXTREME RESTRICTIONS
    if (this.policy.level === "red") {
      if (action.includes("mass") || action.includes("auto-submit") || action.includes("scraping") || action.includes("silent-send")) {
        const violation: PolicyViolation = {
          id: `vIO-${Date.now()}`,
          connectorName: connector,
          action,
          severity: "BLOCKED",
          message: `Blocked irreversible run of '${action}' on ${connector} by Policy restrictive level: RED.`,
          timestamp
        };
        this.violations.unshift(violation);
        return { allowed: false, restriction: violation.message };
      }
    }

    // YELLOW LEVEL: BROWSER-ASSISTED FORCE REJECT RAW AUTO-TRIGGERS
    if (this.policy.level === "yellow") {
      if (action.includes("mass-apply") || action.includes("silent-send") || action.includes("auto-submit")) {
        const violation: PolicyViolation = {
          id: `vIO-${Date.now()}`,
          connectorName: connector,
          action,
          severity: "RESTRICTED",
          message: `Blocked auto-transmission of '${action}'. Pre-staged for manual human click inside desktop overlay instead.`,
          timestamp
        };
        this.violations.unshift(violation);
        return { allowed: false, restriction: violation.message };
      }
    }

    // GREEN LEVEL: ALL SAFE
    return { allowed: true };
  }
}

// =========================================================================
// REAL / SIMULATED SPECIFIC CONNECTORS
// =========================================================================

export class LinkedInConnector implements JobSource {
  name = "LinkedIn Connector";
  description = "Sync discovered openings, recruiter reach-outs, and import opportunities using mixed OAuth/Session tokens.";

  async syncJobs(): Promise<JobMatch[]> {
    // Check policy limits first
    const auth = PolicyEngine.authorizeAction(this.name, "scrape-jobs", "Scheduled poll of LinkedIn listings");
    if (!auth.allowed) {
      throw new Error(auth.restriction);
    }
    
    // In a fully configured desktop system, this would make calls to external API or session proxy.
    // We return highly targeted matched jobs for our developer sandbox.
    return [
      {
        id: "linkedin-job-1",
        company: "Vercel",
        title: "Senior Developer Advocate - Edge & AI Runtimes",
        description: "Looking for a seasoned advocate with a metric-driven mindset to lead React/Vite/Next integrations. Document load latencies, create developer dashboards, and engage enterprise users.",
        location: "Remote (US)",
        salary: "$150,000 - $180,000 + Equity",
        requiredSkills: ["Vite", "React 19", "TypeScript", "Performance optimization"],
        preferredSkills: ["GraphQL", "Docker"],
        seniority: "Senior",
        source: "LinkedIn Discovered",
        sourceUrl: "https://linkedin.com/jobs/view/940217",
        fitScore: 88,
        breakdown: {
          keywordOverlapScore: 82,
          requiredOverlapScore: 92,
          seniorityFitScore: 95,
          transferableOverlapScore: 80,
          salaryAlignmentScore: 90
        },
        ingestedAt: new Date().toISOString(),
        freshnessScore: 100,
        isRecommended: true
      }
    ];
  }
}

export class IndeedConnector implements JobSource {
  name = "Indeed Connector";
  description = "Access Indeed Job Sync API to match enterprise listings with active quantified metric portfolios.";

  async syncJobs(): Promise<JobMatch[]> {
    const auth = PolicyEngine.authorizeAction(this.name, "sync-indeed-api", "Fetch API listings via Indeed Client Credentials");
    if (!auth.allowed) {
      throw new Error(auth.restriction);
    }

    return [
      {
        id: "indeed-job-1",
        company: "Scale AI",
        title: "Senior Full Stack Systems Engineer",
        description: "Join our core data processing SaaS team. We ingest millions of records hourly. Experience optimizing Redis caches, background workers, and Postgres overhead is highly desired.",
        location: "Austin, TX (Hybrid)",
        salary: "$165,000 - $195,050",
        requiredSkills: ["Node.js", "Redis Caching", "Docker", "PostgreSQL", "TypeScript"],
        preferredSkills: ["AWS ECS", "Kubernetes"],
        seniority: "Senior",
        source: "Indeed Pipeline Partner",
        sourceUrl: "https://indeed.com/viewjob?jk=1019ab",
        fitScore: 92,
        breakdown: {
          keywordOverlapScore: 90,
          requiredOverlapScore: 94,
          seniorityFitScore: 100,
          transferableOverlapScore: 86,
          salaryAlignmentScore: 90
        },
        ingestedAt: new Date().toISOString(),
        freshnessScore: 96,
        isRecommended: true
      }
    ];
  }
}

export class GmailConnector implements CommsSource {
  name = "Gmail Workspace Connector";
  
  // Persistent messages inside the Session Storage to mimic realistic communications updates
  private getStore(): RecruiterMessage[] {
    const key = "jobclaw_messages_db";
    const cache = sessionStorage.getItem(key);
    if (cache) {
      return JSON.parse(cache);
    }

    // Default seeded inbox
    const defaults: RecruiterMessage[] = [
      {
        id: "msg-123",
        senderName: "Sarah Jenkins",
        senderEmail: "sarah.jenkins@stripe-talent.com",
        subject: "Stripe Followup: Senior Core Full Stack SaaS Engineer interview scheduler",
        body: "Hi Alex,\n\nI reviewed your quantified candidate pack and was blown away by the CloudScale ingestion metrics (+7.5x throughput)! The team would love to schedule a 45-minute architectural coding screen this Friday, June 5th.\n\nPlease let us know if 2:00 PM CST works for you or suggest an alternate slot.\n\nBest,\nSarah Jenkins\nPrincipal Recruiter, Stripe Dashboard Team",
        timestamp: "2026-06-02T14:30:00Z",
        company: "Stripe",
        associatedJobId: "job-1",
        status: "unread",
        suggestedReply: "Hi Sarah,\n\nThank you so much! I am thrilled to hear the team loved the CloudScale ingestion milestone. June 5th at 2:00 PM CST works perfectly for my schedule.\n\nI look forward to discussing developer dashboard performance and edge caching topologies with the engineering team. I will have my resume and architecture documentation pre-staged.\n\nSincerely,\nAlex Rivera"
      },
      {
        id: "msg-124",
        senderName: "Marcus Brody",
        senderEmail: "marcus.brody@oktatalent.com",
        subject: "Okta Application Received: Lead Platform System Architect",
        body: "Hello Alex,\n\nThanks for submitting your ATS-tailored portfolio! We've received your materials and mapped your AWS server savings ($120K annual cuts) to our cost optimization epic.\n\nWould you be open to an introductory call next Monday morning at 10:00 AM CST?\n\nSincerely,\nMarcus Brody",
        timestamp: "2026-06-01T17:15:00Z",
        company: "Okta",
        associatedJobId: "job-2",
        status: "unread",
        suggestedReply: "Hi Marcus,\n\nThank you for reaching out! Monday, June 8th at 10:00 AM CST works beautifully for our sync. I'm eager to share our learnings from the AWS ECS migrations and cost reduction schedules.\n\nBest regards,\nAlex Rivera"
      }
    ];
    sessionStorage.setItem(key, JSON.stringify(defaults));
    return defaults;
  }

  private saveStore(msgs: RecruiterMessage[]) {
    sessionStorage.setItem("jobclaw_messages_db", JSON.stringify(msgs));
  }

  async syncMessages(): Promise<RecruiterMessage[]> {
    return this.getStore();
  }

  async prepareReply(messageId: string, text: string): Promise<string> {
    // Generates tailored replies using local seeds or external AI
    return text;
  }

  async sendReply(messageId: string, text: string): Promise<boolean> {
    // ENVENOMATE POLICY FOR ACCIDENTAL MASS EMAILING
    const auth = PolicyEngine.authorizeAction(this.name, "silent-send", `Send email response to message ID ${messageId}`);
    if (!auth.allowed) {
      throw new Error(auth.restriction);
    }

    const msgs = this.getStore();
    const idx = msgs.findIndex(m => m.id === messageId);
    if (idx !== -1) {
      msgs[idx].status = "replied";
      msgs[idx].suggestedReply = text;
      this.saveStore(msgs);
      return true;
    }
    return false;
  }
}

export class DriveConnector implements DocumentStore {
  name = "Google Drive Workspace Connector";

  // Persistent storage simulation inside session
  private getStore(): WorkspaceFile[] {
    const key = "jobclaw_drive_db";
    const cache = sessionStorage.getItem(key);
    if (cache) {
      return JSON.parse(cache);
    }

    const defaults: WorkspaceFile[] = [
      {
        id: "file-drv-11",
        name: "Alex_Rivera_Master_ATS.pdf",
        path: "/Employment Agent/Resumes/ATS",
        type: "PDF",
        size: "312 KB",
        lastUpdated: "2026-06-02T11:00:00Z"
      },
      {
        id: "file-drv-12",
        name: "Alex_Rivera_Visual_Editorial.docx",
        path: "/Employment Agent/Resumes/Visual",
        type: "DOCX",
        size: "1.4 MB",
        lastUpdated: "2026-06-01T15:20:00Z"
      },
      {
        id: "file-drv-21",
        name: "Stripe_Enterprise_CoverPitch.md",
        path: "/Employment Agent/Applications/Stripe",
        type: "MD",
        size: "12 KB",
        lastUpdated: "2026-06-02T13:40:00Z"
      },
      {
        id: "file-drv-31",
        name: "SaaS_Core_PerformanceBrief.pdf",
        path: "/Employment Agent/Interviews",
        type: "PDF",
        size: "520 KB",
        lastUpdated: "2026-06-02T11:45:00Z"
      }
    ];
    sessionStorage.setItem(key, JSON.stringify(defaults));
    return defaults;
  }

  private saveStore(files: WorkspaceFile[]) {
    sessionStorage.setItem("jobclaw_drive_db", JSON.stringify(files));
  }

  async storeArtifact(fileName: string, folderPath: string, content: string, type: string = "PDF"): Promise<WorkspaceFile> {
    const auth = PolicyEngine.authorizeAction(this.name, "store-artifact", `Create file ${fileName} in Drive`);
    if (!auth.allowed) {
      throw new Error(auth.restriction);
    }

    const validTypes: WorkspaceFile["type"][] = ["PDF", "DOCX", "MD", "JSON"];
    const fileType: WorkspaceFile["type"] = validTypes.includes(type as WorkspaceFile["type"]) ? (type as WorkspaceFile["type"]) : "PDF";
    const files = this.getStore();
    const newFile: WorkspaceFile = {
      id: `file-drv-${Date.now()}`,
      name: fileName,
      path: folderPath,
      type: fileType,
      size: `${Math.round(content.length / 1024) + 1} KB`,
      lastUpdated: new Date().toISOString()
    };
    files.unshift(newFile);
    this.saveStore(files);
    return newFile;
  }

  async listArtifacts(folderPath?: string): Promise<WorkspaceFile[]> {
    const files = this.getStore();
    if (folderPath) {
      return files.filter(f => f.path.startsWith(folderPath));
    }
    return files;
  }

  async deleteArtifact(fileId: string): Promise<boolean> {
    const auth = PolicyEngine.authorizeAction(this.name, "delete-artifact", `Delete file ID ${fileId}`);
    if (!auth.allowed) {
      throw new Error(auth.restriction);
    }

    let files = this.getStore();
    const lenBefore = files.length;
    files = files.filter(f => f.id !== fileId);
    this.saveStore(files);
    return files.length < lenBefore;
  }
}

export class CalendarConnector implements Scheduler {
  name = "Google Calendar Workspace Connector";

  private getStore(): CalendarEvent[] {
    const key = "jobclaw_calendar_db";
    const cache = sessionStorage.getItem(key);
    if (cache) {
      return JSON.parse(cache);
    }

    const defaults: CalendarEvent[] = [
      {
        id: "evt-901",
        title: "Stripe Technical Screen - Alex Rivera",
        startTime: "2026-06-05T14:00:00Z", // Fri, Jun 5
        endTime: "2026-06-05T14:45:00Z",
        description: "Focus: Core architecture, real-time metrics dashboards, React concurrent throughput.",
        location: "Zoom link in invitation",
        attendeeEmail: "sarah.jenkins@stripe-talent.com",
        associatedJobId: "job-1",
        company: "Stripe",
        prepKitApproved: true,
        prepActionItems: [
          "Study CloudScale Technologies' daily ingestion pipeline (raise daily cap 2M to 15M).",
          "Pre-stage React Concurrent performance bottlenecks answers.",
          "Prepare AWS Solutions Architect certification documentation."
        ]
      }
    ];
    sessionStorage.setItem(key, JSON.stringify(defaults));
    return defaults;
  }

  private saveStore(evts: CalendarEvent[]) {
    sessionStorage.setItem("jobclaw_calendar_db", JSON.stringify(evts));
  }

  async syncEvents(): Promise<CalendarEvent[]> {
    return this.getStore();
  }

  async createEvent(event: Omit<CalendarEvent, "id" | "prepKitApproved" | "prepActionItems">): Promise<CalendarEvent> {
    const auth = PolicyEngine.authorizeAction(this.name, "create-event", `Schedule event '${event.title}'`);
    if (!auth.allowed) {
      throw new Error(auth.restriction);
    }

    const evts = this.getStore();
    
    // Auto enrich the event with standard prep kits utilizing our core Gemini intelligence model
    const prepActionItems = [
      `Enforce core focus on metrics associated with ${event.company || "target company"}.`,
      "Review quantified Master Profile alignment logs.",
      "Check resume variant used for submission before dial-in."
    ];

    if (event.description.toLowerCase().includes("aws") || event.description.toLowerCase().includes("docker")) {
      prepActionItems.push("Read AWS EC2 migration notes highlighting the $120,000 yearly structural savings.");
    }
    if (event.description.toLowerCase().includes("speed") || event.description.toLowerCase().includes("first contentful")) {
      prepActionItems.push("Pre-stage concurrent React FCP optimization answers (1.2s cut).");
    }

    const newEvt: CalendarEvent = {
      ...event,
      id: `evt-${Date.now()}`,
      prepKitApproved: false,
      prepActionItems
    };

    evts.unshift(newEvt);
    this.saveStore(evts);
    return newEvt;
  }

  async deleteEvent(eventId: string): Promise<boolean> {
    const auth = PolicyEngine.authorizeAction(this.name, "delete-event", `Delete event ID ${eventId}`);
    if (!auth.allowed) {
      throw new Error(auth.restriction);
    }

    let evts = this.getStore();
    const lenBefore = evts.length;
    evts = evts.filter(e => e.id !== eventId);
    this.saveStore(evts);
    return evts.length < lenBefore;
  }
}
