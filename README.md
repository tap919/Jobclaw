# Jobclaw

Jobclaw is a production-ready, AI-driven job hunt automation system. 

## Features
- **Autopilot Engine:** Deterministic job ingestion, ranking, and application submission pipeline.
- **Resume Studio:** AI-powered ATS scanning and tailoring for specific job descriptions.
- **Career Vault:** Manage your profile, skills, and application history.
- **Performance:** Optimized backend with <10ms API latency and concurrent request handling.
- **Security:** Hardened endpoints, request validation, and field allowlisting.

## Getting Started

### Prerequisites
- Node.js (v20+)
- npm

### Installation
1. `npm install`
2. Create `.env` from `.env.example`: `cp .env.example .env`
3. Set `GEMINI_API_KEY` and `JOBCLAW_API_KEY` in `.env`.

### Running
- Development: `npm run dev`
- Production Build: `npm run build`
- Run Benchmark: `npm run benchmark`
- Run Tests: `npm test`

## Mutly Integration

Jobclaw is designed to be benchmarked and extended by the Mutly autonomous agent system.

- **Benchmarking**: Mutly uses Jobclaw as a sandbox to test its capabilities against real-world Express/React/Vite applications. See `docs/superpowers/specs/2026-06-05-mutly-jobclaw-benchmarking-design.md`.
- **Build Pipeline**: Mutly can ingest Jobclaw's codebase, run RepoRank audits, and autonomously apply improvements.

