# 05 — Backend & API

This is the reference for everything server-side: route handler conventions, the helper toolbox, server actions used by Server Components, and a complete catalog of every API endpoint.

## 1. There is no separate backend

All server logic lives inside the same Next.js app:

- **Route Handlers** in `app/api/**/route.ts` are the REST surface. They are the only mutation entry points for the client.
- **Server Actions** in `actions/*.ts` are reusable async readers used by Server Components (and occasionally by route handlers).
- **`lib/*`** holds everything shared: DB client, env, validations, auth/role helpers, third-party SDK wrappers, utility functions.

There is no separate microservice, no GraphQL, no tRPC, no message broker. Everything is JSON over HTTP via the Next.js handler runtime.

## 2. The canonical route handler shape

Every API route is expected to follow this template (defined and enforced by `AGENTS.md`):

```typescript
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { validateBody, apiError, handleApiError } from '@/lib/api-utils';
import { mySchema } from '@/lib/validations';
import { db } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    // role / ownership checks here, e.g. isTeacher(), checkCourseEdit()

    const body = await req.json();
    const validation = validateBody(mySchema, body);
    if (!validation.success) return validation.response;

    // business logic with db / 3rd-party SDKs

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError('MY_ROUTE', error);
  }
}
```

Five rules to remember:

1. **Auth first.** `auth()` from Clerk → `userId`. 401 on missing.
2. **Role/ownership next.** Use the helpers in §3. Don't roll your own checks.
3. **Validate body with Zod.** Schemas live in `lib/validations.ts`, never inline.
4. **Errors via helpers.** `apiError(message, status)` for known errors; `handleApiError(tag, error)` in the catch.
5. **No top-level SDK init.** Lazy via getter (Mux, Razorpay, R2 already do this).

## 3. The helper toolbox (`lib/`)

### Auth & profile

| Helper                              | What it returns                                                              |
| ----------------------------------- | ---------------------------------------------------------------------------- |
| `auth()` (from Clerk)               | `{ userId, sessionId, ... }`. Use in routes & server components.             |
| `currentProfile()`                  | The local `Profile` row for the calling user, lazily creating it if missing. |
| `isTeacher()`                       | `true` if current Profile role is TEACHER or ADMIN.                          |
| `isMarketer()`                      | `true` if MARKETER or ADMIN.                                                 |
| `isBlogger()`                       | `true` if BLOGGER or ADMIN.                                                  |
| `canManageBlogs()`                  | `true` if BLOGGER, MARKETER, TEACHER, or ADMIN.                              |
| `canEditCourse(userId, courseId)`   | `true` if owner, instructor on the course, or ADMIN.                         |
| `checkCourseEdit(userId, courseId)` | Returns `null` on success or a `NextResponse` 401/403 ready to return.       |

### API utilities

| Helper                       | Use                                                                          |
| ---------------------------- | ---------------------------------------------------------------------------- | -------------------------------------------- |
| `apiError(message, status?)` | Returns `NextResponse.json({ error }, { status })`.                          |
| `validateBody(schema, body)` | `{ success: true, data }                                                     | { success: false, response: NextResponse }`. |
| `handleApiError(tag, error)` | Logs with `logError(tag, error)` and returns a 500 JSON. Use in every catch. |

### Data and integrations

| Helper                  | Use                                                                     |
| ----------------------- | ----------------------------------------------------------------------- |
| `db` (from `lib/db.ts`) | The Prisma singleton. **Never `new PrismaClient()`.**                   |
| `lib/r2.ts`             | All R2 / S3 access (presigned URLs, proxy reads, deletes, key parsing). |
| `lib/razorpay.ts`       | Lazy Razorpay client.                                                   |
| `lib/validations.ts`    | All Zod schemas + upload-type metadata.                                 |
| `lib/format.ts`         | `formatPrice` (INR), `stripHtml`.                                       |
| `lib/utils.ts`          | `cn` for Tailwind class joining.                                        |
| `lib/debug.ts`          | `debug(tag, ...)` (gated) and `logError(tag, error)`.                   |
| `lib/rate-limit.ts`     | In-memory sliding-window limiter (single-process, see sharp edges).     |
| `lib/logging.ts`        | Persist API logs to the `Logging` collection (used selectively).        |
| `lib/env.ts`            | Validated env vars via Zod (throws at boot if anything is missing/bad). |
| `lib/editor-utils.ts`   | Lowlight syntax highlighter setup.                                      |

## 4. Server actions (`actions/`)

These are async functions consumed by Server Components, returning the data they need to render.

| Action                             | Purpose                                                                                                                |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `actions/get-safe-profile.ts`      | Returns a `SafeProfile` (Date → ISO strings). Lazily creates the profile + Clerk-side mirror. Redirects to `/sign-in`. |
| `actions/get-chapter.ts`           | Bundle for the chapter player: chapter + course + muxData + attachments + nextChapter + userProgress + purchase.       |
| `actions/get-progress.ts`          | `getProgress(userId, courseId)` and `getProgressBatch(userId, courseIds)` — % completed published chapters.            |
| `actions/get-courses.ts`           | Public catalog query with optional `q` and `categoryId`, plus per-course progress for the current user.                |
| `actions/get-dashboard-courses.ts` | Splits user's purchased courses into in-progress vs completed buckets.                                                 |
| `actions/get-analytics.ts`         | Teacher revenue summary: total revenue, total sales, revenue grouped by course.                                        |

Server actions do **not** call API routes; they go straight to the DB. Conversely, API routes do not call server actions; they implement their own logic. There's no double-routing.

## 5. The full API catalog

Conventions used in the table:

- **Auth**: who can call. `Public` = no Clerk session needed (matched by middleware `isPublicRoute`). Otherwise an authenticated session is required and the listed role/ownership check applies.
- **Verbs**: HTTP methods exposed by the file.

### Public / unauthenticated

| Path                         | Verbs | Purpose                                                                         |
| ---------------------------- | ----- | ------------------------------------------------------------------------------- |
| `/api/health`                | GET   | DB ping. Returns `{ status: 'healthy' }` on success.                            |
| `/api/contact`               | POST  | Public contact form → creates a `Lead` (rate-limited per IP).                   |
| `/api/files/[...path]`       | GET   | R2 file proxy. `public/*` keys open; `private/*` keys gated by enrollment/role. |
| `/api/public/courses`        | GET   | Public-friendly course list (slim shape, server-side caching-friendly).         |
| `/api/public/courses/[slug]` | GET   | Public course detail by slug.                                                   |

### Profiles & users

| Path                   | Verbs | Auth / Role                                 | Purpose                                                                           |
| ---------------------- | ----- | ------------------------------------------- | --------------------------------------------------------------------------------- |
| `/api/profile/[id]`    | PATCH | Self or ADMIN; only ADMIN can change `role` | Update profile (name, image, bio, role).                                          |
| `/api/profiles/search` | GET   | Authed (used by admin/teacher tooling)      | Search profiles by name/email — used by instructor add and admin enrolment flows. |

### Courses (CRUD + lifecycle)

| Path                                | Verbs  | Auth / Role     | Purpose                                                  |
| ----------------------------------- | ------ | --------------- | -------------------------------------------------------- |
| `/api/courses`                      | POST   | `isTeacher`     | Create a draft course (title only).                      |
| `/api/courses/[courseId]`           | PATCH  | `canEditCourse` | Update course fields. Cleans up replaced R2 image.       |
| `/api/courses/[courseId]`           | DELETE | `canEditCourse` | Delete course + R2 + Mux cleanup (best-effort).          |
| `/api/courses/[courseId]/publish`   | PATCH  | `canEditCourse` | Validate + submit for approval (`pendingApproval=true`). |
| `/api/courses/[courseId]/unpublish` | PATCH  | `canEditCourse` | Revert to draft.                                         |
| `/api/courses/[courseId]/approve`   | PATCH  | ADMIN           | Approve a pending course (`isPublished=true`).           |
| `/api/courses/[courseId]/reject`    | PATCH  | ADMIN           | Reject pending submission.                               |
| `/api/courses/[courseId]/checkout`  | POST   | Authenticated   | Create a Razorpay order for the course.                  |

### Course attachments / instructors

| Path                                                 | Verbs  | Auth                                    | Purpose                                  |
| ---------------------------------------------------- | ------ | --------------------------------------- | ---------------------------------------- |
| `/api/courses/[courseId]/attachments`                | POST   | `canEditCourse`                         | Add attachment to course.                |
| `/api/courses/[courseId]/attachments/[attachmentId]` | DELETE | `canEditCourse`                         | Remove attachment + R2 cleanup.          |
| `/api/courses/[courseId]/instructors`                | POST   | `canEditCourse` (owner/admin typically) | Add `CourseInstructor`.                  |
| `/api/courses/[courseId]/instructors`                | DELETE | `canEditCourse`                         | Remove an instructor (id in body/query). |

### Modules

| Path                                                   | Verbs  | Auth            | Purpose                            |
| ------------------------------------------------------ | ------ | --------------- | ---------------------------------- |
| `/api/courses/[courseId]/modules`                      | POST   | `canEditCourse` | Create module.                     |
| `/api/courses/[courseId]/modules/[moduleId]`           | PATCH  | `canEditCourse` | Update module.                     |
| `/api/courses/[courseId]/modules/[moduleId]`           | DELETE | `canEditCourse` | Delete module (cascades chapters). |
| `/api/courses/[courseId]/modules/[moduleId]/publish`   | PATCH  | `canEditCourse` | Publish module.                    |
| `/api/courses/[courseId]/modules/[moduleId]/unpublish` | PATCH  | `canEditCourse` | Unpublish module.                  |
| `/api/courses/[courseId]/modules/reorder`              | PUT    | `canEditCourse` | Reorder modules within course.     |

### Chapters

| Path                                                              | Verbs  | Auth                    | Purpose                                                          |
| ----------------------------------------------------------------- | ------ | ----------------------- | ---------------------------------------------------------------- |
| `/api/courses/[courseId]/chapters`                                | POST   | `canEditCourse`         | Create chapter (auto position, default `contentType=VIDEO_MUX`). |
| `/api/courses/[courseId]/chapters/reorder`                        | PUT    | `canEditCourse`         | Reorder chapters; can also move between modules.                 |
| `/api/courses/[courseId]/chapters/[chapterId]`                    | PATCH  | `canEditCourse`         | Update chapter; cleans up replaced media (R2 / Mux).             |
| `/api/courses/[courseId]/chapters/[chapterId]`                    | DELETE | `canEditCourse`         | Delete chapter + media cleanup.                                  |
| `/api/courses/[courseId]/chapters/[chapterId]/publish`            | PATCH  | `canEditCourse`         | Publish chapter.                                                 |
| `/api/courses/[courseId]/chapters/[chapterId]/unpublish`          | PATCH  | `canEditCourse`         | Unpublish chapter.                                               |
| `/api/courses/[courseId]/chapters/[chapterId]/mux-upload`         | POST   | `canEditCourse`         | Create a Mux Direct Upload; backfills `MuxData`.                 |
| `/api/courses/[courseId]/chapters/[chapterId]/youtube-embed`      | POST   | `canEditCourse`         | Set `youtubeVideoId` on chapter.                                 |
| `/api/courses/[courseId]/chapters/[chapterId]/import-asset`       | POST   | `canEditCourse`         | Import another chapter's content from the asset library.         |
| `/api/courses/[courseId]/chapters/[chapterId]/progress`           | PUT    | Self (must have access) | Mark chapter complete/incomplete.                                |
| `/api/courses/[courseId]/chapters/[chapterId]/submit-flag`        | POST   | Self (must have access) | Submit a flag for a gamified chapter.                            |
| `/api/courses/[courseId]/chapters/[chapterId]/project-submission` | GET    | Self (must have access) | Get current submission.                                          |
| `/api/courses/[courseId]/chapters/[chapterId]/project-submission` | POST   | Self (must have access) | Upsert submission (Drive URL); auto-marks completion.            |
| `/api/courses/[courseId]/chapters/[chapterId]/analytics`          | GET    | `canEditCourse`         | Per-chapter completion / submission stats.                       |

### Quizzes

| Path                                                                  | Verbs  | Auth                    | Purpose                                                         |
| --------------------------------------------------------------------- | ------ | ----------------------- | --------------------------------------------------------------- |
| `/api/courses/[courseId]/chapters/[chapterId]/quiz`                   | POST   | `canEditCourse`         | Create quiz.                                                    |
| `/api/courses/[courseId]/chapters/[chapterId]/quiz`                   | PATCH  | `canEditCourse`         | Update quiz config.                                             |
| `/api/courses/[courseId]/chapters/[chapterId]/quiz`                   | DELETE | `canEditCourse`         | Delete quiz.                                                    |
| `/api/courses/[courseId]/chapters/[chapterId]/questions`              | POST   | `canEditCourse`         | Create a question.                                              |
| `/api/courses/[courseId]/chapters/[chapterId]/questions/bulk`         | POST   | `canEditCourse`         | Bulk import questions (CSV-friendly).                           |
| `/api/courses/[courseId]/chapters/[chapterId]/questions/[questionId]` | PATCH  | `canEditCourse`         | Update question.                                                |
| `/api/courses/[courseId]/chapters/[chapterId]/questions/[questionId]` | DELETE | `canEditCourse`         | Delete question.                                                |
| `/api/courses/[courseId]/chapters/[chapterId]/quiz/start`             | GET    | Self (must have access) | Get current attempt or list previous attempts (no new attempt). |
| `/api/courses/[courseId]/chapters/[chapterId]/quiz/start`             | POST   | Self (must have access) | Create a new attempt (enforces `maxAttempts`).                  |
| `/api/courses/[courseId]/chapters/[chapterId]/quiz/save`              | POST   | Self (must have access) | Save a per-question response.                                   |
| `/api/courses/[courseId]/chapters/[chapterId]/quiz/submit`            | POST   | Self (must have access) | Finalise + grade attempt; auto-marks chapter complete on pass.  |

### Mentor Connect (chat)

| Path                                            | Verbs | Auth                                      | Purpose                                                      |
| ----------------------------------------------- | ----- | ----------------------------------------- | ------------------------------------------------------------ |
| `/api/courses/[courseId]/messages`              | GET   | Student in thread, or staff on the course | List messages for a thread.                                  |
| `/api/courses/[courseId]/messages`              | POST  | Student in thread, or staff on the course | Send a message.                                              |
| `/api/courses/[courseId]/messages/read`         | PUT   | Instructor on course                      | Update `MentorLastRead` for `(instructor, course, student)`. |
| `/api/courses/[courseId]/messages/read-student` | PUT   | Student in course                         | Update `StudentLastRead`.                                    |
| `/api/courses/[courseId]/chat-students`         | GET   | Staff on course                           | List students with chat threads (for the inbox view).        |

### Learners and progress (admin/teacher views)

| Path                                                                       | Verbs  | Auth            | Purpose                                                                 |
| -------------------------------------------------------------------------- | ------ | --------------- | ----------------------------------------------------------------------- |
| `/api/courses/[courseId]/learners/[purchaseId]`                            | DELETE | `canEditCourse` | Unenrol a learner; cascade-deletes their progress/attempts/submissions. |
| `/api/courses/[courseId]/learners/[purchaseId]/progress/[chapterId]/reset` | POST   | `canEditCourse` | Reset a learner's progress for one chapter.                             |
| `/api/courses/[courseId]/analytics/learner/[studentId]`                    | GET    | `canEditCourse` | Per-learner analytics (progress, quiz attempts, projects).              |

### Project submissions (teacher review)

| Path                                                                     | Verbs | Auth            | Purpose                                |
| ------------------------------------------------------------------------ | ----- | --------------- | -------------------------------------- |
| `/api/teacher/project-submissions/courses`                               | GET   | Teacher/Admin   | List courses with project chapters.    |
| `/api/teacher/project-submissions/[courseId]`                            | GET   | `canEditCourse` | List chapters with submissions.        |
| `/api/teacher/project-submissions/[courseId]/[chapterId]`                | GET   | `canEditCourse` | List submissions for a chapter.        |
| `/api/teacher/project-submissions/[courseId]/[chapterId]/[submissionId]` | PATCH | `canEditCourse` | Approve / reject (status, reviewNote). |

### Asset library (admin/teacher)

| Path                                             | Verbs | Auth          | Purpose                                                 |
| ------------------------------------------------ | ----- | ------------- | ------------------------------------------------------- |
| `/api/admin/asset-library`                       | GET   | Teacher/Admin | List published chapters as reusable assets, paginated.  |
| `/api/admin/asset-library/[chapterId]`           | GET   | Teacher/Admin | Asset detail.                                           |
| `/api/admin/asset-library/bulk-delete`           | POST  | ADMIN         | Bulk-delete asset chapters.                             |
| `/api/admin/asset-library/mux-upload`            | POST  | Teacher/Admin | Create a "library-only" Mux upload.                     |
| `/api/admin/asset-library/mux-upload/[uploadId]` | GET   | Teacher/Admin | Poll the upload status; backfills `MuxData` on success. |

### Categories

| Path                           | Verbs  | Auth          | Purpose          |
| ------------------------------ | ------ | ------------- | ---------------- |
| `/api/categories`              | GET    | Authenticated | List categories. |
| `/api/categories`              | POST   | ADMIN         | Create category. |
| `/api/categories/[categoryId]` | PATCH  | ADMIN         | Rename category. |
| `/api/categories/[categoryId]` | DELETE | ADMIN         | Delete category. |

### Admin manual enrolment

| Path                                  | Verbs | Auth  | Purpose                                                                                   |
| ------------------------------------- | ----- | ----- | ----------------------------------------------------------------------------------------- |
| `/api/admin/courses/[courseId]/enrol` | POST  | ADMIN | Bulk-enrol students. Creates Clerk users + Profiles for new emails, then `Purchase` rows. |

### Payments

| Path                   | Verbs | Auth          | Purpose                                                                                         |
| ---------------------- | ----- | ------------- | ----------------------------------------------------------------------------------------------- |
| `/api/razorpay/verify` | POST  | Authenticated | Verify HMAC + order notes + amount, then create `Purchase`. The only paid-purchase entry point. |

### Files / uploads

| Path                   | Verbs | Auth                         | Purpose                                                    |
| ---------------------- | ----- | ---------------------------- | ---------------------------------------------------------- |
| `/api/upload/presign`  | POST  | Teacher / Blogger            | Issue a presigned R2 PUT URL for an upload type.           |
| `/api/files/[...path]` | GET   | Public route, in-handler ACL | Stream a file from R2. `public/*` open; `private/*` gated. |

### Blogs

| Path                      | Verbs           | Auth             | Purpose                                            |
| ------------------------- | --------------- | ---------------- | -------------------------------------------------- |
| `/api/blogs`              | GET             | `canManageBlogs` | List blog posts (filter by category, isPublished). |
| `/api/blogs`              | POST            | `canManageBlogs` | Create blog post; lazy-creates author.             |
| `/api/blogs/[blogId]`     | PATCH           | `canManageBlogs` | Update blog post.                                  |
| `/api/blogs/[blogId]`     | DELETE          | `canManageBlogs` | Delete blog post.                                  |
| `/api/blogs/authors`      | GET             | `canManageBlogs` | List authors.                                      |
| `/api/blogs/authors/me`   | GET/PATCH       | Self             | Read/update the current user's `BlogAuthor`.       |
| `/api/blogs/categories`   | GET/POST        | `canManageBlogs` | Blog categories.                                   |
| `/api/blogs/tag-mappings` | GET/POST/DELETE | `canManageBlogs` | Tag → course mappings for cross-promotion.         |

### Leads

| Path                  | Verbs | Auth         | Purpose                             |
| --------------------- | ----- | ------------ | ----------------------------------- |
| `/api/leads`          | GET   | `isMarketer` | List leads.                         |
| `/api/leads`          | POST  | `isMarketer` | Manually create a lead.             |
| `/api/leads/[leadId]` | PATCH | `isMarketer` | Update status / notes / assignment. |

## 6. Conventions and gotchas

- **Always use `db` from `lib/db.ts`.** Don't `new PrismaClient()` anywhere else.
- **All Zod schemas live in `lib/validations.ts`.** Never inline. If you need a new one, add it there with a JSDoc comment.
- **Tag your errors.** `handleApiError('TAG_HERE', error)` makes it easy to grep server logs. Tags should be short, screaming snake case (`COURSE_PUBLISH`, `RAZORPAY_VERIFY`).
- **Don't return Prisma errors directly to clients.** They can leak schema/IDs. Use `handleApiError` so the user sees a generic 500.
- **Don't silently swallow.** Even on the server, log the original error before returning a sanitized response.
- **Idempotency:** most write endpoints are not idempotent. Don't assume a retry from the client is safe. If you add a new endpoint that may be retried (e.g. payment-related), design with idempotency keys.
- **Cascade chains:** when you add a new endpoint that deletes content tied to R2 or Mux, replicate the cleanup pattern from `app/api/courses/[courseId]/route.ts`. See [R2-IMPLEMENTATION.md](./R2-IMPLEMENTATION.md).
- **Don't trust client-supplied identifiers for ownership/threading.** For mentor chat, the API derives `threadStudentId` for STUDENT callers from their own profile id. Replicate this defensiveness elsewhere.
- **`/api/files/*` is a public route at the middleware level.** Its access control is implemented in the handler. If you change either side, keep them in sync.
- **`/api/contact` is rate-limited per IP** via `lib/rate-limit.ts`. If you spin up multiple instances behind a load balancer, the limiter loses meaning — it's per-process. Consider a shared store before scaling out.

## 7. How to add a new endpoint (cheat sheet)

1. Pick the path. Group by resource: `/api/<resource>/[...]/route.ts`. Keep verbs colocated in one file.
2. Add a Zod schema to `lib/validations.ts` (and export it).
3. Write the handler using the canonical template. Auth → role → validate → business → respond.
4. If it talks to a 3rd-party service, use the lazy SDK helper in `lib/`.
5. If it touches R2 or Mux, plan the cleanup path on update/delete. Document any orphan risk.
6. Wire it from a client component using `axios` or `fetch` and the toast + `router.refresh()` pattern (see [04-frontend.md](./04-frontend.md)).
7. Run `npm run lint && npx tsc --noEmit` before committing.

## 8. Where to read code that is the gold standard

If you want to copy a route as a template, these are the cleanest examples:

- **CRUD**: `app/api/courses/[courseId]/chapters/[chapterId]/route.ts` (full lifecycle including R2/Mux cleanup).
- **Validated POST**: `app/api/courses/[courseId]/chapters/route.ts`.
- **Auth + ownership + media cleanup**: `app/api/courses/[courseId]/route.ts`.
- **Payment-grade verification**: `app/api/razorpay/verify/route.ts`.
- **Polling backfill**: `app/api/admin/asset-library/mux-upload/[uploadId]/route.ts`.
- **Public read with in-handler ACL**: `app/api/files/[...path]/route.ts`.
- **Bulk operation**: `app/api/admin/courses/[courseId]/enrol/route.ts`.
