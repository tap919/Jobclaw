# Mutly UI Productivity E2E Test Design Spec

- **Date**: 2026-06-05
- **Status**: Draft
- **Target System**: Mutly Daemon Agent UI (React frontend at `http://localhost:3001/`)
- **Test Runner**: Playwright (already installed in `Mutly-Daemon-Agent` devDependencies)

---

## 1. Executive Summary

This spec defines a comprehensive, productive end-to-end test suite for the Mutly Daemon UI. The test is **not** a "click every button" smoke test — it uses every section's functions in a **realistic workflow** that exercises the actual feature purpose (e.g., run a sandbox command, trigger a dream cycle, search for symbols).

The test catches real bugs like the broken "Select Folder" button the user already found, plus any other regressions in interactive elements.

## 2. Goals

1. **Verify every UI function works** — not just that the page loads, but that each function performs its intended workflow and produces a result.
2. **Detect regressions** — broken handlers, missing API calls, console errors during interaction.
3. **Produce visual evidence** — screenshot per interaction for proof and bug reports.
4. **Generate structured reports** — machine-readable JSON + human-readable Markdown summary.

## 3. Test Architecture

### 3.1 Test File
- **Path:** `Mutly-Daemon-Agent/tests/ui-e2e/mutly-ui-e2e-productivity.mjs`
- **Runtime:** ~15–30 minutes (headless, parallel where safe)
- **Dependencies:** `playwright@^1.60.0` (already installed)

### 3.2 Output Artifacts
```
Mutly-Daemon-Agent/tests/ui-e2e/output/
├── screenshots/                  (PNG per interaction)
│   ├── 01-landing-page.png
│   ├── 02-source-import-folder-picker.png
│   ├── 03-source-import-github-submit.png
│   ├── ...
├── mutly-ui-test-report.json    (machine-readable results)
├── mutly-ui-test-report.md      (human summary)
```

### 3.3 Report Schema
```json
{
  "startedAt": "2026-06-05T...",
  "durationMs": 1247,
  "summary": { "total": 47, "passed": 42, "failed": 5, "skipped": 0 },
  "sections": [
    {
      "name": "Source Import",
      "slug": "source-import",
      "status": "PARTIAL",
      "functions": [
        {
          "name": "Folder picker",
          "status": "FAIL",
          "durationMs": 215,
          "error": "No file dialog opens on click; <input> has no event handler attached",
          "screenshot": "screenshots/02-source-import-folder-picker.png",
          "consoleErrors": ["..."],
          "networkErrors": []
        }
      ]
    }
  ],
  "globalConsoleErrors": [],
  "globalNetworkErrors": []
}
```

## 4. UI Sections & Productive Workflows

The Mutly UI has **12 main interactive sections** + **2 sidebar buttons**. Each section gets a dedicated test phase that uses its features in a real workflow.

### 4.1 Landing Page
- **Workflow:** Click "Enter Command Center"
- **Tests:** Page loads, hero renders, navigation entry works
- **Expected:** Dashboard view appears in < 2s

### 4.2 Source Import
- **Workflow A (broken — known bug):** Click "Select Folder" → verify file dialog appears
- **Workflow B:** Type valid GitHub URL → submit → verify progress logs appear
- **Workflow C:** Type invalid URL → submit → verify rejection
- **Tests:** The `Select Folder` bug + GitHub URL parser + analysis trigger

### 4.3 Dashboard
- **Workflow:** Wait 3s, verify status widgets update with live data
- **Tests:** `/api/agent/status` polled every 3s, daemon metrics visible

### 4.4 SPEC.md
- **Workflow:** Edit SPEC text → click "Save Context" → verify API call
- **Tests:** Context persistence via `PUT /api/agent/context`

### 4.5 REPL Engine (UltraPlan)
- **Workflow:** Click "Generate Plan" → wait → click "Run Step 1" → click "Run All Steps"
- **Tests:** Plan generation, individual step execution, batch execution

### 4.6 Grep & AST (Memory)
- **Workflow:** Click "Trigger Index" → wait for completion → type query → click "Search"
- **Tests:** Embeddings indexer + symbol search

### 4.7 Mutly Daemon (Kairos)
- **Workflow:** Verify metrics render, uptime counter increments
- **Tests:** Live state display, no console errors

### 4.8 Token Compactor (AutoDream)
- **Workflow:** Click "Start Dream" → wait 5s → verify token-saved metric updates
- **Tests:** Dream cycle runs end-to-end

### 4.9 Secure Sandbox
- **Workflow:** Click preset "tsc --noEmit" → click "Execute" → wait for log output
- **Tests:** Real shell command execution in sandbox

### 4.10 Context Injector
- **Workflow:** Click "Inject Anchor" → verify totalAnchored increments
- **Tests:** Anchor injection

### 4.11 IDE Integrations
- **Workflow A (VS Code Chat):** Type prompt → click "Send" → verify response + diff preview
- **Workflow B (RPC):** Click "Run Tests" → verify result
- **Workflow C (REST):** Click "Test Endpoint" → verify response
- **Tests:** All three IDE integration tabs

### 4.12 Code Nexus Audit (CodeAuditor)
- **Workflow:** Click "Run Audit" → wait for completion → verify issue list populated
- **Tests:** Full audit pipeline (RepoRank integration)

### 4.13 Sidebar Buttons
- **Workflow A:** Click "Enable Auto-Pilot" → verify status changes → click again to disable
- **Workflow B:** Click "Force Auto-Dream" → verify request fires
- **Tests:** Top-level governance controls

## 5. Technical Implementation Notes

### 5.1 State Capture Pattern
For each section, the test:
1. Navigates to the section
2. Captures the initial screenshot
3. For each function in that section:
   - Performs the workflow with real input (not just clicking)
   - Verifies the expected state change
   - Captures a screenshot
   - Records console + network errors during the action
4. Captures the final state

### 5.2 Error Tolerance
The test must NOT throw on the first failure — instead it records the failure and continues to the next function. This way one broken button doesn't abort the entire suite.

### 5.3 Rate Limiting
Some Mutly API endpoints have rate limits (e.g., `/api/agent/analyze` is limited). The test includes `waitForTimeout` between heavy operations to avoid triggering 429s.

### 5.4 File Picker Limitation
Playwright cannot trigger native OS file dialogs. For the "Select Folder" test, the test:
- Clicks the button
- Verifies if a `<input type="file">` element receives focus or change events
- Inspects DOM for the expected handler
- If no dialog/event, marks the test as FAIL with detailed evidence

## 6. Success Criteria

- All 12 sections + 2 sidebar buttons tested
- For each function: either PASS (workflow completes) or FAIL (with specific error)
- Final report clearly identifies all bugs
- Screenshots saved as proof for every interaction
- Total runtime under 30 minutes

## 7. Deliverables

1. **Test script:** `Mutly-Daemon-Agent/tests/ui-e2e/mutly-ui-e2e-productivity.mjs`
2. **Output directory:** `Mutly-Daemon-Agent/tests/ui-e2e/output/`
3. **Bug report:** `mutly-ui-test-report.md` with section-by-section findings

## 8. Out of Scope

- Load testing / performance benchmarks
- Visual regression testing (pixel comparison)
- Cross-browser testing (only Chromium, matching the existing `e2e-comprehensive.mjs` pattern)
- Mobile responsive testing
