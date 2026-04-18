# 01 — Scope & MVP

## 1. Audience

The mobile app is **students only**. A student is a Clerk-authenticated user with `Profile.role = "STUDENT"` (or any other role, but treated as a student in the app — see § 6).

No teacher, admin, marketer, or blogger workflows ship in v1. If a logged-in user has a non-STUDENT role on the web, the mobile app does not expose any staff surface. They can still consume courses they are enrolled in, like any student.

## 2. The student lifecycle (what the app must support)

The lifecycle is exactly what the existing `/dashboard` + `/courses/[id]/...` consumer experience supports today on the web. Broken down:

### 2.1 Onboarding & auth

- Sign up (email + password and / or social, whatever Clerk is configured for).
- Sign in.
- Forgot / reset password (Clerk-handled).
- Sign out.
- View / edit basic profile (name, profile image).

### 2.2 Course discovery

- Browse the public catalog (paginated list of published, web-visible courses).
- Filter by category.
- Search by title.
- View a course detail page: description, image, price, category, instructors, curriculum (modules + chapters), free preview chapters.

### 2.3 Purchase

- Tap "Enroll" → server creates a Razorpay order → native Razorpay checkout opens → on success, server verifies and creates a `Purchase`.
- Show the new purchase in "My Courses" immediately on success.

### 2.4 My courses (dashboard)

- List of enrolled courses, split into **In Progress** and **Completed** (same logic as `actions/get-dashboard-courses.ts`).
- Per-course progress %.
- Tap to enter a course.

### 2.5 Course consumption

- Course "home": title, description, instructors, curriculum, progress.
- Open a chapter. The player must support every `contentType`:
  - `VIDEO_MUX` — Mux player (HLS) using `playbackId`.
  - `VIDEO_YOUTUBE` — YouTube embed via WebView or `react-native-youtube-iframe`.
  - `TEXT` — render text/markdown.
  - `HTML_EMBED` — sandboxed WebView render.
  - `PDF_DOCUMENT` — `react-native-pdf` reading from the `/api/files/...` URL.
  - `HANDS_ON_PROJECT` — show submission form (paste a Google Drive URL), show review status.
  - `EVALUATION` — quiz player.
- "Mark complete" button writes `UserProgress`.
- Auto-completion side effects (quiz pass, project submit, gamified flag) work the same as web.

### 2.6 Quizzes

- Start, save responses, submit. Server is the source of truth for grading and `passScore` enforcement.
- Show timer if `timeLimit` is set; expire client-side AND let server enforce on submit.
- Show previous attempts and final scores.

### 2.7 Mentor Connect (chat)

- Per-course private thread between the student and the course's instructors.
- List + send messages.
- Update `StudentLastRead` when the screen opens (so unread counters work).
- Unread badge on the course tile.

### 2.8 Project submissions

- Submit a Google Drive URL for `HANDS_ON_PROJECT` chapters.
- View submission status (`PENDING` / `APPROVED` / `REJECTED`) and review note.

### 2.9 Notifications (in-app, not push)

- Show toasts for success/error states. (Push notifications are explicitly out of scope for Phase 1; see [05-open-questions.md](./05-open-questions.md).)

## 3. Explicitly out of scope for Phase 1

- All `/teacher` surface (course creation, learners, analytics, asset library, project review, pending approvals).
- All `/marketer` and `/blogger` surface.
- Public blog reading inside the app.
- Public contact form.
- Push notifications.
- Offline content download (chapter videos, PDFs).
- Background download / sync.
- Deep CRM features for leads.
- Manual enrolment by admins (handled on web, syncs naturally).
- Refunds (handled out of band on Razorpay dashboard).
- Multi-language / i18n (default to English; structure should not preclude later i18n).
- Tablet-optimised layouts (phone-first; tablets get the same layout).

## 4. Platforms

- **iOS** 14+.
- **Android** 8.0+ (API 26+).

If a major dependency drops support for either, we revisit.

## 5. Success criteria for Phase 1

The student app is "done" for Phase 1 when:

1. A new user can install, sign up, browse, purchase a course (Razorpay test mode end-to-end), consume every `contentType` chapter, mark progress, take a quiz, submit a project, and chat with a mentor.
2. A user enrolled via the web can sign in on mobile and see their courses without any data discrepancy.
3. A user enrolled via mobile can sign in on web and see the same.
4. The same `Purchase` row backs both surfaces — no "mobile-only" data shapes.
5. Server-side OpenAPI spec is published and the mobile client is generated/derived from it (or at least kept in lockstep).
6. App works on both iOS and Android, light and dark mode.

## 6. Note on roles inside the mobile app

If a Clerk user with `TEACHER` / `ADMIN` / etc. role signs into the mobile app, they should see **the student experience**: dashboard, courses they're enrolled in, etc. The app does not try to enforce "STUDENT only" — it simply doesn't expose staff features. This means:

- Free chapter access for staff (owners/instructors/admin) still works through the existing access logic in the API.
- A teacher viewing their own course in the app sees it as a learner would.

This avoids needing a separate "is mobile" gate on the server and keeps the contract clean. If product wants to actively block non-STUDENT roles from the mobile app in v1, see [open question Q5](./05-open-questions.md#q5-do-non-student-roles-get-mobile-access-in-v1).

## 7. Versioning policy

- The mobile app talks to **`/api/v1/...`** endpoints (a new prefix we'll introduce — see [02-backend-changes.md](./02-backend-changes.md)).
- Breaking changes to v1 require a v2 endpoint; the v1 endpoint stays alive until older app versions are retired.
- The app pings `/api/v1/meta/min-app-version` on startup (or similar; see [04-rn-architecture-and-flow.md](./04-rn-architecture-and-flow.md)) to know if it must force-upgrade.
