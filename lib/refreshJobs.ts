// Module-level map — persists for the lifetime of the Node.js process.
// Works perfectly for a single-instance server (local dev, VPS, Docker).
// For multi-instance deployments, swap this for a Redis pub/sub or Supabase channel.

interface JobHandler {
  /** Push a JSON payload down the SSE pipe */
  send:    (data: Record<string, unknown>) => void
  /** Send final payload then close the stream */
  finish:  (data: Record<string, unknown>) => void
  /** Cancel timers and remove the entry */
  cleanup: () => void
}

export const refreshJobs = new Map<string, JobHandler>()
