# 02 — Domain Model

This document is the business-rules companion to the schema doc. Read it to understand **what the entities mean**, **what invariants hold**, and **what must never happen**. For the raw schema and storage details, see [03-data-model.md](./03-data-model.md).

## 1. Actors and roles

There is exactly one user model in Clerk. Within Edwhere, every user has a `Profile` row carrying a `MemberRole`:

| Role       | What they can do                                                                                                              |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `STUDENT`  | Default. Browse, buy, consume courses, take quizzes, submit projects, chat with mentors.                                      |
| `TEACHER`  | Everything STUDENT can do, plus create courses, edit courses they own or are assigned as instructor on, view their analytics. |
| `ADMIN`    | Superuser. Edit any course, approve pending courses, manually enrol students, manage categories, manage users/roles.          |
| `MARKETER` | Manage Leads (CRM-lite) and blog posts.                                                                                       |
| `BLOGGER`  | Manage blog posts only.                                                                                                       |

**Invariants:**

- A `Profile` always corresponds to a Clerk user (via `userId`). It is created lazily on first login by `actions/get-safe-profile.ts` / `lib/current-profile.ts`.
- Roles are mutually exclusive — a Profile has exactly one role at a time. There is no array, no per-resource role.
- Promoting/demoting roles is an admin-only action. The route at `app/api/profile/[id]/route.ts` enforces this: non-admins cannot change `role` even when patching their own profile.
- `userId` on most child entities (Purchase, UserProgress, ProjectSubmission, QuizAttempt) is the **Clerk user id**, not the Profile `_id`. `CourseInstructor.profileId`, `CourseMessage.authorId`, and `MentorLastRead.instructorId` use the Profile `_id`. Be careful which one a query expects.

## 2. The course content hierarchy

```
Category (optional)
   └── Course
         ├── Attachment[]               (course-level downloads)
         ├── CourseInstructor[]         (Profiles co-teaching this course)
         ├── Module[]                   (optional grouping)
         │     └── Chapter[]
         └── Chapter[]                  (chapters can also be flat, no module)
                ├── MuxData              (1:1 if contentType == VIDEO_MUX)
                ├── Quiz                 (1:1 if contentType == EVALUATION)
                │     └── Question[]
                │           └── QuestionResponse[] (per QuizAttempt)
                ├── ProjectSubmission[]  (per student, if contentType == HANDS_ON_PROJECT)
                └── UserProgress[]       (per student)
```

### Course

A `Course` is the unit a learner pays for. Key fields and their meaning:

- `userId` — the Clerk user id of the **owner** (creator). The owner can always edit their course.
- `instructors` — additional Profiles who can also edit. Owners + instructors + admins all pass `canEditCourse`.
- `isPublished` + `pendingApproval` together encode the **publication state machine** (see § 4).
- `isWebVisible` — when `false`, the course is hidden from the public catalog at `/courses` even if `isPublished` is `true`. Useful for invite-only courses still consumed via direct link / manual enrolment.
- `slug` — used for SEO-friendly public URLs. Optional; falls back to `id`.
- `price` — in INR (Razorpay's only configured currency). `null` price means the course cannot be checked out.
- `category` — optional single category. Used for filtering on `/courses`.

### Module and Chapter

A Course has either a flat list of Chapters or Chapters grouped under Modules. Both data shapes are valid; the consumption UI handles both.

- `Chapter.position` — integer ordering **within** the parent (course or module).
- `Chapter.contentType` — discriminator for the player UI. Allowed values:
  - `VIDEO_MUX` — primary; uses `MuxData.playbackId` and Mux Player.
  - `VIDEO_YOUTUBE` — uses `youtubeVideoId`, embedded.
  - `TEXT` — `content` field, plain or markdown rendered to HTML.
  - `HTML_EMBED` — `htmlContent`, rendered via the rich-text/HTML preview component.
  - `PDF_DOCUMENT` — `pdfUrl` (an `/api/files/private/...` URL).
  - `HANDS_ON_PROJECT` — student submits a Google Drive URL via `ProjectSubmission`.
  - `EVALUATION` — chapter is a Quiz; completing the quiz with `score >= passScore` marks the chapter complete.
- `isPublished` — gates whether the chapter is visible in the player.
- `isFree` — when `true`, the chapter is accessible without a Purchase. Used for "free preview" lessons.
- `isLibraryAsset` — flags a chapter as reusable in the Asset Library (`/teacher/asset-library`). It is still a regular chapter under some course, just also surfaced for reuse.

**Invariants:**

- `Chapter.contentType` should match the data the chapter actually carries. The player decides what to render based purely on `contentType`; if it's wrong the user sees a blank or broken slot.
- A chapter with `EVALUATION` should have a related `Quiz` (1:1).
- A chapter with `VIDEO_MUX` should eventually have a `MuxData` row with a `playbackId`. Until Mux finishes processing, `playbackId` may be `null` and the player shows a "processing" state.
- `Chapter.position` should be unique within its parent module (or within the course when `moduleId` is null). The reorder endpoint maintains this; manual edits in DB can desync.

### Attachment

Course-level downloadable file. URL points either to an external resource or to `/api/files/<key>` for an R2-hosted file. Cascade-deleted when the course is deleted; the file in R2 is best-effort cleaned up by the course DELETE handler.

### CourseInstructor

Many-to-many between `Course` and `Profile`. The owner is **not** automatically a `CourseInstructor` row — the owner relationship is encoded purely by `Course.userId`. Both the owner and the listed instructors pass `canEditCourse`. See `lib/course-auth.ts`.

## 3. Purchase, enrolment, and access

A user has access to consume a course's non-free chapters if and only if **one** of the following is true:

1. There is a `Purchase` row with `(userId, courseId)`.
2. The chapter's `isFree` is `true`.
3. The user is the course owner (`Course.userId === userId`).
4. The user is an `ADMIN` or a `CourseInstructor` for this course.

This is enforced at multiple layers:

- API: `app/api/courses/[courseId]/chapters/[chapterId]/progress/route.ts`, `.../submit-flag/route.ts`, `.../project-submission/route.ts`, `.../quiz/start/route.ts`, etc., all check `Purchase` (or chapter freeness, or owner).
- Server actions: `actions/get-chapter.ts` returns `null` for sensitive content (videoUrl, attachments, etc.) when the user has no Purchase and the chapter is not free.

### Purchase model

- `Purchase` is **unique on `(userId, courseId)`** — a user can buy a course at most once. Re-purchase attempts fail at the DB level via the unique index.
- `onboardingSource` distinguishes:
  - `PAID` — created via Razorpay verify.
  - `MANUAL` — admin-created via `/api/admin/courses/[courseId]/enrol`.
  - `PAID_MANUAL` — historical / mixed cases.
- Unenrolment (`DELETE /api/courses/[courseId]/learners/[purchaseId]`) is a **hard delete**. It removes the Purchase plus all of the user's `UserProgress`, `QuizAttempt`, and `ProjectSubmission` rows for chapters in that course. There is no "soft archive". The route requires a `force` flag for non-`MANUAL` sources to make accidental deletes harder.

**Invariants:**

- Never create a Purchase row for a course at price 0 via the paid flow. The Razorpay verify route checks `course.price > 0`.
- Never create a Purchase row from the verify route without confirming the Razorpay signature **and** that the order's `notes.courseId` and `notes.userId` match the calling user/course. This prevents a user from paying for course A and being enrolled in course B, or paying for someone else.
- The verify route also re-fetches the **current** course price and compares against the amount paid. If a teacher changes the price between checkout and verify, the verify will fail. This is by design.

## 4. Course publication state machine

A `Course` has three relevant boolean flags. Their combinations encode the publication state:

| `isPublished` | `pendingApproval` | Meaning                                                                                   |
| :-----------: | :---------------: | ----------------------------------------------------------------------------------------- |
|     false     |       false       | **Draft** — visible only to teachers/admins in `/teacher/courses`.                        |
|     false     |       true        | **Submitted for approval** — listed in `/teacher/pending-approvals` for ADMINs to review. |
|     true      |       false       | **Published** — visible publicly (subject to `isWebVisible`), purchaseable.               |
|     true      |       true        | **Should not happen.** Treat as a bug in any code that produces this state.               |

Transitions:

- `Draft → Submitted` — `PATCH /api/courses/[id]/publish`. Validates that all required fields are present (title, description, image, category, price, ≥1 published chapter).
- `Submitted → Published` — `PATCH /api/courses/[id]/approve`. ADMIN-only.
- `Published → Draft` — there is currently no explicit "unpublish" route on `Course` itself; updating via `PATCH /api/courses/[id]` with `isPublished: false` would do it, but the UI does not expose it directly to teachers. (See open questions in 08.)

`isWebVisible` is independent of the above and toggles whether a published course appears in the public catalog. A published, web-invisible course is still purchaseable via direct link.

## 5. Chapter consumption and progress

`UserProgress` is unique on `(userId, chapterId)` and carries a single `isCompleted` boolean.

A chapter is considered "complete" when:

- The student clicks "Mark complete" in the player → `PUT /.../progress` with `isCompleted: true`. Available for all content types.
- A `HANDS_ON_PROJECT` chapter is auto-marked complete on **first** project submission (the API upserts `UserProgress.isCompleted = true` even before review). Re-submissions keep it complete.
- An `EVALUATION` chapter is auto-marked complete when the student submits a `QuizAttempt` whose score >= the quiz's `passScore`. Submissions below `passScore` do not mark complete; the student can retry up to `Quiz.maxAttempts`.
- A gamified chapter (one with `gamifiedFlag` set) is auto-marked complete when the student submits the correct flag via `/.../submit-flag`. Comparison is case-insensitive and trimmed.

Course-level "progress %" is computed in `actions/get-progress.ts` as `completed published chapters / total published chapters`. Unpublished chapters are ignored.

**Invariants:**

- `UserProgress` rows are only meaningful for chapters the student has access to. They can exist for free chapters even without a purchase.
- Marking a chapter incomplete after completion is allowed and supported by the same endpoint with `isCompleted: false`.
- After a course's last chapter is completed, the UI fires confetti (`components/providers/confetti-provider.tsx` driven by `course-progress-button.tsx`). This is purely cosmetic — no backend "course completed" entity exists.

## 6. Quizzes

A Quiz is owned by exactly one Chapter (1:1, unique `chapterId`). Important fields:

- `timeLimit` (minutes) — if set, the quiz auto-fails when current time exceeds `attempt.startTime + timeLimit`. Enforced in both `start` (read) and `save` / `submit` endpoints.
- `randomize` — if true, `start` shuffles questions and per-question options using a seeded PRNG keyed off the attempt id, so a refresh shows the same order.
- `maxTabSwitches` — currently stored but **not enforced server-side**. The QuizPlayer tracks `tabSwitches` client-side; the value is recorded but does not auto-fail the attempt. Treat it as advisory.
- `passScore` — minimum % to pass. Must be in `0..100`. Below it, the chapter is **not** auto-marked complete.
- `maxAttempts` — hard cap. The `start` POST refuses to create a new attempt if the user already has `>= maxAttempts` non-active attempts. There is no "reset" endpoint for students.
- `isGraded` — informational; affects UI labels.

`QuizAttempt` is per-user, per-quiz, with `isCompleted`. There can be multiple attempts per user up to `maxAttempts`. Only one attempt per user is "active" (`isCompleted: false`) at a time — `start` returns the active one if it exists.

`QuestionResponse` is unique per `(attemptId, questionId)`. The `save` endpoint upserts; the `submit` endpoint freezes the attempt and computes the score.

**Invariants:**

- An attempt's `score` is computed server-side and is the source of truth. Never trust a client-supplied score.
- A question's `correctOptions` is the source of truth for grading. `isMultipleChoice` controls whether multiple selections are allowed in the UI; grading requires the `selectedOptions` set to equal `correctOptions` exactly.
- An attempt may not be modified after `isCompleted: true`. The `save` and `submit` endpoints enforce this.
- A submitted attempt that hits the `passScore` threshold marks the chapter `UserProgress.isCompleted = true`; one that doesn't, leaves progress unchanged.

## 7. Hands-on project submissions

`ProjectSubmission` is unique on `(userId, chapterId)` — one current submission per student per chapter (re-submissions overwrite). Fields:

- `driveUrl` — must be a Google Drive URL (validated by Zod regex in `lib/validations.ts`).
- `status` — `PENDING | APPROVED | REJECTED`. Set by teacher review via `PATCH /api/teacher/project-submissions/.../<submissionId>`.
- `reviewNote`, `reviewedAt`, `reviewedBy` — populated on review.

**Invariants:**

- Submitting requires either a Purchase or a free chapter.
- The chapter is marked `UserProgress.isCompleted = true` on **first** submission (regardless of subsequent review status). Rejection does not undo completion. This is intentional — completion = "submitted", review = quality gate.
- `reviewedBy` stores a Clerk userId of the reviewer. There is no FK constraint enforced.

## 8. Mentor Connect (chat)

Per-course, per-student private threads with the course's instructors/admins.

Models:

- `CourseMessage` — `(courseId, threadStudentId, authorId, content, createdAt)`. The `threadStudentId` is the Profile `_id` of the student whose thread this message belongs to.
- `MentorLastRead` — per `(instructorId, courseId, studentId)` row tracking when the instructor last opened that thread.
- `StudentLastRead` — per `(studentId, courseId)` row tracking when the student last opened the chat.

Unread counts are computed at render time by counting `CourseMessage`s newer than the relevant `lastReadAt`.

**Access rules:**

- A user can access a thread iff: they are the student in the thread (and have access to the course as per § 3), or they are an instructor/owner/ADMIN of the course.
- Students cannot read other students' threads. The API derives `threadStudentId` from the calling user when the caller is a STUDENT, ignoring any client-provided value.

**Invariants:**

- `threadStudentId` is the Profile `_id` of the student. Confusingly, `userId` columns elsewhere are Clerk userIds. Mixing these will silently return empty results.
- There is no message edit/delete API. Messages are append-only.

## 9. Categories

Simple lookup table for filtering. ADMIN-only create. There is currently no rename/delete API exposed in the UI; rename via Prisma Studio if needed.

## 10. Leads (CRM-lite)

`Lead` is the only "marketing" entity. Captures website contact form submissions and manually entered leads. No PII outside `name/phone/email/message/notes`.

Lifecycle:

- Created via `POST /api/contact` (public, rate-limited per IP) with `source = "GENERAL_WEBSITE_ENQUIRY"`.
- Created via `POST /api/leads` (MARKETER+) for manual entry.
- Updated via `PATCH /api/leads/[id]` (MARKETER+) to change `status`, `notes`, `assignedTo`.
- No deletion endpoint. Leads are append-only from the UI.

`status` and `source` are free-form strings with default values; there is no enum at the DB level. The marketer UI supplies a fixed set.

## 11. Blog

Independent of the LMS surface. `BlogPost` belongs to a `BlogAuthor` (1:1 with a Profile, lazily created on first post by users with `canManageBlogs`) and optionally a `BlogCategory`. Posts can be tagged and tags can be mapped to courses via `BlogTagMapping` for cross-promotion.

**Access:**

- Public reads: published posts only.
- Manage (CRUD): `MARKETER`, `BLOGGER`, `TEACHER`, `ADMIN` — see `lib/blog-auth.ts`.

## 12. What must NEVER happen

These are the invariants the system relies on to remain consistent. If any of them is being violated, that's a bug worth fixing immediately.

- A `Purchase` row exists without either: (a) a successful Razorpay payment whose order notes match `(userId, courseId)`, or (b) an ADMIN manually enroling.
- A `Purchase` row exists with a price/amount that mismatched the course price at verification time.
- Two `Purchase` rows exist for the same `(userId, courseId)` — prevented by the unique index, but never bypass with raw Mongo writes.
- A user can read content from a course they have not purchased (and that is not free, and they're not staff).
- A teacher edits a course they do not own and are not assigned to as instructor, without being ADMIN.
- A non-ADMIN changes a `Profile.role`.
- A `Chapter` is published with no `Course` parent or with `position` clashing other chapters in its parent (UI breaks, sort becomes nondeterministic).
- A `MuxData` row exists for a chapter whose course has been deleted (cascade should prevent this; verify after any manual DB intervention).
- A `QuizAttempt` is mutated after `isCompleted: true`.
- A student reads another student's mentor chat thread.
- A `ProjectSubmission` from a different user is overwritten (the unique key is `(userId, chapterId)`; never write rows mixing identities).
- A 3rd-party SDK client is instantiated at module top-level and crashes the build. Always lazy.

## 13. Edge cases worth knowing

- **Slug uniqueness:** `Course.slug` is not enforced unique by Prisma but the `PATCH /api/courses/[id]` route checks for clashes on update. Direct DB edits can introduce duplicates.
- **Replacing a Mux video:** the chapter PATCH / Mux upload route attempts to delete the previous Mux asset before creating a new one. If Mux is down, the old asset may linger. Re-running the upload should self-heal.
- **R2 cleanup is best-effort:** when a Course is deleted, the route iterates known R2 keys (course image, attachments, chapter PDFs) and ignores `NoSuchKey`. Other R2 errors are logged but do not block the DB delete. Some orphans are possible.
- **Free chapter inside a paid course:** access works as expected; `UserProgress` accumulates and the student can mark complete. They still can't access the _other_ chapters until they purchase.
- **Quiz `randomize` with `maxAttempts > 1`:** each attempt seeds with its own attempt id, so each attempt is independently shuffled but stable across page reloads.
- **Mentor Connect for a STUDENT who is also an instructor on the same course:** edge case. The student-vs-staff check is by role, not relationship; a TEACHER opening the chat for a course they're enrolled in as a student will be treated as a teacher (sees all threads). Don't dual-role accounts in production.
