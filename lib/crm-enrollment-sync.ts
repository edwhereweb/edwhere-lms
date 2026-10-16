import { clerkClient } from '@clerk/nextjs/server';
import type { CrmEnrollmentSync } from '@prisma/client';
import { db } from '@/lib/db';
import { logError } from '@/lib/debug';
import { isEnrollmentCrmConfigured, sendEnrollmentWhatsApp } from '@/lib/wacrm';
import {
  buildDedupeKey,
  computeNextAttemptAt,
  errorCodeForStatus,
  getMaxAttempts,
  getSyncBatchSize,
  normalizePhone,
  truncateError
} from '@/lib/crm-sync-utils';

const LOCK_LEASE_MS = 5 * 60 * 1000;
const BACKFILL_PAGE_SIZE = 200;
const NO_PHONE = 'NO_PHONE';

export type SyncOutcome =
  | 'sent'
  | 'failed'
  | 'already_sent'
  | 'exhausted'
  | 'not_due'
  | 'locked'
  | 'missing'
  | 'not_configured';

export interface EnrollmentRef {
  userId: string;
  courseId: string;
  purchaseId?: string | null;
  batchId?: string | null;
}

/** Structured, secret-free log line for LMS → CRM sync diagnostics. */
function logSync(event: string, fields: Record<string, unknown>) {
  console.info(JSON.stringify({ tag: 'CRM_SYNC', event, ...fields }));
}

/**
 * Records that an enrollment must be delivered to the CRM. Idempotent on
 * (userId, courseId). Never throws so it can't break an enrollment flow.
 */
export async function enqueueEnrollmentSync(ref: EnrollmentRef): Promise<CrmEnrollmentSync | null> {
  try {
    const dedupeKey = buildDedupeKey(ref.userId, ref.courseId);
    return await db.crmEnrollmentSync.upsert({
      where: { dedupeKey },
      create: {
        dedupeKey,
        userId: ref.userId,
        courseId: ref.courseId,
        purchaseId: ref.purchaseId ?? null,
        batchId: ref.batchId ?? null
      },
      update: {}
    });
  } catch (error) {
    logError('CRM_SYNC_ENQUEUE', error);
    return null;
  }
}

/**
 * Enqueues then attempts one immediate delivery so students normally see the
 * message right away. Failures stay on the queue for retry/reconcile.
 */
export async function enqueueAndProcessEnrollments(refs: EnrollmentRef[]): Promise<void> {
  for (const ref of refs) {
    try {
      const job = await enqueueEnrollmentSync(ref);
      if (job) await processSyncJob(job.id);
    } catch (error) {
      logError('CRM_SYNC_ENQUEUE_PROCESS', error);
    }
  }
}

async function resolvePhone(userId: string, profilePhone: string | null): Promise<string | null> {
  if (profilePhone && normalizePhone(profilePhone)) return profilePhone;
  if (userId.startsWith('pending_')) return null;
  try {
    const user = await (await clerkClient()).users.getUser(userId);
    return user.phoneNumbers?.[0]?.phoneNumber ?? null;
  } catch {
    return null;
  }
}

async function markFailed(
  job: CrmEnrollmentSync,
  fields: { code: string; message: string; phoneRaw?: string | null; phoneNormalized?: string }
) {
  const attemptsMade = job.attempts + 1;
  const maxAttempts = getMaxAttempts();
  const nextAttemptAt = computeNextAttemptAt(attemptsMade, new Date(), maxAttempts);
  const message = nextAttemptAt
    ? fields.message
    : `Max attempts (${maxAttempts}) exceeded: ${fields.message}`;

  await db.crmEnrollmentSync.update({
    where: { id: job.id },
    data: {
      syncStatus: 'FAILED',
      attempts: attemptsMade,
      lastAttemptAt: new Date(),
      lastErrorCode: fields.code,
      lastErrorMessage: truncateError(message),
      nextAttemptAt,
      lockedUntil: null,
      ...(fields.phoneRaw !== undefined ? { phoneRaw: fields.phoneRaw } : {}),
      ...(fields.phoneNormalized !== undefined ? { phoneNormalized: fields.phoneNormalized } : {})
    }
  });
  return { attemptsMade, exhausted: nextAttemptAt === null };
}

/**
 * Delivers a single enrollment to the CRM. Safe to call repeatedly / concurrently:
 * SENT records are never re-sent and a lease prevents parallel workers from
 * sending the same enrollment twice.
 */
export async function processSyncJob(
  id: string,
  opts: { ignoreBackoff?: boolean } = {}
): Promise<SyncOutcome> {
  const job = await db.crmEnrollmentSync.findUnique({ where: { id } });
  if (!job) return 'missing';
  if (job.syncStatus === 'SENT') return 'already_sent';

  const maxAttempts = getMaxAttempts();
  if (job.attempts >= maxAttempts) return 'exhausted';

  const now = new Date();
  if (!opts.ignoreBackoff && job.nextAttemptAt && job.nextAttemptAt > now) return 'not_due';

  if (!isEnrollmentCrmConfigured()) {
    logSync('skipped_not_configured', {
      syncId: job.id,
      userId: job.userId,
      courseId: job.courseId
    });
    return 'not_configured';
  }

  const claim = await db.crmEnrollmentSync.updateMany({
    where: {
      id: job.id,
      syncStatus: { in: ['PENDING', 'FAILED'] },
      OR: [{ lockedUntil: null }, { lockedUntil: { lt: now } }]
    },
    data: { lockedUntil: new Date(now.getTime() + LOCK_LEASE_MS) }
  });
  if (claim.count === 0) return 'locked';

  const attempt = job.attempts + 1;
  const base = {
    syncId: job.id,
    enrollmentId: job.purchaseId,
    userId: job.userId,
    courseId: job.courseId,
    batchId: job.batchId,
    attempt
  };

  try {
    const [profile, course] = await Promise.all([
      db.profile.findUnique({
        where: { userId: job.userId },
        select: { name: true, phoneNumber: true }
      }),
      db.course.findUnique({
        where: { id: job.courseId },
        select: { title: true, whatsappGroupUrl: true }
      })
    ]);

    if (!profile || !course) {
      const code = !profile ? 'PROFILE_NOT_FOUND' : 'COURSE_NOT_FOUND';
      await markFailed(job, { code, message: code });
      logSync('failed', { ...base, errorClass: code });
      return 'failed';
    }

    const phoneRaw = await resolvePhone(job.userId, profile.phoneNumber);
    const phoneNormalized = normalizePhone(phoneRaw);
    if (!phoneNormalized) {
      await markFailed(job, {
        code: NO_PHONE,
        message: 'No phone number on profile; student cannot be created in CRM inbox',
        phoneRaw: phoneRaw ?? null,
        phoneNormalized: ''
      });
      logSync('failed', { ...base, errorClass: NO_PHONE });
      return 'failed';
    }

    const startedAt = Date.now();
    const result = await sendEnrollmentWhatsApp({
      phone: phoneNormalized,
      name: profile.name || 'Student',
      type: 'course',
      title: course.title,
      appDownloadLink:
        process.env.NEXT_PUBLIC_APP_DOWNLOAD_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? '',
      whatsappGroupUrl: course.whatsappGroupUrl,
      idempotencyKey: job.dedupeKey
    });
    const latencyMs = Date.now() - startedAt;

    if (result.ok) {
      await db.crmEnrollmentSync.update({
        where: { id: job.id },
        data: {
          syncStatus: 'SENT',
          attempts: attempt,
          phoneRaw,
          phoneNormalized,
          lastAttemptAt: new Date(),
          lastSuccessAt: new Date(),
          lastErrorCode: null,
          lastErrorMessage: null,
          nextAttemptAt: null,
          lockedUntil: null
        }
      });
      logSync('sent', { ...base, phoneNormalized, responseStatus: result.status, latencyMs });
      return 'sent';
    }

    const errorClass = errorCodeForStatus(result.status);
    const { exhausted } = await markFailed(job, {
      code: errorClass,
      message: result.body || errorClass,
      phoneRaw,
      phoneNormalized
    });
    logSync(exhausted ? 'failed_exhausted' : 'failed', {
      ...base,
      phoneNormalized,
      responseStatus: result.status,
      latencyMs,
      errorClass,
      hint: 'CRM rejected or did not receive the enrollment; check WACRM_API_URL/KEY, template id, and that the contact appears in the CRM account inbox'
    });
    return 'failed';
  } catch (error) {
    logError('CRM_SYNC_PROCESS', error);
    try {
      await markFailed(job, {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : String(error)
      });
    } catch (updateError) {
      logError('CRM_SYNC_PROCESS_MARK_FAILED', updateError);
    }
    logSync('failed', { ...base, errorClass: 'INTERNAL_ERROR' });
    return 'failed';
  }
}

/** Processes jobs that are PENDING/FAILED, within the retry budget and past their backoff. */
export async function processDueJobs(limit: number = getSyncBatchSize()) {
  const now = new Date();
  const jobs = await db.crmEnrollmentSync.findMany({
    where: {
      syncStatus: { in: ['PENDING', 'FAILED'] },
      attempts: { lt: getMaxAttempts() },
      OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }]
    },
    orderBy: { createdAt: 'asc' },
    take: limit,
    select: { id: true }
  });

  const counts: Record<string, number> = {};
  for (const { id } of jobs) {
    const outcome = await processSyncJob(id);
    counts[outcome] = (counts[outcome] ?? 0) + 1;
  }
  return { picked: jobs.length, outcomes: counts };
}

/**
 * Creates PENDING sync records for enrollments (Purchases) that have none.
 * Idempotent; safe to run repeatedly. With dryRun nothing is written.
 */
export async function backfillMissingSyncRecords(opts: { dryRun?: boolean; limit?: number } = {}) {
  const { dryRun = false, limit = Number.POSITIVE_INFINITY } = opts;
  let scanned = 0;
  let missing = 0;
  let created = 0;
  let cursor: string | undefined;

  while (missing < limit) {
    const page = await db.purchase.findMany({
      take: BACKFILL_PAGE_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: 'asc' },
      select: { id: true, userId: true, courseId: true }
    });
    if (page.length === 0) break;
    cursor = page[page.length - 1].id;
    scanned += page.length;

    const keys = page.map((p) => buildDedupeKey(p.userId, p.courseId));
    const existing = await db.crmEnrollmentSync.findMany({
      where: { dedupeKey: { in: keys } },
      select: { dedupeKey: true }
    });
    const existingKeys = new Set(existing.map((e) => e.dedupeKey));

    for (const purchase of page) {
      if (missing >= limit) break;
      if (existingKeys.has(buildDedupeKey(purchase.userId, purchase.courseId))) continue;
      missing += 1;
      if (dryRun) continue;
      const job = await enqueueEnrollmentSync({
        userId: purchase.userId,
        courseId: purchase.courseId,
        purchaseId: purchase.id
      });
      if (job) created += 1;
    }

    if (page.length < BACKFILL_PAGE_SIZE) break;
  }

  logSync('backfill', { dryRun, scanned, missing, created });
  return { dryRun, scanned, missing, created };
}

/**
 * Detects and repairs drift:
 *  1. enrollments with no sync record → create PENDING
 *  2. NO_PHONE failures whose profile now has a phone → reset to PENDING
 *  3. (optional) exhausted failures → reset to PENDING for a fresh retry budget
 *  4. deliver everything that is due
 */
export async function reconcileEnrollmentSync(
  opts: { dryRun?: boolean; resetExhausted?: boolean; limit?: number } = {}
) {
  const { dryRun = false, resetExhausted = false, limit = getSyncBatchSize() } = opts;

  const backfill = await backfillMissingSyncRecords({ dryRun, limit });

  let phoneRecovered = 0;
  const noPhone = await db.crmEnrollmentSync.findMany({
    where: { syncStatus: 'FAILED', lastErrorCode: NO_PHONE },
    take: limit
  });
  for (const job of noPhone) {
    const profile = await db.profile.findUnique({
      where: { userId: job.userId },
      select: { phoneNumber: true }
    });
    if (!normalizePhone(profile?.phoneNumber)) continue;
    phoneRecovered += 1;
    if (!dryRun) {
      await db.crmEnrollmentSync.update({
        where: { id: job.id },
        data: { syncStatus: 'PENDING', attempts: 0, nextAttemptAt: null, lastErrorMessage: null }
      });
    }
  }

  let exhaustedReset = 0;
  if (resetExhausted) {
    const exhausted = await db.crmEnrollmentSync.findMany({
      where: { syncStatus: 'FAILED', attempts: { gte: getMaxAttempts() } },
      take: limit,
      select: { id: true }
    });
    exhaustedReset = exhausted.length;
    if (!dryRun && exhausted.length > 0) {
      await db.crmEnrollmentSync.updateMany({
        where: { id: { in: exhausted.map((e) => e.id) } },
        data: { syncStatus: 'PENDING', attempts: 0, nextAttemptAt: null }
      });
    }
  }

  const processed = dryRun ? null : await processDueJobs(limit);
  const summary = { dryRun, backfill, phoneRecovered, exhaustedReset, processed };
  logSync('reconcile', summary);
  return summary;
}
