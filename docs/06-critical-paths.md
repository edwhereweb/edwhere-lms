# 06 — Critical Paths

End-to-end traces for the flows you cannot afford to break. Each one lists the actors, the request sequence, the state changes, and the failure modes.

The goal is that if a critical path breaks in production, you can read the relevant section here and know exactly which file to open.

## 1. Authentication & first-time profile creation

### Actors

- Browser (anonymous user, then signed-in user).
- Clerk (identity provider).
- Edwhere middleware + `actions/get-safe-profile.ts` + `lib/current-profile.ts`.
- MongoDB (`Profile` collection).

### Sequence

1. User hits a protected route, e.g. `/dashboard`.
2. `middleware.ts` runs. The route is **not** in `isPublicRoute`, so Clerk middleware enforces auth. Unauthenticated users are 401'd; the Clerk client redirects them to `/sign-in`.
3. User completes Clerk sign-in/sign-up at `app/(auth)/(routes)/sign-in/[[...sign-in]]/page.tsx` (Clerk-hosted UI). On success, Clerk sets a session cookie and redirects to the configured `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL`.
4. Next request to a protected route now has a valid session. Middleware lets it through.
5. The page or layout calls `getSafeProfile()` (or directly `currentProfile()`):
   - `auth()` → `userId` (Clerk).
   - `db.profile.findUnique({ where: { userId } })`.
   - If missing, fetch the Clerk user (`clerkClient.users.getUser`) for `name`/`email`/`imageUrl`, then `db.profile.create(...)` with role `STUDENT`.
   - If present, opportunistically update `lastLoginAt` / `lastLoginIp` (only when stale > 1h or IP changed).
6. The Server Component renders with the profile in scope.

### State changes

- New `Profile` row on first login (one-shot).
- `lastLoginAt`/`lastLoginIp` updated periodically.
- No changes in Clerk from the app side except read.

### Failure modes

- **No profile created and the page expects one:** if you forget to call `currentProfile()` (or wrap with `getSafeProfile()`) at the layout level, child pages may render a logged-in shell with `null` profile. Always read the profile in the layout that owns the route.
- **Race on first login:** two concurrent first-render requests may both try to create. The unique index on `userId` will reject the second; ensure you handle the duplicate-key error (it's harmless — just refetch).
- **Clerk down:** `auth()` rejects; pages 500. Middleware will block protected routes; public routes still work.

### Where to look

- `middleware.ts`
- `lib/current-profile.ts`
- `actions/get-safe-profile.ts`
- `app/(auth)/...`

---

## 2. Course publish lifecycle (Draft → Approved)

### Actors

- Teacher (course owner / instructor).
- ADMIN.

### Sequence

1. Teacher creates a course via `POST /api/courses` — only `title` is required at this stage. Course is `isPublished=false, pendingApproval=false` (Draft).
2. Teacher edits course details, modules, chapters via the various `PATCH` endpoints under `/api/courses/[id]/*`.
3. Teacher publishes individual chapters/modules via `.../publish` PATCH endpoints. This sets `Chapter.isPublished=true`. Chapter publish does **not** require any media to exist — but content type-specific validation may be added in future.
4. When ready, teacher submits the course for approval: `PATCH /api/courses/[id]/publish`. The handler validates required fields:
   - `title`, `description`, `imageUrl`, `categoryId`, `price`.
   - At least one published chapter.
5. On success: course becomes `isPublished=false, pendingApproval=true` (Submitted).
6. ADMIN visits `/teacher/pending-approvals`, reviews, then either:
   - **Approve**: `PATCH /api/courses/[id]/approve` → `isPublished=true, pendingApproval=false` (Published).
   - **Reject**: `PATCH /api/courses/[id]/reject` → reverts to draft (`pendingApproval=false`).
7. Once published, the course is visible in `/courses` (subject to `isWebVisible`) and is purchaseable.

### State changes

- `Course.isPublished`, `Course.pendingApproval` mutated according to the matrix in [02-domain-model.md §4](./02-domain-model.md#4-course-publication-state-machine).

### Failure modes

- **Submit-for-approval rejected:** missing required field. Inspect the response body — the validator names the missing field.
- **Approval bypass:** a non-ADMIN should not be able to call `/approve`. The route enforces this. Don't loosen it.
- **`pendingApproval=true && isPublished=true`:** illegal state. If you see it in the DB, fix manually and find what created it.

### Where to look

- `app/api/courses/[courseId]/publish/route.ts`
- `app/api/courses/[courseId]/approve/route.ts`
- `app/api/courses/[courseId]/reject/route.ts`
- `app/api/courses/[courseId]/unpublish/route.ts`
- `app/(dashboard)/(routes)/teacher/pending-approvals/page.tsx`

---

## 3. Payment & purchase (the revenue path)

This is the most safety-critical path in the system. Treat changes here with extra care.

### Actors

- Browser (buyer).
- Edwhere `/api/courses/[id]/checkout` and `/api/razorpay/verify`.
- Razorpay (payment gateway).
- MongoDB (`Purchase`).

### Sequence

1. Buyer is on `/courses/[id]/chapters/[chapterId]` (free chapter or preview) and clicks **Enroll Now**.
2. Client (`course-enroll-button.tsx`) dynamically loads the Razorpay browser SDK from `https://checkout.razorpay.com/v1/checkout.js`.
3. Client calls `POST /api/courses/[id]/checkout`. Server:
   - `auth()` → `userId`.
   - Loads course; ensures it exists, is published, and `price > 0`.
   - Ensures no existing `Purchase` row for `(userId, courseId)`.
   - Calls `razorpay.orders.create({ amount, currency: 'INR', notes: { courseId, userId } })`.
   - Returns `{ orderId, amount, currency, key: NEXT_PUBLIC_RAZORPAY_KEY_ID }` to the client.
4. Client opens the Razorpay modal with these details. User pays.
5. On success, Razorpay invokes the `handler` callback in the browser with `{ razorpay_order_id, razorpay_payment_id, razorpay_signature }`.
6. Client immediately `POST`s these to `/api/razorpay/verify`.
7. Server `verify` route:
   - `auth()` → `userId`.
   - Validates the body against `razorpayVerifySchema`.
   - **Recomputes the HMAC SHA-256** of `${order_id}|${payment_id}` using `RAZORPAY_KEY_SECRET`. Rejects if it doesn't match `razorpay_signature`.
   - **Re-fetches the order from Razorpay** to read its `notes` (the _authoritative_ `courseId` and `userId`). It does **not** trust client-supplied IDs for these.
   - Verifies that `notes.userId === userId` (the user paying is the user signed in) and `notes.courseId` exists.
   - Loads the current course and verifies `course.price * 100 === order.amount` (cross-check: a teacher cannot have changed the price between checkout and verify without invalidating the order).
   - Creates `Purchase { userId, courseId, onboardingSource: PAID }`.
8. Client toasts success and refreshes; the chapter pages now show the user as enrolled.

### State changes

- One `Purchase` row created on success.
- A Razorpay `order` and `payment` exist on Razorpay's side (we don't persist them locally; consult the dashboard for audit).

### Failure modes

- **Signature mismatch:** payment will be marked completed at Razorpay but no Purchase row is created. The customer will see "verification failed" — recover via dashboard refund or manual enrolment.
- **Note tampering attempt:** if `notes.userId !== signed-in userId`, verify rejects. This is the protection against "pay from account A, enrol account B".
- **Price changed mid-flow:** the price-check fails. Cancel + re-checkout.
- **Duplicate purchase race:** the unique index on `(userId, courseId)` will reject the second insert. Handle gracefully.
- **Razorpay outage:** checkout creation fails (we surface error to client); user retries.
- **No webhook:** because we rely entirely on the client-driven verify callback, a buyer who closes the tab between payment and verify will end up with a paid order but no Purchase row. **Mitigation:** ADMINs can manually enrol via `/teacher/enrolments`.

### Razorpay test mode

Use `rzp_test_*` keys. The card `4111 1111 1111 1111` with any CVV / future expiry passes by default. See [07-third-party.md](./07-third-party.md#razorpay) for more.

### Where to look

- `app/(course)/courses/[courseId]/chapters/[chapterId]/_components/course-enroll-button.tsx`
- `app/api/courses/[courseId]/checkout/route.ts`
- `app/api/razorpay/verify/route.ts`
- `lib/razorpay.ts`

---

## 4. Video upload (Mux Direct Upload + polling backfill)

### Actors

- Teacher (uploader).
- Edwhere `/api/courses/[id]/chapters/[id]/mux-upload` and `/api/admin/asset-library/mux-upload/[uploadId]`.
- Mux.
- R2 is **not** involved in video uploads — videos go directly to Mux.

### Sequence

1. Teacher edits a `VIDEO_MUX` chapter and selects a video file.
2. Client `POST /api/courses/[id]/chapters/[id]/mux-upload`. Server:
   - Auth + `canEditCourse`.
   - If `MuxData` already exists for the chapter, deletes the old Mux asset (if not used elsewhere).
   - Calls `mux.video.uploads.create(...)` to get a Direct Upload URL + `uploadId`.
   - Upserts `MuxData { chapterId, muxUploadId, assetId: '' }` and clears `Chapter.videoUrl` (because the new upload is in flight).
   - Returns `{ uploadUrl, uploadId }`.
3. Client `PUT`s the video file directly to `uploadUrl` (Mux's S3-style URL). Browser does the upload; we never proxy the bytes.
4. Mux begins ingesting. The asset is not playable yet — `playbackId` is `null`.
5. Client starts polling `GET /api/admin/asset-library/mux-upload/[uploadId]` every few seconds.
6. Each poll: server calls `mux.video.uploads.retrieve(uploadId)`. While `status` is `waiting`/`asset_created` without `playback_ids`, returns "in progress".
7. When Mux reports the asset is ready: server reads `assetId` and the first `playbackId`, updates `MuxData` and sets `Chapter.videoUrl` to `https://stream.mux.com/${playbackId}.m3u8`.
8. Client stops polling and the player switches from "processing" to playable.

### State changes

- `MuxData.muxUploadId` set immediately.
- `MuxData.assetId` and `playbackId`, plus `Chapter.videoUrl`, set after the poller observes ready.

### Failure modes

- **Mux processing fails:** the poller surfaces Mux's error status. The chapter never becomes playable. Manual fix: delete the chapter's `MuxData` and re-upload.
- **User closes tab during processing:** that's fine — the next page load can resume polling using the same `uploadId` from `MuxData`.
- **Old asset still around:** if the pre-upload deletion of the previous asset fails (Mux down), we leave it; storage is paid but playback works. Periodically clean up orphans manually or via a script.
- **Wrong `contentType`:** if a chapter's `contentType` is not `VIDEO_MUX` but it has `MuxData`, the player won't render the Mux player. Update `contentType` to match.

### Where to look

- `app/api/courses/[courseId]/chapters/[chapterId]/mux-upload/route.ts`
- `app/api/admin/asset-library/mux-upload/route.ts` (asset-library variant)
- `app/api/admin/asset-library/mux-upload/[uploadId]/route.ts` (the poller)
- `app/(dashboard)/(routes)/teacher/courses/[courseId]/chapters/[chapterId]/_components/...` (the upload UI)

---

## 5. File upload + serving (R2)

The deep-dive lives in [`R2-IMPLEMENTATION.md`](./R2-IMPLEMENTATION.md). Summary:

### Upload sequence

1. Client (`components/file-upload.tsx`) computes the upload type from caller props (e.g. `courseImage`, `chapterPdf`, `blogPostCover`).
2. Client `POST /api/upload/presign` with `{ type, filename, contentType, courseId?, chapterId?, blogId? }`.
3. Server validates the type and content type against `ALLOWED_CONTENT_TYPES`; checks the user has the right role (teacher or blog manager); builds the R2 key (e.g. `private/courses/<id>/attachments/<uuid>-<filename>`); generates a presigned PUT URL.
4. Client `PUT`s the file directly to R2.
5. On success, the client constructs the app URL `/api/files/<key>` and persists it to the relevant resource via the appropriate PATCH endpoint.

### Serve sequence

1. Browser hits `/api/files/<key>`.
2. Middleware lets the request through (the route is in `isPublicRoute`).
3. Handler parses the key:
   - `public/...` keys: stream the object from R2 with `Cache-Control: public, max-age=...`.
   - `private/...` keys: enforce ACL based on the key shape (`private/courses/<id>/...` requires Purchase or staff; `private/users/<id>/...` requires self or admin; etc.).
4. R2 `getObject` returns a stream → handler returns a `NextResponse` streaming the bytes.

### Failure modes

- **CORS error on PUT:** R2 bucket lacks an `AllowedOrigins` entry for your origin. Add it.
- **403 on GET `/private/...`:** the user doesn't satisfy the ACL. This is correct behavior; check enrolment.
- **`NoSuchKey`:** R2 returned 404 — the file was deleted (or never uploaded). The handler returns 404; the UI should fall back to a placeholder.
- **Orphaned R2 objects on resource delete:** best-effort cleanup; some orphans expected.

### Where to look

- `lib/r2.ts`
- `app/api/upload/presign/route.ts`
- `app/api/files/[...path]/route.ts`
- `components/file-upload.tsx`
- `lib/validations.ts` (the `UploadType` enum, `ALLOWED_CONTENT_TYPES`, `MAX_FILE_SIZES`)

---

## 6. Quiz attempt (start → save → submit)

### Actors

- Student.
- Edwhere `quiz/start`, `quiz/save`, `quiz/submit` routes.
- MongoDB (`QuizAttempt`, `QuestionResponse`, `UserProgress`).

### Sequence

1. Student opens an `EVALUATION` chapter. The page checks for an active attempt:
   - `GET /api/courses/[id]/chapters/[id]/quiz/start`.
   - If there's a non-completed `QuizAttempt`, the route checks `timeLimit`:
     - Not expired → returns the active attempt + the (optionally shuffled) questions.
     - Expired → marks it `isCompleted=true` with whatever responses exist, computes score, and returns the now-historical attempt.
   - If no active attempt, returns the list of historical attempts (no new attempt created).
2. Student clicks "Start" → client `POST /api/.../quiz/start`. Server:
   - Auth; verifies enrolment (or free chapter, or staff).
   - Counts existing attempts; rejects if `>= maxAttempts`.
   - Creates `QuizAttempt { userId, quizId, isCompleted: false, startTime: now() }`.
   - Returns the attempt + shuffled questions (seeded by attempt id) when `randomize=true`.
3. As the student answers, the client sends `POST /api/.../quiz/save` per change. Server:
   - Verifies attempt exists, isn't completed, and `timeLimit` hasn't expired.
   - Upserts `QuestionResponse { attemptId, questionId, selectedOptions }`.
4. When the student clicks Submit (or `timeLimit` expires), client `POST /api/.../quiz/submit`. Server:
   - Verifies attempt and not already completed.
   - Loads `Quiz.questions` and the attempt's `QuestionResponse`s.
   - Grades each: a question is correct iff `selectedOptions` (as a set) equals `correctOptions` (as a set).
   - Computes `score = correct / total * 100`, sets `submittedAt`, `isCompleted=true`, `score`.
   - If `score >= passScore` (and `passScore` is set): upserts `UserProgress { userId, chapterId, isCompleted: true }`.
5. Result returned; UI shows score + per-question feedback.

### State changes

- `QuizAttempt`, multiple `QuestionResponse`s, optionally `UserProgress`.

### Failure modes

- **Time expiry race:** the user submits exactly as the timer expires. The submit route still works; `save` may have been rejected just before. Treat the latest persisted `QuestionResponse` set as authoritative.
- **`maxAttempts` bypass:** the count is checked at create time. Multiple concurrent `start` POSTs could in principle race past it; in practice the cost (Mongo round-trips) makes it rare. Add a unique index on `(userId, quizId, attemptNumber)` if this becomes an issue.
- **Tab switches:** `Quiz.maxTabSwitches` is **stored but not enforced server-side**. Client may report `tabSwitches` but the submit route does not auto-fail on it. Treat as advisory.
- **Per-question grading edge case:** for `isMultipleChoice=false` questions where `correctOptions` has length > 1, only an exact match passes. Avoid that data shape unless intentional.

### Where to look

- `app/api/courses/[courseId]/chapters/[chapterId]/quiz/start/route.ts`
- `app/api/courses/[courseId]/chapters/[chapterId]/quiz/save/route.ts`
- `app/api/courses/[courseId]/chapters/[chapterId]/quiz/submit/route.ts`
- `app/(course)/courses/[courseId]/chapters/[chapterId]/_components/quiz-player.tsx`

---

## 7. Hands-on project submission

### Sequence

1. Student opens a `HANDS_ON_PROJECT` chapter. The page calls `GET /api/.../project-submission` to load any existing submission.
2. Student pastes a Google Drive URL in `ProjectSubmissionForm` and submits.
3. Client `POST /api/.../project-submission { driveUrl }`. Server:
   - Auth; verifies enrolment (or free chapter, or staff).
   - Validates URL via Zod (must look like a Google Drive URL).
   - Upserts `ProjectSubmission { userId, chapterId, driveUrl, status: 'PENDING' }`.
   - **Auto-marks** `UserProgress { userId, chapterId, isCompleted: true }` if not already.
4. Teacher/Admin reviews via `/teacher/project-submissions/.../[chapterId]` and `PATCH /api/teacher/project-submissions/.../[submissionId]` with `{ status, reviewNote }`.

### Failure modes

- **Resubmission overwrites the previous URL** (unique index on `(userId, chapterId)`). The old `driveUrl` is gone; if you need history, change the schema.
- **Rejection does not undo completion.** Intentional. See domain model § 7.

### Where to look

- `app/api/courses/[courseId]/chapters/[chapterId]/project-submission/route.ts`
- `app/api/teacher/project-submissions/.../[submissionId]/route.ts`
- `app/(course)/courses/[courseId]/chapters/[chapterId]/_components/project-submission-form.tsx`

---

## 8. Marking chapter complete (the universal write path)

Almost every content type ends up writing `UserProgress` for the calling user. Three entry points:

| How                            | Endpoint                                                             |
| ------------------------------ | -------------------------------------------------------------------- |
| Student clicks "Mark complete" | `PUT /api/courses/[id]/chapters/[id]/progress { isCompleted: true }` |
| Quiz pass                      | side-effect of `quiz/submit`                                         |
| First project submission       | side-effect of `project-submission` POST                             |
| Correct gamified flag          | side-effect of `submit-flag` POST                                    |

All paths upsert `UserProgress` keyed by `(userId, chapterId)`. Course-level "% complete" is recomputed on demand (`actions/get-progress.ts`).

### Where to look

- `app/api/courses/[courseId]/chapters/[chapterId]/progress/route.ts`
- `app/api/courses/[courseId]/chapters/[chapterId]/submit-flag/route.ts`
- `actions/get-progress.ts`

---

## 9. Mentor Connect (chat)

### Sequence

1. Student opens `/courses/[id]/chat`. Page fetches the course, ensures access, and renders `MentorChatWrapper`.
2. Wrapper calls `GET /api/courses/[id]/messages` (no `threadStudentId` for STUDENT — the route derives it from the calling user's profile id).
3. Sending a message: client `POST /api/courses/[id]/messages { content }`. Server inserts a `CourseMessage` with the right `authorId` and `threadStudentId`.
4. On open, client `PUT /api/courses/[id]/messages/read-student` (or `.../read` on instructor side) to update `lastReadAt`.

### Instructor side

- Lists threads for a course at `/teacher/courses/[id]/mentor-connect`. Calls `GET /api/courses/[id]/chat-students` to enumerate students with messages.
- For a thread, calls `GET /api/courses/[id]/messages?threadStudentId=...`.
- Posting + read tracking via the same endpoints, with role authorisation.

### Failure modes

- **Profile id vs Clerk userId confusion** — the API takes care of this, but if you extend the chat, double-check.
- **Stale unread counts** — counts are computed at render. A `router.refresh()` after sending updates them.

### Where to look

- `app/api/courses/[courseId]/messages/route.ts`
- `app/api/courses/[courseId]/messages/read/route.ts`
- `app/api/courses/[courseId]/messages/read-student/route.ts`
- `app/api/courses/[courseId]/chat-students/route.ts`
- `app/(course)/courses/[courseId]/chat/_components/mentor-chat-wrapper.tsx`

---

## 10. Manual enrolment (admin bulk)

### Sequence

1. ADMIN visits `/teacher/enrolments`, picks a course, pastes/uploads a CSV of `{ name, email, phone }` rows.
2. Client `POST /api/admin/courses/[id]/enrol { students: [...] }`. Server, per row:
   - Look up `Profile` by email.
   - If not found, `clerkClient.users.createUser({ email })` to mint a Clerk identity.
   - Create the `Profile` mirror (role STUDENT).
   - Upsert `Purchase { userId, courseId, onboardingSource: MANUAL }`.
3. Returns a per-row outcome: `created`, `existing`, `already_enrolled`, `failed`.

### Failure modes

- **Duplicate Clerk emails:** Clerk rejects → row is `failed`.
- **Partial success:** the response contains the per-row breakdown; the UI displays it.
- **No automatic email** — students aren't notified. They must be told out of band that they have access.

### Where to look

- `app/api/admin/courses/[courseId]/enrol/route.ts`
- `app/(dashboard)/(routes)/teacher/enrolments/page.tsx`

---

## 11. Failure handling and retries — general policy

There is no centralised retry framework. Conventions:

- **Client mutations**: surface errors via `toast.error('Something went wrong')`. The user retries by clicking again. Buttons should be disabled while a request is in flight.
- **Server side**: catch in every handler, `handleApiError(tag, error)` returns a sanitized 500. There is no automatic retry of failed Mongo or 3rd-party calls.
- **Rate limiting**: only `/api/contact` is rate-limited. Everything else is unbounded. Be cautious of building public endpoints without limits.
- **Webhooks**: there are no webhook receivers. State convergence with Mux/Razorpay relies on either (a) client-driven verify (Razorpay) or (b) client-driven polling (Mux). If a step in the middle drops, an admin tool may be required to recover.
- **Background jobs**: there are none. Don't add a long-running task in a route handler — Vercel has a per-request timeout.

If you add a path that needs idempotency, deduplication, or retries, design it explicitly and document it here.
