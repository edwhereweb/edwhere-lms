# 08 — Onboarding Notes

The "stick this on the wall" doc. Read it once on day one, come back to it when you're stuck.

## 1. Architecture sketch (one screen)

```
                     ┌──────────────────────────────────────────────┐
                     │          Next.js 14 (App Router)             │
   Browser ──HTTP──▶ │  middleware.ts (Clerk)                       │
                     │  app/                                        │
                     │   ├── (public)/   marketing + catalog        │
                     │   ├── (auth)/     Clerk pages                │
                     │   ├── (dashboard)/ student + staff dashboards│
                     │   ├── (course)/   chapter player + chat      │
                     │   └── api/        REST handlers              │
                     │                                              │
                     │  actions/  server functions for SSR pages    │
                     │  lib/      db, env, validations, helpers     │
                     └─────────────────────┬────────────────────────┘
                                           │
        ┌─────────────┬───────────┬────────┴────────┬──────────────┬─────────────┐
        ▼             ▼           ▼                 ▼              ▼             ▼
    ┌───────┐    ┌─────────┐  ┌────────┐      ┌─────────┐    ┌────────┐    ┌─────────┐
    │ Clerk │    │ MongoDB │  │   R2   │      │   Mux   │    │ Razor  │    │ YouTube │
    │ auth  │    │ (Prisma)│  │ files  │      │ video   │    │  pay   │    │ embed   │
    └───────┘    └─────────┘  └────────┘      └─────────┘    └────────┘    └─────────┘
```

One deployable. No queues. No workers. State is externalised; the app is stateless save for one in-memory rate limiter.

## 2. Glossary of domain terms

| Term                  | Meaning                                                                                                           |
| --------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Profile**           | Local user mirror created lazily from Clerk on first login. Carries the role.                                     |
| **Role**              | One of `STUDENT`, `TEACHER`, `ADMIN`, `MARKETER`, `BLOGGER`. One per Profile.                                     |
| **Course**            | The unit a student pays for and progresses through.                                                               |
| **Module**            | Optional grouping of Chapters within a Course.                                                                    |
| **Chapter**           | A single learning unit. Has a `contentType` discriminator that drives rendering.                                  |
| **`contentType`**     | `VIDEO_MUX` \| `VIDEO_YOUTUBE` \| `TEXT` \| `HTML_EMBED` \| `PDF_DOCUMENT` \| `HANDS_ON_PROJECT` \| `EVALUATION`. |
| **Free chapter**      | A Chapter with `isFree=true` — accessible without a Purchase.                                                     |
| **Library asset**     | A Chapter flagged `isLibraryAsset=true`, surfaced in `/teacher/asset-library` for reuse across courses.           |
| **Purchase**          | A unique row per `(userId, courseId)`. Created either by Razorpay verify or admin manual enrol.                   |
| **Onboarding source** | `PAID` \| `MANUAL` \| `PAID_MANUAL` — how the Purchase came to be.                                                |
| **UserProgress**      | Per `(userId, chapterId)` row carrying `isCompleted`. The unit of "did the student finish this".                  |
| **Quiz / Question**   | An evaluation tied 1:1 to an `EVALUATION` chapter. Quiz config = `passScore`, `timeLimit`, `maxAttempts`, etc.    |
| **QuizAttempt**       | One sitting of a quiz. Multiple per user up to `maxAttempts`. Holds `score` once submitted.                       |
| **QuestionResponse**  | A student's answer to one question within an attempt.                                                             |
| **ProjectSubmission** | A student's Drive-URL submission for a `HANDS_ON_PROJECT` chapter. Status `PENDING\|APPROVED\|REJECTED`.          |
| **Mentor Connect**    | Per-course private chat between a student and the course's instructors/admins.                                    |
| **Lead**              | A row in the `Lead` collection — captured from the contact form or entered by a marketer.                         |
| **Pending approval**  | A teacher-submitted course awaiting an admin to publish. Shown at `/teacher/pending-approvals`.                   |
| **Web visibility**    | `isWebVisible` toggle that hides a published course from the public catalog while still allowing direct enrol.    |
| **Asset Library**     | The reusable-chapter index used to import content into another course.                                            |
| **Direct Upload**     | Mux's pattern: server creates an upload, client PUTs the file directly to Mux.                                    |
| **Presigned URL**     | An R2/S3 URL that lets the browser PUT or GET a file without our server intermediating the bytes.                 |
| **`SafeProfile`**     | A serialisable version of the Profile (Dates → ISO strings) used in client-rendered contexts.                     |

## 3. Critical services / modules cheat sheet

If you can only memorise five things in the codebase, memorise these:

1. **`lib/db.ts`** — the only `PrismaClient`. Always import `db` from here.
2. **`lib/validations.ts`** — every Zod schema lives here. Add new ones here.
3. **`lib/api-utils.ts`** — `apiError`, `validateBody`, `handleApiError`. Every route uses them.
4. **`middleware.ts`** — public-route allowlist. If your new route should be public, add it here.
5. **`AGENTS.md`** (repo root) — the binding contract for code style and patterns.

For most "where does X live" questions, the answer is one of:

- `app/api/...` (mutations & server reads from clients).
- `actions/...` (reads from Server Components).
- `lib/...` (everything shared).
- `components/...` (shared UI) or `_components/` next to a page (page-specific UI).

## 4. Common commands cheat sheet

```bash
# Daily loop
npm run dev                  # http://localhost:3000
npm run lint                 # ESLint
npm run lint:fix             # auto-fix
npm run format               # prettier --write .
npx tsc --noEmit             # type-check without building

# Database
npx prisma db push           # apply schema changes (no migrations on Mongo)
npx prisma generate          # regenerate the client (after editing schema.prisma)
npx prisma studio            # visual DB browser at :5555
npx prisma migrate reset     # ⚠️ wipes DB; works on Mongo with caveats

# Seeding
node scripts/seed.cjs                               # categories
node scripts/seed-blogs.js                          # blog content (optional)
npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/seed-categories.ts

# Build / prod
npm run build
npm run start

# Husky / lint-staged
npm run prepare              # one-time husky setup (auto via postinstall)
```

When ENV is misconfigured the app exits at boot with a Zod error; read the message — it names the offending var.

## 5. Known sharp edges (read this before debugging)

These are real footguns in the codebase. None are bugs you have to fix to use the system; they're things you should know about.

1. **Two flavors of "user id".** `Clerk userId` (string from Clerk) and `Profile._id` (Mongo ObjectId). Different columns use different ones. See the table in [03-data-model.md §2](./03-data-model.md#2-identity-columns). Mixing them silently returns empty results.
2. **Mux processing has no webhook.** Convergence is via client polling on `/api/admin/asset-library/mux-upload/[uploadId]`. If the user closes the tab, processing still completes on Mux but our DB only updates on the next page load that re-polls.
3. **Razorpay verification has no webhook either.** A user closing the tab between payment and verify leaves a paid order with no `Purchase` row. ADMIN can manually enrol via `/teacher/enrolments`.
4. **Rate limiter is in-memory.** `lib/rate-limit.ts` is per-process. Multi-instance deployments lose protection. Only `/api/contact` uses it today.
5. **R2 cleanup is best-effort.** Course/chapter delete handlers iterate known R2 keys and ignore `NoSuchKey`. Periodic orphan sweeps may be needed.
6. **`Logging` collection grows forever.** No TTL. Add one in Atlas if you enable wider request logging.
7. **`prisma migrate reset` against Mongo Atlas** sometimes errors at the end but typically still drops + recreates collections. Re-seed after.
8. **`pendingApproval=true && isPublished=true`** is an illegal state; the API doesn't produce it but a manual DB edit can. Guard against this if you're scripting.
9. **`Chapter.position` uniqueness is application-enforced**, not DB-enforced. A failed reorder mid-loop can leave duplicate positions; re-run reorder to fix.
10. **`maxTabSwitches` on quizzes is stored, not enforced.** Treat as advisory until/unless the submit route checks it.
11. **The `RazorpayCustomer` table exists but isn't actively used.** Don't write code that depends on it being populated.
12. **Slug uniqueness on `Course.slug` is checked in code, not by a DB index.** Manual edits can introduce duplicates.
13. **No tests.** There is no Jest/Vitest/Playwright. Manual + type/lint checks only. If you add tests, set up CI for them.
14. **Don't import server-only helpers from a client component.** Anything that touches `db`, env vars, or third-party SDKs is server-only. Mistakes here surface as confusing build errors.
15. **`router.refresh()` is mandatory after mutations** — without it, Server Component data stays stale and users think the change didn't happen.

## 6. Common commands during incidents

| Need                                         | Command / location                                                              |
| -------------------------------------------- | ------------------------------------------------------------------------------- |
| Check service health                         | `curl http://localhost:3000/api/health` or your prod equivalent.                |
| Inspect a Profile row                        | `npx prisma studio` → Profile collection.                                       |
| Promote yourself to ADMIN                    | Edit `Profile.role = "ADMIN"` in Studio.                                        |
| See recent API errors (when logging enabled) | Mongo `Logging` collection, sort by `createdAt` desc.                           |
| Re-trigger Mux backfill manually             | `curl /api/admin/asset-library/mux-upload/<uploadId>` while signed in as ADMIN. |
| Check Razorpay payment status                | Razorpay dashboard → Payments → search by order id.                             |
| Check R2 object existence                    | Cloudflare R2 dashboard → bucket → search by key.                               |
| List a course's published chapters quickly   | Studio → Chapter → filter `courseId = ...`, `isPublished = true`.               |
| Force a profile to be re-created             | Delete the Profile row in Studio; the next request will recreate it.            |

## 7. Open questions / known unknowns

These are things the codebase doesn't currently address, where opinions or future product decisions are required:

- **Course unpublish from "Published" → "Draft"**: there's an `unpublish` route, but no UI affordance for teachers post-approval. Decide whether teachers can unpublish their own published courses.
- **Refund handling**: refunds happen out of band on Razorpay. Should there be an admin button to "refund + unenrol" in one go?
- **Project re-submissions auto-clearing review state**: a re-submission today leaves the previous `status` (e.g. `APPROVED`) intact. Should it reset to `PENDING`?
- **Mentor chat retention**: chat is append-only. Define a retention policy if regulatory compliance ever matters.
- **Course pricing in non-INR currencies**: not currently supported. Adding this is non-trivial (touches checkout, verify, schema, formatter, validations).
- **Webhook receivers**: middleware allows `/api/webhook/*` but none are implemented. If we ever switch Mux/Razorpay to webhook-driven convergence, that's the prefix to use.
- **Rate limiting in production**: the in-memory limiter is insufficient at scale. Consider Cloudflare's WAF rate limiting or a Redis-backed solution.
- **Email notifications**: there are none. Manually enrolled students aren't emailed; lead status changes aren't emailed; new mentor chat messages aren't emailed. Decide if/which need wiring up.
- **Audit logging**: `Logging` exists but is only used selectively. Decide whether ADMIN actions should always be logged.
- **`maxTabSwitches` enforcement**: client-only today. Decide whether to enforce server-side.
- **`Logging` retention**: add a TTL policy.
- **Multiple instructors as owners**: today there's exactly one owner per course (`Course.userId`). Co-owners exist via `CourseInstructor` but with the same edit power; semantics are slightly fuzzy.
- **Cloud storage region for R2**: not specified in code; relies on R2 defaults. If latency becomes a concern, configure region.

## 8. Recipes for common tasks

### Add a new role

1. Add the value to the `MemberRole` enum in `prisma/schema.prisma`.
2. `npx prisma db push && npx prisma generate`.
3. Create a `lib/<role>.ts` helper following the pattern of `lib/teacher.ts`.
4. Add UI gates in `components/navbar-routes.tsx`, `app/(dashboard)/_components/sidebar-routes.tsx`, and a `(routes)/<role>/layout.tsx` that hard-redirects unauthorised users.
5. Update `app/api/profile/[id]/route.ts` if your role should be assignable by ADMIN.
6. Document the role in [02-domain-model.md §1](./02-domain-model.md#1-actors-and-roles).

### Add a new chapter content type

1. Add the string discriminator to the player-side switch in `app/(course)/courses/[courseId]/chapters/[chapterId]/page.tsx`.
2. Create or reuse a `_components/<type>-...` component to render it.
3. Add an editor sub-form in `app/(dashboard)/(routes)/teacher/courses/[courseId]/chapters/[chapterId]/_components/chapter-content-form.tsx`.
4. Decide what "completion" means for this content type and wire it (mark-complete button, auto-mark on event, etc.).
5. Add the new content type to the chapter publish validation if it requires data to exist.
6. Update `Chapter.contentType` notes in [02-domain-model.md §2](./02-domain-model.md#2-the-course-content-hierarchy).

### Add a new upload type

See [R2-IMPLEMENTATION.md](./R2-IMPLEMENTATION.md) — it has a step-by-step. Touchpoints: `lib/validations.ts` (UploadType enum + content types + max size), `app/api/upload/presign/route.ts` (key construction + role check), `app/api/files/[...path]/route.ts` (ACL branch if `private/`), and the calling component.

### Add a new API endpoint

See [05-backend-api.md §7](./05-backend-api.md#7-how-to-add-a-new-endpoint-cheat-sheet).

### Add a new env var

1. Add to `lib/env.ts` (Zod schema).
2. Add to `.env.example`.
3. Add to `.github/workflows/ci.yml`.
4. Use via the validated `env` import — never `process.env.X` directly in code.

### Promote a user to ADMIN locally

```js
// in mongosh / Atlas Compass
db.Profile.updateOne({ email: 'you@example.com' }, { $set: { role: 'ADMIN' } });
```

Then sign out and sign back in (or `router.refresh()`).

## 9. FAQs

**Q: I changed `schema.prisma`, but my queries don't typecheck.**
A: You forgot `npx prisma generate`. Run it.

**Q: My Server Component's data is stale after a mutation.**
A: Did you `router.refresh()` after the API call? Server Components cache their snapshot until told otherwise.

**Q: The build is failing with "missing env var X".**
A: `lib/env.ts` is rejecting your environment. Check `.env` (or your hosting environment) against `.env.example`.

**Q: I can't upload a file — the browser console says CORS.**
A: R2 bucket CORS isn't set for your origin. Add it in the Cloudflare dashboard.

**Q: A student paid but isn't enrolled.**
A: They likely closed the tab between payment and verify, or verify failed. Check Razorpay dashboard for the order; manually enrol via `/teacher/enrolments` if confirmed paid.

**Q: A chapter video is "processing" forever.**
A: Open `/api/admin/asset-library/mux-upload/<uploadId>` directly to see Mux's current status. If Mux failed, delete the chapter's `MuxData` and re-upload.

**Q: I need to add `console.log` for debugging.**
A: Use `debug('TAG', value)` from `lib/debug.ts`. It's gated by `ENABLE_DEBUG_LOGS`. Don't commit raw `console.log`.

**Q: Where's the test suite?**
A: There isn't one. Lint + type-check are the safety net. Manual smoke testing for everything else.

**Q: Is there a CI?**
A: A `.github/workflows/ci.yml` exists that runs lint/typecheck. There's no test runner. Don't add one without product/team alignment.

**Q: How do I reset the local DB?**
A: `npx prisma migrate reset` (Mongo will sometimes error at the end but it usually still works). Then re-run the seed scripts.
