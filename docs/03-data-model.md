# 03 — Data Model

This is the storage-side companion to [02-domain-model.md](./02-domain-model.md). For semantics and rules, read that first; this file focuses on **how the data is stored, indexed, related, and what to watch out for at scale**.

Source of truth: `prisma/schema.prisma`. Whenever this doc disagrees with the schema, the schema wins.

## 1. Database basics

- **Engine:** MongoDB (Atlas in production). `provider = "mongodb"` in `schema.prisma`.
- **ORM:** Prisma 5 with `prisma-client-js`, plus `previewFeatures = ["fullTextSearch", "fullTextIndex"]` for the title search index on `Course`.
- **Migration model:** there are **no migration files**. Mongo + Prisma uses `prisma db push` to sync schema; collections, fields, and indexes converge to whatever's in `schema.prisma`. There is no down-migration.
- **Singleton client:** `lib/db.ts` exports the only `PrismaClient` instance (`db`). Never instantiate elsewhere.

## 2. Identity columns

- All primary keys are MongoDB `ObjectId`s mapped to TypeScript `string`s: `id String @id @default(auto()) @map("_id") @db.ObjectId`.
- **Two distinct user identifiers** flow through the system, do not confuse them:
  - **Clerk userId** (`string`, e.g. `user_2abc...`): stored on `Profile.userId`, `Purchase.userId`, `UserProgress.userId`, `QuizAttempt.userId`, `ProjectSubmission.userId`, `BlogAuthor.userId` (optional).
  - **Profile `_id`** (Mongo ObjectId string): used by `CourseInstructor.profileId`, `CourseMessage.authorId`, `MentorLastRead.instructorId / studentId`, `StudentLastRead.studentId`, `BlogPost.authorId`, `BlogTagMapping.courseId`, etc.

  When in doubt: things that are written from Clerk-driven request flows tend to use `userId`; things that link Profiles internally tend to use `profileId`. Always check the schema before assuming.

## 3. Collection-by-collection map

### Profile

**Stores:** the local mirror of a Clerk user, plus role and login telemetry.

- Unique: `userId`.
- Lazily upserted on first authenticated request via `lib/current-profile.ts`.
- `lastLoginAt` / `lastLoginIp` updated at most once per hour or when IP changes.
- Cardinality: **users**. Grows linearly with signups.

### Course

**Stores:** course metadata, pricing, publication state.

- Indexes: `categoryId`, `slug`, `@@fulltext([title])`.
- Many-to-many to `BlogPost` via `blogPostIds: String[]` array on both sides — Prisma m2m on Mongo uses array of foreign ids.
- Cascade: `category SetNull` on Category delete (implicit by optional fk), `attachments`, `chapters`, `modules`, `purchases`, `instructors`, `messages` all cascade-delete from Course.
- Cardinality: **dozens to low thousands**. Low write volume.

### Module / Chapter

- `Module → Course` cascade on Course delete.
- `Chapter → Course` cascade. `Chapter → Module` cascade on Module delete (chapter goes too — beware: orphaning students mid-course; usually reorder out of the module first).
- Indexes: `courseId` (both), `moduleId` (Chapter).
- `position` is an integer with no DB-level uniqueness — uniqueness within parent is enforced by application logic (`reorder` endpoint).
- Cardinality: chapters scale with content. A typical course has 10–60 chapters; total in low thousands.

### MuxData

- 1:1 with Chapter via unique `chapterId`.
- Cascade-deletes when chapter or its course is deleted.
- Holds `assetId`, `playbackId` (nullable while Mux processes), and `muxUploadId` (the Direct Upload id, used by the polling endpoint).

### Quiz / Question / QuizAttempt / QuestionResponse

- Quiz unique on `chapterId` (1:1).
- Question indexed on `quizId`.
- QuizAttempt indexed on both `quizId` and `userId`. Read patterns: "active attempt for user+quiz", "list attempts for user+quiz". The current code does table-scan-style filtered queries; both indexes help.
- QuestionResponse unique on `(attemptId, questionId)` — guarantees one row per question per attempt. Cascade from both sides.
- Cardinality:
  - Questions: at most a few hundred per quiz.
  - QuizAttempts: scales with `users × graded chapters × maxAttempts`. **Highest growth model** alongside `UserProgress` and `CourseMessage`.
  - QuestionResponses: `attempts × questions` — the largest collection by row count once the platform has activity.

### UserProgress

- Unique on `(userId, chapterId)`.
- Indexed on `chapterId`.
- Cardinality: `enrolled users × chapters`. **High-cardinality, high-growth.**

### Purchase

- Unique on `(userId, courseId)`.
- Indexed on `courseId` (used for analytics + learner lists).
- `onboardingSource` enum distinguishes paid vs manual.
- Cardinality: `unique buyers × courses`. Lower than UserProgress but still grows steadily.

### RazorpayCustomer

- One row per user that has at least one Razorpay-handled interaction. Currently created opportunistically (the existing checkout flow does not require a pre-created Customer; the table exists for future use). May be sparsely populated.

### Logging

- Append-only request log written by `lib/logging.ts`.
- **Highest write volume** when enabled — every API call lands here.
- **No TTL configured.** Will grow forever. See "retention" below.

### Lead

- Indexes: `status`, `source`.
- Cardinality: linear with website traffic + sales activity. Modest.

### CourseMessage

- Indexes: `courseId`, `(courseId, threadStudentId)` — supports listing messages per thread efficiently.
- Cardinality: scales with chat usage. Can grow large for active courses.
- No deletion; append-only.

### MentorLastRead, StudentLastRead

- Tiny, one row per `(instructor, course, student)` or `(student, course)` tracking last read.
- Updated on every chat page load.

### ProjectSubmission

- Unique on `(userId, chapterId)` — the latest submission overwrites.
- Indexes: `chapterId`, `status`.
- Cardinality: `students × project chapters`. Modest.

### Blog\* models

- `BlogAuthor` 1:1 with `Profile` via optional `userId`.
- `BlogCategory` unique `name` and `slug`.
- `BlogPost` unique `slug`. Indexes: `authorId`, `categoryId`, `isPublished`. Many-to-many to `Course` via `courseIds: String[]`.
- `BlogTagMapping` unique `tagName` → `courseId`. Used to dynamically suggest courses on blog posts based on tag names.

### Attachment, Category, CourseInstructor

- Small lookup / join tables. CourseInstructor has unique `(courseId, profileId)`.

## 4. Indexes summary

| Collection        | Indexes                                                      |
| ----------------- | ------------------------------------------------------------ |
| Profile           | `userId` (unique)                                            |
| Course            | `categoryId`, `slug`, fulltext `title`                       |
| Attachment        | `courseId`                                                   |
| CourseInstructor  | `(courseId, profileId)` unique, `courseId`, `profileId`      |
| Quiz              | `chapterId` unique                                           |
| Question          | `quizId`                                                     |
| QuizAttempt       | `quizId`, `userId`                                           |
| QuestionResponse  | `(attemptId, questionId)` unique, `attemptId`, `questionId`  |
| Module            | `courseId`                                                   |
| Chapter           | `courseId`, `moduleId`                                       |
| MuxData           | `chapterId` unique                                           |
| UserProgress      | `(userId, chapterId)` unique, `chapterId`                    |
| Purchase          | `(userId, courseId)` unique, `courseId`                      |
| RazorpayCustomer  | `userId` unique, `razorpayCustomerId` unique                 |
| Lead              | `status`, `source`                                           |
| CourseMessage     | `courseId`, `(courseId, threadStudentId)`                    |
| MentorLastRead    | `(instructorId, courseId, studentId)` unique, `instructorId` |
| StudentLastRead   | `(studentId, courseId)` unique, `studentId`                  |
| ProjectSubmission | `(userId, chapterId)` unique, `chapterId`, `status`          |
| BlogPost          | unique `slug`, `authorId`, `categoryId`, `isPublished`       |
| BlogCategory      | unique `name`, unique `slug`                                 |
| BlogTagMapping    | unique `tagName`, `courseId`                                 |

## 5. Ownership and write boundaries

Who is allowed to write what is enforced in code (see `lib/*-auth.ts` and per-route checks). At the data layer:

- **`Profile`**: written by `current-profile.ts` (owner) and admin-only role updates from `app/api/profile/[id]/route.ts`.
- **`Course`, `Module`, `Chapter`, `Attachment`, `CourseInstructor`, `Quiz`, `Question`, `MuxData`**: written only via `app/api/courses/...` routes guarded by `canEditCourse`. Owner / instructor / admin only.
- **`Purchase`**: written only by:
  - `app/api/razorpay/verify/route.ts` (post-payment),
  - `app/api/admin/courses/[courseId]/enrol/route.ts` (admin manual enrol),
  - `app/api/courses/[courseId]/learners/[purchaseId]/route.ts` deletes them.
- **`UserProgress`**: written by the calling student via the chapter `progress` route, plus auto-marked completion paths (project submission, quiz submit, gamified flag).
- **`QuizAttempt`, `QuestionResponse`**: only by the calling student via the quiz `start`/`save`/`submit` routes.
- **`ProjectSubmission`**: created/updated by the student; reviewed by teacher/admin via the teacher review route.
- **`CourseMessage`, `MentorLastRead`, `StudentLastRead`**: written by participants in the chat, with role-based access.
- **`Lead`**: created by public contact form (rate-limited) or by marketers/admins. Updated by marketers/admins.
- **`Blog*`**: created/updated by anyone with `canManageBlogs` (BLOGGER, MARKETER, TEACHER, ADMIN).
- **`Logging`**: written by `lib/logging.ts` from API handlers that opt in (not all do).
- **`Category`**: created by ADMIN only via `/api/categories`.
- **`RazorpayCustomer`**: not actively written by current flows; reserved.

## 6. Cascade and orphan policy

Prisma-level `onDelete: Cascade` is set on these relations (see `schema.prisma` for the full picture):

- `Course → { Attachment, Module, Chapter, Purchase, CourseInstructor, CourseMessage, BlogTagMapping }` — all cascade.
- `Chapter → Module` cascade (delete module → delete its chapters).
- `Chapter → { MuxData, Quiz, UserProgress, ProjectSubmission }` — all cascade.
- `Quiz → { Question, QuizAttempt }` cascade.
- `QuizAttempt → QuestionResponse` cascade. `Question → QuestionResponse` cascade.
- `Profile → { CourseInstructor, CourseMessage }` cascade.
- `BlogAuthor → BlogPost` cascade.
- `BlogCategory → BlogPost` set null.

Things **not** cascaded by the DB and handled in code:

- **R2 objects** are not part of MongoDB. The course/chapter delete handlers explicitly call `deleteObject` for known keys (image, attachments, PDFs). Best-effort; expect occasional orphans.
- **Mux assets** are not deleted by Mongo. The chapter/course delete handlers call Mux to delete assets, **but only if the asset isn't referenced by another chapter** (the codebase performs this check before issuing the delete).
- **Clerk users** are independent. Deleting a `Profile` row does not delete the Clerk user, and vice versa. There is no Clerk webhook that prunes Profiles when a Clerk user is deleted.

## 7. High-cardinality / high-growth collections

In rough order, these will dominate storage and read load:

1. **Logging** — every logged API call. Currently no TTL. Will dwarf everything if left unbounded. Consider adding a TTL index in Atlas: `db.Logging.createIndex({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 3600 })`.
2. **QuestionResponse** — 1 per (attempt × question). For a course with 10 graded chapters × 20 questions × 1000 students × avg 1.5 attempts, that's 300k rows.
3. **UserProgress** — 1 per (user × chapter completion). Same order of magnitude as users × content size.
4. **CourseMessage** — uncapped chat history.
5. **QuizAttempt** — per user attempt; grows fast for popular courses.
6. **Purchase** — slower; bounded by buyers × courses.

## 8. Common query patterns

These are the read shapes most pages issue. Knowing them helps when investigating slow queries.

- **Public catalog (`/courses`)**: `Course.find({ isPublished: true, isWebVisible: true, [optional title regex/fulltext], [optional categoryId] })` with `include: { category, chapters: { where: { isPublished: true } }, instructors }`. (`actions/get-courses.ts`)
- **Public course detail**: `Course.findUnique({ where: { slug } | { id } })` with deep include of chapters/modules/instructors/category. Single doc, no fanout problem.
- **Student dashboard**: `Purchase.findMany({ where: { userId } })` then for each purchased course, fetch chapters and `UserProgress.count({ where: { userId, chapterId in [...] } })`. Done in batch by `actions/get-progress.ts`.
- **Chapter player**: `Chapter.findUnique` with includes (course, muxData, attachments) + `UserProgress.findUnique({ userId, chapterId })` + `Purchase.findUnique({ userId, courseId })` + nextChapter lookup. Several round-trips per render.
- **Teacher analytics**: `Purchase.findMany({ where: { courseId in <teacher's courses> } })` then group in memory. Not a great pattern at scale — see "bottlenecks".
- **Mentor chat thread**: `CourseMessage.findMany({ where: { courseId, threadStudentId }, orderBy: { createdAt: 'asc' } })`. Index `(courseId, threadStudentId)` covers this.
- **Asset library**: `Chapter.findMany({ where: { isPublished: true, [filters], course: { ...teacher scope... } }, include: { course } })` with pagination.

## 9. Known query bottlenecks

- **Analytics aggregation in memory.** `actions/get-analytics.ts` fetches all relevant Purchases and groups in JavaScript. Fine for hundreds, slow for tens of thousands. If needed, push the group into a Mongo aggregation pipeline.
- **Progress batching.** `getProgressBatch` runs one `count` per course in parallel — N round trips. For a student in 50 courses this is fine; for an admin viewing 500 students it would be a problem.
- **Course list with progress.** On `/courses` for a logged-in user, each course has its progress computed individually. Same N round-trip shape.
- **Logging table reads.** There's no UI reading Logging today, but if you build one, paginate aggressively.
- **Fulltext search** (`@@fulltext([title])`) — works fine for course title search but is fragile; misspellings won't match. Consider client-side filtering on the loaded set if catalog stays small.

## 10. Data correctness risks

Things that have bitten or could bite:

- **Mismatched user id types.** A `userId`-vs-`profileId` confusion can silently return empty results. When adding a query, double-check the column.
- **Unenrol cascade gaps.** The unenrol route deletes `UserProgress`, `QuizAttempt`, `ProjectSubmission`, `Purchase`. It does **not** delete `MentorLastRead` / `StudentLastRead` / `CourseMessage` rows belonging to that student. If they re-enrol, they'll see their old chat history. Decide if that's OK for your use case.
- **Course deletion vs Mux/R2.** Best-effort cleanup as noted. Run a periodic R2/Mux orphan check if storage cost matters.
- **`Course.blogPostIds` and `BlogPost.courseIds` arrays.** These are denormalised on both sides (Prisma m2m on Mongo). If you write directly to one without the other, the relationship breaks. Always go through Prisma's relation API.
- **`Chapter.position` collisions.** Reorder must be atomic in spirit. The current code updates positions in a loop; if interrupted mid-way you can end up with duplicate positions. Re-running reorder fixes it.
- **Race on first profile creation.** `current-profile.ts` does a find-then-create. Two simultaneous requests for a brand-new Clerk user could try to insert twice; the unique index on `userId` will reject the second. Handle the resulting error gracefully if you add new code in this path.
- **`pendingApproval` + `isPublished` both true.** Should never happen via the API but is possible with manual DB edits. The catalog filters on `isPublished: true` so the course will be visible publicly even though it's "pending"; the pending-approvals page will also show it. If you spot this, fix the row.
- **Free chapter access.** `isFree` opens the chapter without a purchase. Don't store sensitive content (like answer keys) in a chapter you also mark free.

## 11. Retention and lifecycle

Currently nothing is auto-deleted by the database or by the app. There is no cron, no TTL index in code. If you need retention:

- **Logging** — add an Atlas TTL index. Recommended.
- **QuizAttempt / QuestionResponse** — keep them. They're the audit trail for grading disputes.
- **CourseMessage** — keep them. Students may revisit their threads.
- **Lead** — never auto-delete; CRM data.

If/when you add deletion, document it here and ensure all foreign references are handled.

## 12. Reading the schema yourself

The single most useful command:

```bash
npx prisma studio
```

It opens a UI at `http://localhost:5555` where you can browse every collection, follow relations, and edit rows. Be careful in production — there's no undo.

For programmatic introspection without running the app:

```bash
npx prisma format          # canonicalise schema.prisma
npx prisma validate        # check the schema is valid
npx prisma generate        # regenerate the client after edits
```
