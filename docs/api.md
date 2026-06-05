# JobClaw API Endpoints

This document outlines the RESTful API endpoints for the JobClaw application.

## Authentication

All API endpoints, when `NODE_ENV` is set to `"production"`, require an `x-jobclaw-key` header with the configured API key for authentication.

## API Categories

### 1. Profile Management

#### GET /api/profile
- **Description:** Retrieves the current user's professional profile.
- **Response:**
  ```json
  {
    "status": "success",
    "profile": { /* ProfileSchema object */ }
  }
  ```

#### POST /api/profile
- **Description:** Updates the current user's professional profile. Fields are strictly allowlisted to prevent injection.
- **Request Body:**
  ```json
  {
    "contactInfo": { "fullName": "string", "email": "string", "phone": "string", "location": "string", "linkedin": "string", "github": "string", "website": "string" },
    "headline": "string",
    "professionalSummary": "string",
    "skills": ["string"],
    "certifications": ["string"],
    "experiences": [{ "company": "string", "title": "string", "location": "string", "startDate": "string", "endDate": "string", "isCurrent": "boolean", "description": "string", "skillsUsed": ["string"] }],
    "education": [{ "institution": "string", "degree": "string", "fieldOfStudy": "string", "startDate": "string", "endDate": "string" }],
    "gapExplanations": ["string"],
    "targetSectors": ["string"],
    "targetRoles": ["string"],
    "salaryTarget": "string",
    "workAuthorization": "string"
  }
  ```
- **Response:**
  ```json
  {
    "status": "success",
    "message": "Master Profile updated securely.",
    "profile": { /* Updated ProfileSchema object */ }
  }
  ```
- **Error Response (400):**
  ```json
  {
    "status": "error",
    "message": "Invalid profile data format."
  }
  ```

#### POST /api/profile/parse-resume
- **Description:** Accepts a base64-encoded resume file (PDF or TXT), extracts text, and structures it into a profile using Gemini (with regex fallback).
- **Request Body:**
  ```json
  {
    "fileName": "string",    // e.g., "my_resume.pdf"
    "fileBase64": "string"  // Base64 encoded content of the file
  }
  ```
- **Response:**
  ```json
  {
    "status": "success",
    "message": "Resume parsed and profile updated",
    "profile": { /* Updated ProfileSchema object */ },
    "extractedLength": "number",
    "source": "gemini" | "regex"
  }
  ```
- **Error Response (400):**
  ```json
  {
    "status": "error",
    "message": "Missing fileName or fileBase64"
  }
  ```
- **Error Response (500):**
  ```json
  {
    "status": "error",
    "message": "Failed to extract text from file"
  }
  ```

### 2. Job & Application Management

#### GET /api/sector-packs
- **Description:** Retrieves a list of predefined sector packs.
- **Response:**
  ```json
  {
    "status": "success",
    "sectorPacks": [ /* Array of SectorPack objects */ ]
  }
  ```

#### GET /api/jobs
- **Description:** Retrieves the current pool of jobs.
- **Response:**
  ```json
  {
    "status": "success",
    "jobs": [ /* Array of JobMatch objects */ ]
  }
  ```

#### POST /api/jobs
- **Description:** Allows manual ingestion of a job (from a URL or pasted text). The job is then scored against the user's profile.
- **Request Body:** (Matches `JobSchema` - example fields below)
  ```json
  {
    "title": "string",
    "company": "string",
    "description": "string",
    "location": "string",
    "salary": "string",
    "sourceUrl": "string"
  }
  ```
- **Response:**
  ```json
  {
    "status": "success",
    "message": "Job successfully ingested and scored.",
    "job": { /* New JobMatch object */ }
  }
  ```
- **Error Response (400):**
  ```json
  {
    "status": "error",
    "message": "Invalid job data format",
    "errors": [ /* Zod validation issues */ ]
  }
  ```

#### POST /api/jobs/score-match
- **Description:** Scores a specific job from the `jobPool` against the current user profile using Gemini (with keyword fallback).
- **Request Body:**
  ```json
  {
    "jobId": "string"
  }
  ```
- **Response:**
  ```json
  {
    "status": "success",
    "fitScore": "number",
    "breakdown": {
      "keywordOverlapScore": "number",
      "requiredOverlapScore": "number",
      "seniorityFitScore": "number",
      "transferableOverlapScore": "number",
      "salaryAlignmentScore": "number"
    },
    "isRecommended": "boolean"
  }
  ```
- **Error Response (400):**
  ```json
  {
    "status": "error",
    "message": "Missing jobId"
  }
  ```
- **Error Response (404):**
  ```json
  {
    "status": "error",
    "message": "Job not found"
  }
  ```

#### GET /api/applications
- **Description:** Retrieves the list of tracked job applications.
- **Response:**
  ```json
  {
    "status": "success",
    "applications": [ /* Array of Application objects */ ]
  }
  ```

#### POST /api/applications
- **Description:** Creates a new application record or updates an existing one for a given job.
- **Request Body:**
  ```json
  {
    "jobId": "string",          // Required
    "status": "string",         // e.g., "Shortlisted", "Applied", "Interviewing"
    "resumeVariantId": "string",// e.g., "variant-master"
    "coverLetter": "string",
    "outreachNotes": "string",
    "approvalPolicyStatus": "string", // e.g., "Draft", "Ready", "Approved"
    "notes": "string"
  }
  ```
- **Response (New Application):**
  ```json
  {
    "status": "success",
    "message": "Application tracking started successfully.",
    "application": { /* New Application object */ }
  }
  ```
- **Response (Updated Application):**
  ```json
  {
    "status": "success",
    "message": "Application details synchronized.",
    "application": { /* Updated Application object */ }
  }
  ```
- **Error Response (400):**
  ```json
  {
    "status": "error",
    "message": "Missing jobId in body."
  }
  ```
- **Error Response (404):**
  ```json
  {
    "status": "error",
    "message": "Referenced job not found in pool."
  }
  ```

#### PATCH /api/applications/:id
- **Description:** Updates specific fields (status, approvalPolicyStatus, notes, coverLetter, outreachNotes) for an existing application.
- **URL Parameters:**
  - `:id`: The ID of the application to update.
- **Request Body:**
  ```json
  {
    "status": "string",         // Optional: New status for the application
    "approvalPolicyStatus": "string", // Optional: New approval policy status
    "notes": "string",          // Optional: Additional notes
    "coverLetter": "string",    // Optional: Updated cover letter text
    "outreachNotes": "string"   // Optional: Updated outreach notes
  }
  ```
- **Response:**
  ```json
  {
    "status": "success",
    "message": "Pipeline status updated successfully.",
    "application": { /* Updated Application object */ }
  }
  ```
- **Error Response (404):**
  ```json
  {
    "status": "error",
    "message": "Application tracking record not found."
  }
  ```

### 3. Gemini AI Endpoints

#### GET /api/gemini/status
- **Description:** Health check for Gemini API connectivity.
- **Response (Connected):**
  ```json
  {
    "connected": true,
    "model": "gemini-2.5-flash",
    "latencyMs": "number",
    "response": "string" // e.g., "OK"
  }
  ```
- **Response (Not Connected/Error):**
  ```json
  {
    "connected": false,
    "model": "none" | "gemini-2.5-flash",
    "message": "string" | "error"
  }
  ```

#### POST /api/gemini/suggest-bullets
- **Description:** Rewrites weak resume bullet points into 3 high-impact, professional, quantified suggestions using Gemini.
- **Request Body:**
  ```json
  {
    "rawText": "string", // Required: The raw bullet text to improve
    "company": "string", // Optional: Contextual company name
    "title": "string"    // Optional: Contextual job title
  }
  ```
- **Response:**
  ```json
  {
    "status": "success",
    "isMocked": "boolean", // true if using fallback mock suggestions
    "suggestions": ["string", "string", "string"], // Array of 3 improved bullets
    "warning": "string" // Present if isMocked is true
  }
  ```
- **Error Response (400):**
  ```json
  {
    "status": "error",
    "message": "Missing bullet rawText in request body."
  }
  ```

#### POST /api/gemini/audit-profile
- **Description:** Audits the candidate profile (provided or `userProfile`) for gaps, chronology errors, weak bullets, and unrealistic claims, generating actionable suggestions using Gemini.
- **Request Body:**
  ```json
  {
    "profile": { /* Optional: Profile object to audit, defaults to userProfile */ }
  }
  ```
- **Response:**
  ```json
  {
    "status": "success",
    "isMocked": "boolean", // true if using fallback mock audits
    "audits": [
      {
        "type": "gap" | "consistency" | "weak-bullet" | "metric",
        "severity": "high" | "medium" | "low",
        "message": "string",
        "suggestion": "string",
        "targetId": "string" // Reference company, title, or ID
      }
    ]
  }
  ```

#### POST /api/gemini/ats-check
- **Description:** Analyzes resume text against a job description for ATS compatibility, keyword density, readability, and potential keyword stuffing using Gemini.
- **Request Body:**
  ```json
  {
    "resumeText": "string",       // Required: The candidate's resume text
    "jobDescription": "string"    // Optional: The target job description
  }
  ```
- **Response:**
  ```json
  {
    "status": "success",
    "isMocked": "boolean", // true if using fallback mock report
    "report": {
      "parsedScore": "number",          // Overall ATS compatibility (0-100)
      "keywordCoverage": "number",      // Keyword match percentage (0-100)
      "textExtractionQuality": "Excellent" | "Fair" | "Poor",
      "issuesFound": ["string"],
      "keywordStuffingDetected": "boolean",
      "recommendations": ["string"],
      "extractedTextPreview": "string"  // Clean text as read by ATS
    }
  }
  ```
- **Error Response (400):**
  ```json
  {
    "status": "error",
    "message": "Missing copy of resumeText to parse."
  }
  ```

#### POST /api/gemini/tailor-resume
- **Description:** Creates a customized professional summary and tailored bullet points for each experience based on a target job description, using Gemini.
- **Request Body:**
  ```json
  {
    "jobDescription": "string", // Required: The target job description
    "profile": { /* Optional: Profile object to tailor, defaults to userProfile */ }
  }
  ```
- **Response:**
  ```json
  {
    "status": "success",
    "isMocked": "boolean", // true if using fallback mock tailoring
    "tailored": {
      "tailoredSummary": "string",
      "experienceTailoredBullets": {
        "exp-1": ["string", "string"], // Map of experience IDs to tailored bullets
        "exp-2": ["string"]
      }
    }
  }
  ```
- **Error Response (400):**
  ```json
  {
    "status": "error",
    "message": "Missing jobDescription for tailoring."
  }
  ```

#### POST /api/gemini/improve-resume
- **Description:** Generates improved resume bullet points and overall summary optimization advice based on uploaded resume content and a target job, using Gemini.
- **Request Body:**
  ```json
  {
    "fileName": "string",           // e.g., "my_resume.pdf"
    "fileSize": "number",           // e.g., 102400 (bytes)
    "resumeContent": "string",      // Required: The actual text content of the resume
    "targetJobTitle": "string",     // Optional: The title of the target job
    "targetJobDescription": "string"// Optional: The description of the target job
  }
  ```
- **Response:**
  ```json
  {
    "status": "success",
    "isMocked": "boolean", // true if using fallback mock suggestions
    "improvedBullets": ["string", "string", "string"], // 3 polished bullets
    "recruiterAdvice": "string",                       // Summary layout advice
    "atsScoreBoost": "number"                          // Estimated ATS score increase
  }
  ```

### 4. Autopilot Engine Endpoints

#### GET /api/autopilot/state
- **Description:** Retrieves the current state of the Autopilot, including its running status, last run time, configured rules, skills, queue, and logs.
- **Response:**
  ```json
  {
    "status": "success",
    "isRunning": "boolean",
    "lastRun": "string", // ISO timestamp
    "rules": { /* AutopilotRuleSet object */ },
    "skills": { /* AutopilotSkillSet object */ },
    "queue": [ /* Array of QueueItem objects */ ],
    "logs": [ /* Array of AutopilotLogItem objects */ ]
  }
  ```

#### POST /api/autopilot/update-rules
- **Description:** Updates the Autopilot's operational rules (e.g., `minFitScore`, `compensationFloor`). Fields are strictly allowlisted.
- **Request Body:**
  ```json
  {
    "minFitScore": "number",
    "compensationFloor": "number",
    "remotePreference": "string", // e.g., "remote-only", "hybrid", "onsite-only"
    "maxCommute": "number",      // Max commute distance in miles
    "applicationsPerHourLimit": "number",
    "applicationsPerDayLimit": "number",
    "neverApplySameRequisition": "boolean",
    "excludeRejectedCompaniesLast90days": "boolean",
    "excludeMissingCertifications": "boolean"
  }
  ```
- **Response:**
  ```json
  {
    "status": "success",
    "rules": { /* Updated AutopilotRuleSet object */ },
    "logs": [ /* Updated AutopilotLogItem array */ ]
  }
  ```
- **Error Response (400):** (If invalid keys are sent, they are ignored, not an error.)

#### POST /api/autopilot/update-skills
- **Description:** Updates the Autopilot's skill set, including `profileSkills`, `synonymDictionary`, and `screeningQA`. `atsSelectors` are *not* mutable via this endpoint.
- **Request Body:** (Matches `UpdateSkillsSchema`)
  ```json
  {
    "profileSkills": {
      "workAuthNeeded": "string",
      "noticePeriod": "string",
      "veteranChoice": "string",
      "consentToBgCheck": "string"
    },
    "synonymDictionary": {
      "oldTerm": "newTerm"
    },
    "screeningQA": {
      "question": "answer"
    }
  }
  ```
- **Response:**
  ```json
  {
    "status": "success",
    "skills": { /* Updated AutopilotSkillSet object */ },
    "logs": [ /* Updated AutopilotLogItem array */ ]
  }
  ```
- **Error Response (400):**
  ```json
  {
    "status": "error",
    "message": "Invalid skills payload.",
    "issues": [ /* Zod validation issues */ ]
  }
  ```

#### POST /api/autopilot/trigger-cron
- **Description:** Manually triggers a specific Autopilot cron stage (e.g., `job_ingest_cron`, `job_rank_cron`).
- **Request Body:**
  ```json
  {
    "cronName": "string" // Required: Name of the cron stage to trigger
  }
  ```
- **Response:**
  ```json
  {
    "status": "success",
    "message": "Cron stage triggered",
    "queue": [ /* Updated QueueItem array */ ],
    "logs": [ /* Updated AutopilotLogItem array */ ]
  }
  ```
- **Error Response (400):**
  ```json
  {
    "status": "error",
    "message": "Invalid cron name."
  }
  ```

#### POST /api/autopilot/toggle
- **Description:** Toggles the Autopilot's running state (on/off).
- **Request Body:** (Empty)
- **Response:**
  ```json
  {
    "status": "success",
    "isRunning": "boolean", // New running state
    "message": "string"
  }
  ```

#### POST /api/autopilot/reset
- **Description:** Resets the Autopilot's internal state (queue, logs, etc.).
- **Request Body:** (Empty)
- **Response:**
  ```json
  {
    "status": "success",
    "message": "Autopilot state reset."
  }
  ```

### 5. Frontend Catch-all

#### GET *
- **Description:** Serves the frontend application for any unmatched routes. This is a client-side routing endpoint.
- **Response:** Serves `index.html` (Vite development server or built assets).
