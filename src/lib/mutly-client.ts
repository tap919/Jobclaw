// Mutly Daemon Agent Client for Jobclaw
// Connects to Mutly build pipeline for automated development

const MUTLY_URL = process.env.MUTLY_URL || 'http://localhost:4000';
const MUTLY_API_KEY = process.env.MUTLY_API_KEY || '';

function mutlyHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (MUTLY_API_KEY) headers['X-Mutly-API-Key'] = MUTLY_API_KEY;
  return headers;
}

/** Safely parse JSON response, returning null on parse error */
async function safeParseJson(response: Response): Promise<unknown | null> {
  try {
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return null;
    }
    return await response.json();
  } catch {
    return null;
  }
}

/** Generic Mutly API request with proper error handling */
async function mutlyRequest<T = unknown>(
  endpoint: string,
  options: { method?: string; body?: unknown; timeoutMs?: number } = {}
): Promise<T> {
  const { method = 'GET', body, timeoutMs = 10000 } = options;
  const url = `${MUTLY_URL}${endpoint}`;
  const init: RequestInit = {
    method,
    headers: mutlyHeaders(),
    signal: AbortSignal.timeout(timeoutMs),
  };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }

  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Network error';
    throw new Error(`Mutly unreachable at ${url}: ${msg}`);
  }

  if (!response.ok) {
    const errorBody = await safeParseJson(response);
    const errorMsg =
      (errorBody && typeof errorBody === 'object' && 'error' in errorBody
        ? String((errorBody as Record<string, unknown>).error)
        : null) || `Mutly API error: HTTP ${response.status}`;
    throw new Error(errorMsg);
  }

  const data = await safeParseJson(response);
  if (data === null) {
    throw new Error(`Mutly returned non-JSON response: ${response.status} ${response.statusText}`);
  }
  return data as T;
}

export interface MutlyPipelineStatus {
  status: string;
  currentPhase?: string;
  workspaceId?: string;
  startedAt?: number;
  completedAt?: number;
  error?: string;
}

export interface MutlyAuditResult {
  score: number;
  issues: unknown[];
  rawReport?: unknown;
}

/** Check Mutly health */
export async function checkMutlyHealth(): Promise<boolean> {
  try {
    await mutlyRequest('/api/health', { timeoutMs: 5000 });
    return true;
  } catch {
    return false;
  }
}

/** Start a Mutly pipeline run for a project */
export async function startMutlyPipeline(projectDir: string): Promise<MutlyPipelineStatus> {
  if (!projectDir || typeof projectDir !== 'string') {
    throw new Error('projectDir must be a non-empty string');
  }
  return mutlyRequest<MutlyPipelineStatus>('/api/pipeline/start', {
    method: 'POST',
    body: { projectDir },
    timeoutMs: 30000,
  });
}

/** Get Mutly pipeline status */
export async function getMutlyStatus(): Promise<MutlyPipelineStatus> {
  return mutlyRequest<MutlyPipelineStatus>('/api/pipeline/status', { timeoutMs: 10000 });
}

/** Run RepoRank audit on a project via Mutly */
export async function auditProject(projectPath: string): Promise<MutlyAuditResult> {
  if (!projectPath || typeof projectPath !== 'string') {
    throw new Error('projectPath must be a non-empty string');
  }
  return mutlyRequest<MutlyAuditResult>('/api/pipeline/audit', {
    method: 'POST',
    body: { projectPath },
    timeoutMs: 60000,
  });
}

/** Integration status for display */
export async function getIntegrationStatus(): Promise<{
  service: string;
  url: string;
  healthy: boolean;
  pipelineActive: boolean;
}> {
  const healthy = await checkMutlyHealth();
  let pipelineActive = false;
  if (healthy) {
    try {
      const status = await getMutlyStatus();
      pipelineActive = status?.status === 'running' || status?.status === 'idle';
    } catch {
      pipelineActive = false;
    }
  }
  return {
    service: 'Mutly',
    url: MUTLY_URL,
    healthy,
    pipelineActive,
  };
}