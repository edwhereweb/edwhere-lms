/**
 * Session upload deadline and MCQ shuffle utilities.
 *
 * All time logic is evaluated at request time — there is no background scheduler.
 * The IST timezone (Asia/Kolkata, UTC+5:30) is used for day-boundary calculations.
 */

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // +05:30 in ms

/**
 * Returns end-of-the-previous-day in IST as a UTC Date.
 * i.e., 23:59:59.999 IST the day before the session date.
 *
 * Example: session scheduledAt = 2025-06-15T09:00:00 UTC
 *   → IST = 2025-06-15T14:30:00 IST → session IST date = June 15
 *   → previous IST day end = June 14 23:59:59.999 IST = June 14 18:29:59.999 UTC
 */
export function getUploadDeadline(scheduledAt: Date): Date {
  // Convert scheduledAt to IST milliseconds
  const istMs = scheduledAt.getTime() + IST_OFFSET_MS;
  const istDate = new Date(istMs);

  // Get midnight IST of the session day (start of session day in IST)
  const midnightIst = Date.UTC(
    istDate.getUTCFullYear(),
    istDate.getUTCMonth(),
    istDate.getUTCDate(),
    0,
    0,
    0,
    0
  );

  // End of previous IST day = midnight IST - 1ms
  const endOfPreviousDayIst = midnightIst - 1;

  // Convert back to UTC
  return new Date(endOfPreviousDayIst - IST_OFFSET_MS);
}

/**
 * Returns true if an upload made at `now` would be considered late for the given session.
 */
export function isUploadLate(scheduledAt: Date, now: Date = new Date()): boolean {
  const deadline = getUploadDeadline(scheduledAt);
  return now > deadline;
}

/**
 * Returns the initial status for a new upload based on whether it is on-time or late.
 * On-time → APPROVED immediately (no admin action needed).
 * Late → PENDING (requires admin approval before students can see it).
 */
export function resolveUploadStatus(
  scheduledAt: Date,
  now: Date = new Date()
): 'APPROVED' | 'PENDING' {
  return isUploadLate(scheduledAt, now) ? 'PENDING' : 'APPROVED';
}

/**
 * Returns true if the MCQ window is open for a student.
 *
 * The window is: scheduledAt ≤ now ≤ (completedAt + 30 minutes).
 * If completedAt is null, the session is still ongoing and the window is open.
 */
export function isMcqWindowOpen(
  scheduledAt: Date,
  completedAt: Date | null,
  now: Date = new Date()
): boolean {
  if (now < scheduledAt) return false;

  if (completedAt === null) return true; // Session ongoing

  const windowEnd = new Date(completedAt.getTime() + 30 * 60 * 1000);
  return now <= windowEnd;
}

// ── Seeded MCQ shuffle ─────────────────────────────────────────────────────

/**
 * Simple seeded pseudo-random number generator (mulberry32).
 * Returns a function that generates numbers in [0, 1).
 */
function makePrng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s += 0x6d2b79f5;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Converts a string seed to a 32-bit integer via a simple hash.
 */
function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Generates a deterministic shuffle map for `count` questions.
 * The map is an array where map[displayIndex] = originalIndex.
 *
 * Same mcqId + userId always produces the same order, but different
 * students see different orderings — preventing copying.
 */
export function generateShuffleMap(mcqId: string, userId: string, count: number): number[] {
  const prng = makePrng(hashSeed(`${mcqId}:${userId}`));
  const indices = Array.from({ length: count }, (_, i) => i);

  // Fisher-Yates shuffle
  for (let i = count - 1; i > 0; i--) {
    const j = Math.floor(prng() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  return indices; // indices[displayPos] = originalPos
}

/**
 * Scores a submitted answer set.
 *
 * @param questions - Original (server-order) questions with correctOption
 * @param answers   - Student answers in shuffled display order
 * @param shuffleMap - map[displayPos] = originalPos
 */
export function scoreAnswers(
  questions: { correctOption: number }[],
  answers: number[],
  shuffleMap: number[]
): number {
  let correct = 0;
  for (let displayIdx = 0; displayIdx < answers.length; displayIdx++) {
    const originalIdx = shuffleMap[displayIdx];
    if (originalIdx === undefined) continue;
    const question = questions[originalIdx];
    if (question && answers[displayIdx] === question.correctOption) correct++;
  }
  return correct;
}
