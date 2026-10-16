# LMS → CRM enrollment sync (runbook)

Every enrollment (a `Purchase`, unique per `userId + courseId`) gets a `CrmEnrollmentSync` row that tracks delivery of the enrollment message to the WACRM inbox.

## How it works

- **Enqueue** — every enrollment entry point (Razorpay verify + webhook, admin enrol, mobile admin enrol, batch enrol, mobile batch enrol/bulk) calls `enqueueAndProcessEnrollments` (`lib/crm-enrollment-sync.ts`). It upserts a `PENDING` row keyed by `enrollment:<userId>:<courseId>` and makes one immediate delivery attempt. It never throws, so enrollment flows are unaffected.
- **Process** (`processSyncJob`) — loads profile phone (falls back to Clerk), normalizes it to digits only, calls WACRM `POST /messages` with the enrollment template and an `Idempotency-Key` header, then sets `SENT` or `FAILED`.
- **Idempotency** — `SENT` rows are never re-sent, and a 5‑minute lease (`lockedUntil`) stops two workers sending the same enrollment concurrently. If WACRM accepts a request but the response is lost, one retry may duplicate the message; the `Idempotency-Key` header lets the CRM dedupe if it supports it.
- **Retry** — a failure sets `FAILED`, increments `attempts`, stores `lastErrorCode`/`lastErrorMessage`, and schedules `nextAttemptAt = base * 2^(attempts-1)` seconds (capped at 6h). After `CRM_SYNC_MAX_ATTEMPTS` the row stays `FAILED` with `nextAttemptAt = null` and a message starting `Max attempts (N) exceeded`.
- **Not configured** — if `WACRM_API_URL`/`WACRM_API_KEY`/`WACRM_ENROLLMENT_TEMPLATE_ID` are unset, rows stay `PENDING` (no attempts consumed) and are delivered once the env is fixed.

## Env vars

| Var                             | Default | Purpose                                                                                                                                |
| ------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `CRM_SYNC_MAX_ATTEMPTS`         | 5       | Attempts before a row stays `FAILED`                                                                                                   |
| `CRM_SYNC_BACKOFF_BASE_SECONDS` | 60      | Backoff base                                                                                                                           |
| `CRM_SYNC_BATCH_SIZE`           | 50      | Max rows processed/backfilled per run                                                                                                  |
| `CRM_SYNC_SECRET`               | unset   | Shared secret (≥16 chars) sent as `Authorization: Bearer <secret>` to the cron route; `CRON_SECRET` is also accepted (for Vercel cron) |

## Rollout

1. Deploy, then apply the schema: `npx prisma db push` (MongoDB; adds the `CrmEnrollmentSync` collection and indexes).
2. Set `CRM_SYNC_SECRET` and the other vars above.
3. Dry-run the backfill, then run it:
   ```
   curl -H "Authorization: Bearer $CRM_SYNC_SECRET" "$APP/api/cron/crm-enrollment-sync?mode=backfill&dryRun=1"
   curl -H "Authorization: Bearer $CRM_SYNC_SECRET" "$APP/api/cron/crm-enrollment-sync?mode=backfill"
   ```
   Backfill only creates `PENDING` rows (safe to repeat). It does not send anything.
4. Run reconcile to deliver them (repeat until `processed.picked` is 0; each call handles `CRM_SYNC_BATCH_SIZE` rows):
   ```
   curl -H "Authorization: Bearer $CRM_SYNC_SECRET" "$APP/api/cron/crm-enrollment-sync"
   ```
5. Schedule reconcile every ~15 minutes (an external scheduler, or a `vercel.json` cron `*/15 * * * *` on a plan that allows it; Vercel sends `CRON_SECRET`).

Backfilled historical enrollments will each receive the enrollment WhatsApp message. Check the volume with `dryRun=1` first.

## Reconcile (`GET|POST /api/cron/crm-enrollment-sync`)

Query params: `mode=reconcile|backfill` (default reconcile), `dryRun=1`, `resetExhausted=1`. Reconcile (1) creates missing rows, (2) resets `NO_PHONE` failures whose profile now has a phone, (3) with `resetExhausted=1` gives exhausted rows a fresh retry budget, (4) delivers due rows.

## Troubleshooting a missing inbox thread

Logs are single-line JSON with `"tag":"CRM_SYNC"` and fields: `syncId`, `enrollmentId`, `userId`, `courseId`, `batchId`, `phoneNormalized`, `attempt`, `responseStatus`, `latencyMs`, `errorClass`. Secrets are never logged.

1. Find the row: `CrmEnrollmentSync` by `userId` / `phoneNormalized`.
   - **no row** → enrollment predates the sync; run backfill/reconcile.
   - `PENDING` and never attempted → CRM env not configured, or reconcile not scheduled.
   - `FAILED` → read `lastErrorCode`:
     - `NO_PHONE` — profile has no phone; add one, then reconcile.
     - `HTTP_401/403` — `WACRM_API_KEY` wrong; `HTTP_404/400` — URL or template id wrong; `HTTP_5xx`/`NETWORK_ERROR` — CRM down/unreachable.
   - `SENT` → LMS delivered it; check the CRM side (`phone_normalized`, account, inbox filters).
2. After fixing the cause, run reconcile with `resetExhausted=1`.
