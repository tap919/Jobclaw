# Mutly Dev Tool Benchmarking on Jobclaw Sandbox Design Spec

- **Date**: 2026-06-05
- **Status**: Draft
- **Target System**: Mutly (Vibeserve, Hermes, RepoRank)
- **Benchmark Sandbox**: Jobclaw Repository (https://github.com/tap919/Jobclaw)

---

## 1. Executive Summary

This document specifies the architecture and process for running and validating the Mutly developer agent system in a real-world repository environment using the `Jobclaw` project as a sandbox. 

The primary objective is to verify that Mutly can autonomously understand a codebase, execute complex engineering tasks, pass rigorous code quality audits via RepoRank, and preserve application functionality verified by Playwright end-to-end tests.

## 2. System Architecture

The benchmark setup integrates four primary components:

1.  **Jobclaw (Sandbox Project)**: An Express, React, and Vite application configured with Playwright E2E tests (`test:e2e`, `test:journey`).
2.  **Vibeserve MCP Server**: Provides the underlying agentic pipeline (Architect, Code, Verify, Iterate, Test, Deploy) to execute software engineering tasks.
3.  **Hermes Agent / HTTP Bridge**: Facilitates messaging and orchestration across platforms, coordinating the Mutly developer loop.
4.  **RepoRank CLI**: Runs static analysis and grading on the codebase (`pnpm dev --filter @reporank/api review`) to enforce quality gates and score development output.

```
       +-------------------------------------------------+
       |               Orchestrator (Mutly)              |
       +--------------------+----------------------------+
                            |
         +------------------+------------------+
         |                                     |
         v                                     v
+------------------+                 +------------------+
|  Vibeserve MCP   |                 |   RepoRank CLI   |
|  - Architect     |                 |  - Code Review   |
|  - Code          |                 |  - Quality Gate  |
|  - Verify        |                 |  - Grading       |
+--------+---------+                 +--------+---------+
         |                                    |
         +------------------+-----------------+
                            |
                            v
               +--------------------------+
               |  Jobclaw Sandbox Repo    |
               |  - Express / React App   |
               |  - Playwright E2E Tests  |
               +--------------------------+
```

## 3. Benchmarking Workflow & Quality Gates

Evaluating Mutly as a developer tool follows an iterative loop:

### Step 1: Establish Baseline
- Audit current Jobclaw code with RepoRank to obtain a baseline quality score.
- Run the full suite of Jobclaw Playwright tests (`npm run test:e2e` and `npm run test:journey`) to establish functional baseline.

### Step 2: Task Definition
- Supply Mutly with an engineering assignment in Jobclaw (e.g., adding features, resolving issues, or optimizing code).

### Step 3: Execution Loop (Mutly + Vibeserve)
- **Architect**: Mutly analyzes the requirement and existing files to construct an architecture plan.
- **Implement**: Vibeserve modifies the code or introduces new modules in Jobclaw.

### Step 4: Verification & Grading (RepoRank + Playwright)
- **Quality Gate**: Mutly runs `pnpm dev --filter @reporank/api review` (or the corresponding RepoRank command) on Jobclaw.
- **Functional Validation**: Playwright E2E tests execute to verify the user journey remains intact and the new feature is operational.
- **Benchmark Update**: Capture the post-change RepoRank grade and test execution statistics.

## 4. Key Performance Indicators (KPIs)

To measure Mutly's progress as a dev tool, the following metrics will be logged:

- **Functional Pass Rate**: Percentage of Playwright tests passing before and after the modification.
- **RepoRank Grade Difference**: The shift in code quality and maintainability score (A/B/C/D/F) after implementation.
- **Build/Lint Status**: Clean execution of compilation and type-checking scripts (`npm run lint`).
- **Autonomy Ratio**: Number of developer-agent actions performed without requiring manual user intervention or correction.

## 5. Security & Isolation Guidelines

- **No Eval**: Mutly will not generate or use `eval()` statements in production code.
- **Clean Commits**: Ensure debug instructions (such as `console.log` or debuggers) are cleaned up before any verification phase.
- **Asset Control**: Test environments must remain isolated from any production database or credentials.
