# 07 — Third-party Integrations

A focused tour of every external service this app depends on: what it does for us, where it lives in code, what we trust it for, and what to watch out for.

The five integrations: **Clerk**, **MongoDB Atlas**, **Cloudflare R2**, **Mux**, **Razorpay**.

## 1. Clerk — Identity & Sessions

### What it does for us

- Hosts sign-in / sign-up UI.
- Issues sessions (cookies) consumed via `auth()` and middleware.
- Source of truth for `userId`, `email`, `name`, `imageUrl`.

### Where it lives in code

| File                                                  | Role                                                       |
| ----------------------------------------------------- | ---------------------------------------------------------- |
| `middleware.ts`                                       | Public route allowlist; everything else `auth.protect()`.  |
| `app/(auth)/(routes)/sign-in/[[...sign-in]]/page.tsx` | Renders Clerk's sign-in component.                         |
| `app/(auth)/(routes)/sign-up/[[...sign-up]]/page.tsx` | Renders Clerk's sign-up component.                         |
| `lib/current-profile.ts`                              | `auth()` → `userId` → upsert local `Profile`.              |
| `actions/get-safe-profile.ts`                         | Same, returns serialisable `SafeProfile`.                  |
| `app/api/admin/courses/[courseId]/enrol/route.ts`     | Calls `clerkClient.users.createUser` to mint new accounts. |

### Env vars

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL` (`/sign-in`)
- `NEXT_PUBLIC_CLERK_SIGN_UP_URL` (`/sign-up`)
- `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL`
- `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL`

### How we mirror Clerk → Profile

On the first authenticated request for a new Clerk user, we lazily create a `Profile` row in MongoDB. Fields copied: `name`, `email`, `imageUrl`. Default role: `STUDENT`. We then keep `lastLoginAt` and `lastLoginIp` updated opportunistically.

We do **not** consume Clerk webhooks. If a Clerk user's email/name changes upstream, the local `Profile.email`/`name` will drift. There's currently no sync.

### Things to be careful about

- **Clerk userId vs Profile id confusion**, see [03-data-model.md §2](./03-data-model.md#2-identity-columns). `userId` columns hold Clerk strings; `profileId` columns hold Mongo ObjectIds.
- **Account deletion in Clerk** does not cascade to MongoDB. The Profile and downstream rows linger.
- **Role changes** are app-side only. Clerk doesn't know roles.
- **Multi-session / org features** of Clerk are not used.

---

## 2. MongoDB Atlas — Primary data store

### What it does for us

Stores all structured data: profiles, courses, chapters, modules, purchases, quizzes, attempts, messages, leads, blog posts.

### Where it lives in code

| File                      | Role                                                    |
| ------------------------- | ------------------------------------------------------- |
| `prisma/schema.prisma`    | Source of truth for the schema; `provider = "mongodb"`. |
| `lib/db.ts`               | The Prisma singleton. **Only** instantiation point.     |
| `lib/env.ts`              | Validates `DATABASE_URL` at boot.                       |
| `app/api/health/route.ts` | DB ping for liveness.                                   |

### Env vars

- `DATABASE_URL` — Mongo Atlas connection string. Must point to a replica set.

### Key facts

- MongoDB + Prisma uses `prisma db push` (no migration files). See [03-data-model.md](./03-data-model.md).
- Transactions are available because Atlas is a replica set. We don't use them heavily; most writes are single-document.
- `previewFeatures = ["fullTextSearch", "fullTextIndex"]` enables `@@fulltext([title])` on `Course`.
- The Prisma generated client is large (~MB). Don't `import { ... } from '@prisma/client'` from client components.

### Operational concerns

- **Connection pool** is managed by Prisma. On serverless platforms, every cold start opens a new pool. The `lib/db.ts` singleton uses `globalThis` to reuse the client in dev; production behaviour depends on Vercel's instance lifecycle. Keep an eye on Atlas's connection count.
- **Atlas backups**: configure on the Atlas side. There's nothing in this repo that handles backups.
- **Indexes**: `prisma db push` creates them. If you add a `@@index`, redeploy and run `db push`.

### Things to be careful about

- Don't write to Mongo via a different driver. Always Prisma.
- Don't bypass cascade by raw deletes — you can orphan rows.
- The `Logging` collection grows forever. Add a TTL index in Atlas if needed.

---

## 3. Cloudflare R2 — File storage

A full deep-dive lives in [`R2-IMPLEMENTATION.md`](./R2-IMPLEMENTATION.md). Below is the short version.

### What it does for us

Stores all user-uploaded files: profile images, course/blog images, course attachments, chapter PDFs, question images. R2 is S3-compatible, so we use the AWS S3 SDK.

### Where it lives in code

| File                               | Role                                                                            |
| ---------------------------------- | ------------------------------------------------------------------------------- |
| `lib/r2.ts`                        | S3 client + presigned URL generators + `getObject` proxy + `urlToR2Key` helper. |
| `app/api/upload/presign/route.ts`  | Generates presigned PUT URLs scoped to upload type and user role.               |
| `app/api/files/[...path]/route.ts` | Streams R2 objects to clients with in-handler ACL.                              |
| `components/file-upload.tsx`       | Client widget that does presign → PUT → onChange.                               |
| `lib/validations.ts`               | `UploadType` enum, `ALLOWED_CONTENT_TYPES`, `MAX_FILE_SIZES`.                   |

### Env vars

- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`

### Key shape conventions

- `public/...` keys are served without authentication (e.g. course thumbnails for the public catalog).
- `private/...` keys require role/enrolment checks in the file proxy handler.
- Specific prefixes (e.g. `private/courses/<id>/attachments/...`) are used to derive the ACL.

The single bucket is split via prefix; we don't use multiple buckets.

### Things to be careful about

- **CORS**: R2 bucket needs CORS allowing your origin for `PUT`, `GET`, `HEAD`. Without it, browser uploads fail.
- **Key tampering on `private/...`**: the ACL inspects the key path. If you introduce a new private key shape, **add an ACL branch in the file proxy handler** before deploying.
- **Orphans on delete**: best-effort. If you add a new resource that owns R2 objects, follow the cleanup pattern in `app/api/courses/[courseId]/route.ts` (DELETE handler).
- **No CDN configured in code**. R2 has its own CDN; the proxy route has `Cache-Control` headers but if you need bigger scale, front it with a CDN.

For the full picture (key conventions per upload type, how to add a new upload type, ACL extension points), see [R2-IMPLEMENTATION.md](./R2-IMPLEMENTATION.md).

---

## 4. Mux — Video upload, encoding, streaming

### What it does for us

Direct uploads from the browser, server-side processing, HLS/dash streaming, and `mux-player-react` on the consumption side. We do **not** put videos in R2.

### Where it lives in code

| File                                                                                | Role                                                                              |
| ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `app/api/courses/[courseId]/chapters/[chapterId]/mux-upload/route.ts`               | Create Direct Upload + persist `MuxData` row.                                     |
| `app/api/admin/asset-library/mux-upload/route.ts`                                   | Same, but for "asset library" videos.                                             |
| `app/api/admin/asset-library/mux-upload/[uploadId]/route.ts`                        | Polling endpoint to backfill `assetId`/`playbackId` once Mux finishes processing. |
| `app/api/courses/[courseId]/chapters/[chapterId]/route.ts`                          | DELETE: deletes Mux asset (if not used elsewhere).                                |
| `app/(course)/courses/[courseId]/chapters/[chapterId]/_components/video-player.tsx` | Wraps `@mux/mux-player-react`.                                                    |

### Env vars

- `MUX_TOKEN_ID`
- `MUX_TOKEN_SECRET`

### How videos appear in the UI

- `Chapter.contentType === 'VIDEO_MUX'` and `MuxData.playbackId` exists → render Mux Player using `https://stream.mux.com/<playbackId>.m3u8`.
- During processing, `playbackId` is `null` and the UI shows a "processing" state. Client polls the asset-library polling route to check.

### Things to be careful about

- **Direct upload URLs are short-lived.** If a teacher gets a presign and waits a long time, the upload URL may expire. Re-issue.
- **Asset deletion** is only safe when no other chapter references the same `assetId`. The chapter delete handler checks this. Replicate in any new code path that prunes Mux assets.
- **No webhooks configured.** All convergence is polling-based.
- **Orphans on Mux**: if processing fails or our DB write fails after Mux upload, the asset can linger. Periodic Mux dashboard cleanup may be needed.
- **Bandwidth/storage cost** is on Mux. Watch the free-tier limits in production.

---

## 5. Razorpay — Payments

### What it does for us

Hosts the payment modal, processes payment, and provides an API for order creation + signature verification. INR only. We never touch card data.

### Where it lives in code

| File                                                                                        | Role                                                |
| ------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| `lib/razorpay.ts`                                                                           | Lazy-initialised Razorpay SDK client (server-side). |
| `app/api/courses/[courseId]/checkout/route.ts`                                              | Create order, return order details + public key.    |
| `app/api/razorpay/verify/route.ts`                                                          | HMAC verify + cross-check + create `Purchase`.      |
| `app/(course)/courses/[courseId]/chapters/[chapterId]/_components/course-enroll-button.tsx` | Loads the Razorpay browser SDK and opens the modal. |

### Env vars

- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `NEXT_PUBLIC_RAZORPAY_KEY_ID` (same as `RAZORPAY_KEY_ID`, exposed to browser)

### The verify protocol (don't get it wrong)

This is repeated in [06-critical-paths.md §3](./06-critical-paths.md#3-payment--purchase-the-revenue-path). The non-negotiables:

1. Recompute HMAC SHA-256 of `${order_id}|${payment_id}` using the secret. Reject mismatches.
2. **Do not trust client-supplied `courseId`/`userId` for who-pays-for-what.** Re-fetch the order from Razorpay and read `notes.courseId` / `notes.userId`. These were set by us at order-creation time and Razorpay will return them verbatim.
3. Verify `notes.userId === auth().userId`.
4. Cross-check the paid amount against the **current** course price.

If you ever need to change the verify route, write a test plan that includes: a malicious user trying to substitute `courseId`, a teacher changing the price between checkout and verify, and a duplicate-purchase race.

### Test mode

- Use `rzp_test_*` keys.
- Card `4111 1111 1111 1111`, any CVV, any future expiry.
- Razorpay test dashboard is at https://dashboard.razorpay.com/app/payments and has its own filter for test vs live.

### Things to be careful about

- **No webhooks configured.** A user closing the tab between payment and verify means an orphan paid order with no Purchase row. Mitigate via admin manual enrolment.
- **Currency is hardcoded INR.** Adding another currency requires touching `checkout`, `verify`, the price column, the UI formatter (`lib/format.ts`), and the validation schemas.
- **Refunds** are out of band — done from the Razorpay dashboard. The `Purchase` row stays unless an admin removes it via the unenrol endpoint.
- **The `RazorpayCustomer` table exists but isn't actively used by current flows.** Don't rely on it being populated.

---

## 6. (Implicit) YouTube — Embedded only

We don't use the YouTube API. `Chapter.youtubeVideoId` is a string the teacher pastes, and the player embeds the standard `youtube.com/embed/<id>` iframe. There are no env vars and no failure modes from our side beyond YouTube serving the embed.

---

## 7. (Implicit) Vercel — Hosting

The README points at Vercel as the deployment target, but there's no Vercel-specific code in this repo. The app is a standard Next.js build. Anything that runs Next.js 14 will host it (Vercel, Netlify, AWS Amplify, a self-managed Node server). Per `AGENTS.md`, **don't** add Dockerfiles or CI/CD configs unless asked.

---

## 8. SDK initialisation pattern (every integration follows this)

To avoid build-time crashes when env vars are missing, every 3rd-party SDK is lazy-initialised via a getter:

```typescript
// lib/r2.ts (sketch)
let _client: S3Client | null = null;

export function getR2Client(): S3Client {
  if (_client) return _client;
  _client = new S3Client({ region: 'auto', endpoint: ..., credentials: { ... } });
  return _client;
}
```

The same pattern is used in `lib/razorpay.ts`. **Never** instantiate at module top-level — that pattern crashes on `next build` if env vars aren't yet configured.

When you add a new SDK:

1. Put env reads inside the getter, not at the top of the file.
2. Keep `_client` module-private.
3. Use a clear name like `getMyServiceClient()`.

---

## 9. Quick "where would I check this?" map

| Symptom                                               | Look here                                                                          |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Sign-in loop / 401s                                   | `middleware.ts`, Clerk dashboard, `lib/env.ts` (publishable key), browser console. |
| User signed in but `Profile` missing                  | `lib/current-profile.ts`, MongoDB Atlas Profile collection.                        |
| File upload stuck or CORS error                       | R2 bucket CORS settings, browser network tab, `app/api/upload/presign/route.ts`.   |
| File 403 on `/api/files/private/...`                  | `app/api/files/[...path]/route.ts` ACL branches.                                   |
| Video stuck on "processing"                           | Mux dashboard for the asset, polling endpoint response.                            |
| Payment marked successful in Razorpay but no Purchase | `/api/razorpay/verify` server logs (tag `RAZORPAY_VERIFY`).                        |
| Course missing from public catalog                    | `Course.isPublished`, `Course.isWebVisible`, `Course.pendingApproval`.             |
| Pre-existing user can't be promoted                   | `/api/profile/[id]` requires ADMIN to change `role`. Check caller's role.          |
| DB connection errors                                  | Atlas IP allowlist, `DATABASE_URL`, Atlas cluster status.                          |
