// Mutly Daemon Agent Client for Jobclaw
// Connects to Mutly build pipeline for automated development

const MUTLY_URL = process.env.MUTLY_URL || 'http://localhost:4000';
const MUTLY_API_KEY = process.env.MUTLY_API_KEY || '';

function mutlyHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (MUTLY_API_KEY) headers['X-Mutly-API-Key'] = MUTLY_API_KEY;
  return headers;
}

/** Check Mutly health */
export async function checkMutlyHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${MUTLY_URL}/api/health`, {
      headers: mutlyHeaders(),
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/** Start a Mutly pipeline run for a project */
export async function startMutlyPipeline(projectDir: string): Promise<unknown> {
  const response = await fetch(`${MUTLY_URL}/api/pipeline/start`, {
    method: 'POST',
    headers: mutlyHeaders(),
    body: JSON.stringify({ projectDir }),
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`Mutly API error: ${response.status}`);
  return response.json();
}

/** Get Mutly pipeline status */
export async function getMutlyStatus(): Promise<unknown> {
  const response = await fetch(`${MUTLY_URL}/api/pipeline/status`, {
    headers: mutlyHeaders(),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`Mutly API error: ${response.status}`);
  return response.json();
}

/** Run RepoRank audit on a project via Mutly */
export async function auditProject(projectPath: string): Promise<unknown> {
  const response = await fetch(`${MUTLY_URL}/api/pipeline/audit`, {
    method: 'POST',
    headers: mutlyHeaders(),
    body: JSON.stringify({ projectPath }),
    signal: AbortSignal.timeout(60000),
  });
  if (!response.ok) throw new Error(`Mutly audit error: ${response.status}`);
  return response.json();
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
      const status = await getMutlyStatus() as { status?: string };
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