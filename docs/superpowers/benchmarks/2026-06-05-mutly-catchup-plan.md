# Mutly Catch-Up Plan — Closing the Gap with Cursor & Claude Code

- **Date**: 2026-06-05
- **Comparators**: Cursor v0.47+, Claude Code 2026-06 (latest), Mutly v0.1
- **Goal**: Feature parity on developer workflow integration

---

## 1. Gap Assessment

### 1.1 Cursor Deep Analysis

| Cursor Feature | Mutly Status | Gap | Impact |
|---------------|-------------|-----|--------|
| **Composer** (Ctrl+K, inline multi-file edits with diff) | ❌ Missing | Build phase records steps but doesn't produce editable diffs | HIGH — users can't review changes |
| **Agent mode** (autonomous multi-file) | ⚠️ Partial | Pipeline runs steps but doesn't modify project files directly | HIGH — pipeline is theoretical without file writes |
| **@file/@folder/@codebase** context references | ❌ Missing | No way to reference specific files in the workspace | MEDIUM — limits precision |
| **Tab completion** (inline AI suggestions) | ❌ Not applicable | Web UI can't do IDE completions | LOW — web UI limitation |
| **Terminal integration** (run commands in editor) | ⚠️ Partial | Sandbox tab exists but isn't wired to build pipeline | MEDIUM — build steps can't run `npm test` |
| **Git integration** (auto-commit, branch, PR) | ❌ Missing | No git commits, no branch management, no PR creation | CRITICAL — no traceability |
| **.cursorrules** (project-level AI config) | ⚠️ Partial | `CLAUDE.md` exists but isn't read by pipeline agents | MEDIUM — agents lack project context |
| **Multi-model** (Claude, GPT-4, Gemini) | ⚠️ Partial | `MUTLY_DEFAULT_MODEL` exists but no fallback | MEDIUM — single point of failure |
| **Debug integration** (AI helps debug) | ❌ Missing | No debug context or stack trace analysis | LOW — advanced feature |

### 1.2 Claude Code Deep Analysis

| Claude Code Feature | Mutly Status | Gap | Impact |
|--------------------|-------------|-----|--------|
| **CLI mode** (`claude` in terminal) | ❌ Missing | Mutly is web-only. No `mutly build` command | CRITICAL — limits CI/CD and headless use |
| **Extended thinking** (visible reasoning) | ❌ Missing | Pipeline shows phases but not agent reasoning | MEDIUM — reduces trust/visibility |
| **Tool use** (bash, edit, read, write, web search) | ⚠️ Partial | Has vibeserve tools + sandbox but no unified tool interface | MEDIUM — tools are fragmented |
| **CLAUDE.md** (project context) | ⚠️ Partial | `agentDaemon.ts:149` has Claude.md but agents don't read it | MEDIUM — agents miss project context |
| **Skills** (community-contributed) | ⚠️ New | SkillRegistry exists with 3 built-in skills | LOW — just need more skills |
| **Session memory** (cross-turn context) | ❌ Missing | No memory between pipeline runs | MEDIUM — each run is stateless |
| **Git integration** (commit, PR) | ❌ Missing | Same as Cursor gap | CRITICAL — no traceability |
| **MCP server support** (external tools) | ✅ Has it | Vibeserve + Heremes MCP already integrated | GOOD — Mutly leads here |
| **Cost tracking** (token usage) | ❌ Missing | No visibility into API costs | LOW — operational detail |

---

## 2. Prioritized Catch-Up Roadmap

### Sprint A: "Make It Real" — File Modifications + Git (2 days)

**Goal:** Pipeline actually modifies real files and commits them.

**Day 1 — File Modifications:**
- Make the Code Agent write actual diffs to the workspace
- Each build step produces a `git diff` file in the workspace
- Pipeline tab shows the diff preview (unified format)

**Day 2 — Git Integration:**
- Auto `git init` workspace on ingest
- Auto `git add && git commit -m "build: phase [n]"` after each build step
- Track commit SHAs in pipeline state
- Show commit history in the Build Pipeline tab

**Deliverable:** `mutly build` actually modifies source files and commits them.
**Files to create:** `server/skills/gitSkill.ts`, `server/buildPipeline/gitIntegration.ts`

### Sprint B: "Go Headless" — CLI Mode (1 day)

**Goal:** `mutly build` runs from the terminal without opening a browser.

**Day 1 — CLI:**
- Create `mutly.ts` CLI entry point using `commander` (already in dependencies)
- Commands:
  - `mutly build ./project` — run pipeline on a local project
  - `mutly build https://github.com/user/repo` — clone and run
  - `mutly status` — check current pipeline state
  - `mutly skills` — list available skills
- Output: pipeline summary to stdout, JSON to file
- Accept `--target-score 80`, `--max-iter 3`, `--model gemini-2.5-flash` flags

**Deliverable:** `npx mutly build ./my-project` works in any terminal.
**Files to create:** `bin/mutly.ts`, `server/cli/buildCommand.ts`

### Sprint C: "Show the Diff" — Diff Preview + Review (1 day)

**Goal:** Show users what the pipeline changed before they accept it.

**Day 1 — Diff System:**
- Generate unified diff per build step (`git diff --no-color`)
- Store diffs in pipeline state
- Build Pipeline tab shows diff viewer (code before/after)
- "Accept" and "Reject" buttons per change
- "Accept All" to commit everything
- "Reject All" to `git checkout -- .` and revert

**Deliverable:** Diffs are visible, reviewable, and reversible in the UI.
**Files to create:** `src/components/DiffViewer.tsx`, `server/buildPipeline/diffService.ts`

### Sprint D: "Know the Project" — Context Awareness (1 day)

**Goal:** Agents read project context (CLAUDE.md, package.json, etc.) before executing.

**Day 1 — Context Engine:**
- Build phase reads `CLAUDE.md`, `SPEC.md`, `.cursorrules`, `package.json` before executing steps
- Agents receive context as part of `AgentContext`
- Skills accept optional `context` parameter
- Add `GET /api/agent/context` endpoint for frontend to show what context the pipeline found

**Deliverable:** Agents understand the project conventions before making changes.
**Files to create:** `server/agents/contextLoader.ts`, modify `agentBase.ts`

---

## 3. Feature Comparison After Catch-Up

### 3.1 After All 4 Sprints

| Feature | Cursor | Claude Code | Mutly (today) | Mutly (after) |
|---------|--------|-------------|---------------|----------------|
| **File modifications** | ✅ | ✅ | ❌ Records only | ✅ Writes files |
| **Git integration** | ✅ | ✅ | ❌ | ✅ Commit + diff |
| **Diff preview** | ✅ Inline | ✅ Terminal | ❌ | ✅ Web diff viewer |
| **CLI mode** | ❌ VS Code | ✅ `claude` | ❌ Web-only | ✅ `mutly build` |
| **Project context** | ✅ .cursorrules | ✅ CLAUDE.md | ⚠️ Partial | ✅ Full |
| **Autonomous pipeline** | ❌ | ❌ | ✅ 7-phase | ✅ 7-phase + git |
| **Quality gates** | ❌ | ❌ | ✅ RepoRank | ✅ RepoRank + git hooks |
| **Multi-agent** | ❌ | ❌ | ✅ 7 agents | ✅ 7 agents + context |
| **Skills registry** | ❌ | ⚠️ Community | ✅ 3 skills | ✅ More skills |
| **MCP servers** | ❌ | ✅ | ✅ Vibeserve + Hermes | ✅ Same |

### 3.2 Unique Mutly Advantages After Catch-Up

| Advantage | Description |
|-----------|-------------|
| **Autonomous quality loop** | Still no competitor has INGEST→AUDIT→PLAN→BUILD→REVIEW→ITERATE→READY with score tracking |
| **Quality gates at every step** | RepoRank checks every phase. Cursor/Claude Code check nothing until CI |
| **Score tracking** | Baseline vs current. Delta drives iteration. No one else measures numerically |
| **Multi-agent message bus** | 7 agents communicating via typed events. Extensible to 49+ agents |
| **Composable skills** | `finalize-build` composes `quality-scan` + `fix-batch`. Skills call skills |
| **File ingest + clone** | Can work with local folders OR GitHub repos. Cursor is file-system-only |

---

## 4. Implementation Details

### 4.1 Git Integration (Sprint A, Day 1)

```typescript
// server/skills/gitSkill.ts
export const gitCommitSkill = defineSkill({
  name: "git-commit",
  description: "Stage and commit changes in the workspace",
  input: { workspacePath: Schema.workspacePath, message: { type: "string" } },
  execute: async (input, ctx) => {
    const { execSync } = await import("child_process");
    const ws = input.workspacePath;
    if (!existsSync(join(ws, ".git"))) execSync("git init", { cwd: ws });
    execSync("git add -A", { cwd: ws });
    execSync(`git commit -m "${input.message}"`, { cwd: ws });
    const log = execSync("git log --oneline -1", { cwd: ws }).toString();
    return skillSuccess({ commitLog: log.trim() });
  },
});
```

### 4.2 CLI Mode (Sprint B)

```typescript
// bin/mutly.ts
#!/usr/bin/env node
import { program } from "commander";
program
  .command("build <path>")
  .option("-s, --target-score <number>", "Target quality score", "80")
  .option("-m, --model <name>", "AI model", "gemini-2.5-flash")
  .action(async (path, opts) => {
    const result = await runPipeline({ source: "local", files: [] });
    console.log(JSON.stringify(result, null, 2));
  });
program.parse();
```

### 4.3 Diff Preview (Sprint C)

```typescript
// server/buildPipeline/diffService.ts
export async function generateDiffs(workspacePath: string): Promise<Diff[]> {
  const { execSync } = await import("child_process");
  const output = execSync("git diff --no-color", { cwd: workspacePath }).toString();
  return parseUnifiedDiff(output);
}
```

---

## 5. Effort Summary

| Sprint | Days | Lines New | Files | Critical Path |
|--------|------|-----------|-------|---------------|
| **A**: File mods + Git | 2 | ~500 | 4 | Y — pipeline does nothing real today |
| **B**: CLI mode | 1 | ~300 | 3 | Y — enables CI/CD, headless use |
| **C**: Diff preview | 1 | ~600 | 3 | Y — users need to see changes |
| **D**: Context awareness | 1 | ~200 | 2 | N — nice to have, enables better agents |
| **Total** | **5 days** | **~1600** | **12** | |

### Bottleneck Analysis

1. **Sprint A** is the hardest — requires modifying `codeAgent.ts` to write real files instead of recording steps, and adding git operations
2. **Sprint B** is the fastest — `commander` already in dependencies, just need to wire up the pipeline
3. **Sprint C** requires a `DiffViewer.tsx` React component + `diffService.ts` — moderate complexity
4. **Sprint D** is mostly wiring — reading files and passing to agents

---

## 6. Decision Points

| Question | Impact |
|----------|--------|
| Should CLI use web UI or be standalone? | A standalone CLI (no dependency on web server) is faster but duplicates work. A CLI that talks to the web server is slower but simpler. Recommend: **standalone CLI** for maximum flexibility. |
| Should git commits happen automatically or require approval? | Auto-commit is faster for the pipeline but riskier. Recommend: **auto-commit with --amend** so commits are editable. |
| How deep should diff preview go? | Full line-by-line diff is complex UI work. Recommend: **unified diff format** (text) displayed in a `<pre>` block, then iterate to side-by-side later. |
