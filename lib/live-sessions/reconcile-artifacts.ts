import type { LiveSession } from '@prisma/client';
import { db } from '@/lib/db';
import { debug } from '@/lib/debug';
import { env } from '@/lib/env';
import { isGoogleMeetEnabled } from '@/lib/integrations/google/auth';
import { shareFileWithUser } from '@/lib/integrations/google/drive';
import { listSpaceArtifacts } from '@/lib/integrations/google/meet';
import { computeBackoffMs, hasExhaustedRetries, type BackoffConfig } from './backoff';

const LEASE_MS = 5 * 60 * 1000;
const OPPORTUNISTIC_MIN_INTERVAL_MS = 60 * 1000;

let lastOpportunisticRun = 0;

function backoffConfig(): BackoffConfig {
  return {
    initialDelayMin: env.GOOGLE_MEET_RECONCILE_INITIAL_DELAY_MIN,
    maxDelayMin: env.GOOGLE_MEET_RECONCILE_MAX_DELAY_MIN,
    maxRetries: env.GOOGLE_MEET_RECONCILE_MAX_RETRIES
  };
}

/** Atomically takes the per-session lease; false if another invocation holds it. */
async function acquireLease(id: string, now: Date): Promise<boolean> {
  const { count } = await db.liveSession.updateMany({
    where: {
      id,
      artifactSyncStatus: 'PENDING',
      OR: [{ reconcileLeaseUntil: null }, { reconcileLeaseUntil: { lt: now } }]
    },
    data: { reconcileLeaseUntil: new Date(now.getTime() + LEASE_MS) }
  });
  return count === 1;
}

async function syncArtifacts(session: LiveSession): Promise<number> {
  if (!session.meetSpaceName) return 0;
  const meetingCode = session.meetSpaceName.replace(/^spaces\//, '');
  const artifacts = await listSpaceArtifacts(meetingCode);

  for (const artifact of artifacts) {
    if (artifact.driveFileId && artifact.type === 'RECORDING') {
      await shareFileWithUser(artifact.driveFileId, session.instructorEmail);
    }
    await db.sessionArtifact.upsert({
      where: {
        liveSessionId_type_providerArtifactId: {
          liveSessionId: session.id,
          type: artifact.type,
          providerArtifactId: artifact.providerArtifactId
        }
      },
      create: { liveSessionId: session.id, ...artifact },
      update: {
        driveFileId: artifact.driveFileId,
        url: artifact.url,
        durationSec: artifact.durationSec,
        availableAt: artifact.availableAt
      }
    });
  }
  return artifacts.filter((a) => a.type === 'RECORDING').length;
}

export async function processSession(session: LiveSession, now = new Date()) {
  const cfg = backoffConfig();
  try {
    const recordings = await syncArtifacts(session);
    if (recordings > 0) {
      await db.liveSession.update({
        where: { id: session.id },
        data: {
          artifactSyncStatus: 'READY',
          artifactNextRetryAt: null,
          artifactLastError: null,
          artifactsCheckedAt: now,
          reconcileLeaseUntil: null
        }
      });
      return 'READY' as const;
    }
    return await scheduleRetry(session, now, cfg, 'Recording not available yet');
  } catch (error) {
    debug('MEET_RECONCILE', session.id, error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return await scheduleRetry(session, now, cfg, message.slice(0, 500));
  }
}

async function scheduleRetry(session: LiveSession, now: Date, cfg: BackoffConfig, reason: string) {
  const nextCount = session.artifactRetryCount + 1;
  const exhausted = hasExhaustedRetries(nextCount, session.endedAt, now, cfg);
  await db.liveSession.update({
    where: { id: session.id },
    data: {
      artifactRetryCount: nextCount,
      artifactLastError: reason,
      artifactsCheckedAt: now,
      artifactSyncStatus: exhausted ? 'FAILED_TIMEOUT' : 'PENDING',
      artifactNextRetryAt: exhausted
        ? null
        : new Date(now.getTime() + computeBackoffMs(nextCount, cfg)),
      reconcileLeaseUntil: null
    }
  });
  return exhausted ? ('FAILED_TIMEOUT' as const) : ('PENDING' as const);
}

export interface ReconcileResult {
  scanned: number;
  processed: number;
  ready: number;
  failedTimeout: number;
  pending: number;
}

/** Processes a small batch of due sessions; safe to call concurrently. */
export async function reconcileDueSessions(
  opts: { sessionId?: string; batchSize?: number } = {}
): Promise<ReconcileResult> {
  const result: ReconcileResult = {
    scanned: 0,
    processed: 0,
    ready: 0,
    failedTimeout: 0,
    pending: 0
  };
  if (!isGoogleMeetEnabled()) return result;

  const now = new Date();
  const due = await db.liveSession.findMany({
    where: opts.sessionId
      ? { id: opts.sessionId, status: 'ENDED', artifactSyncStatus: 'PENDING' }
      : {
          status: 'ENDED',
          artifactSyncStatus: 'PENDING',
          artifactNextRetryAt: { lte: now },
          OR: [{ reconcileLeaseUntil: null }, { reconcileLeaseUntil: { lt: now } }]
        },
    orderBy: { artifactNextRetryAt: 'asc' },
    take: opts.batchSize ?? env.GOOGLE_MEET_RECONCILE_BATCH_SIZE
  });
  result.scanned = due.length;

  for (const session of due) {
    if (!(await acquireLease(session.id, now))) continue;
    const outcome = await processSession(session, now);
    result.processed += 1;
    if (outcome === 'READY') result.ready += 1;
    else if (outcome === 'FAILED_TIMEOUT') result.failedTimeout += 1;
    else result.pending += 1;
  }
  return result;
}

/** Fire-and-forget sweep triggered from normal traffic (throttled per instance). */
export function triggerOpportunisticReconcile(): void {
  if (!isGoogleMeetEnabled()) return;
  const now = Date.now();
  if (now - lastOpportunisticRun < OPPORTUNISTIC_MIN_INTERVAL_MS) return;
  lastOpportunisticRun = now;
  reconcileDueSessions({ batchSize: 5 }).catch((error) => debug('MEET_RECONCILE_TRIGGER', error));
}
