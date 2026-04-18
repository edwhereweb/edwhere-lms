# 00 — Architecture & Mental Model

## 1. What this app is

Edwhere LMS is a Next.js 14 App Router monolith deployed as a single serverless Next.js application (Vercel-style). It serves three audiences:

- **Public visitors** — marketing pages, course catalog, blog, contact form (no login required).
- **Authenticated learners (STUDENT)** — buy courses, watch videos, take quizzes, submit projects, chat with mentors.
- **Authenticated staff** — `TEACHER`, `ADMIN`, `MARKETER`, `BLOGGER` roles with progressively elevated dashboards.

There is no separate API service, no message broker, no background worker, and no separate web/mobile client. Everything lives inside the same Next.js app. State is held in MongoDB; binary assets in Cloudflare R2 and Mux; auth in Clerk; payments via Razorpay.

## 2. The 30-second mental model

```
┌──────────────────────────── Next.js App (single deployable) ────────────────────────────┐
│                                                                                          │
│   Browser ──HTTP──▶  middleware.ts  ──▶  App Router                                      │
│                       (Clerk auth)         │                                              │
│                                            ├── (public)/...      → Server Components     │
│                                            ├── (auth)/...        → Clerk-rendered pages  │
│                                            ├── (dashboard)/...   → role-gated pages      │
│                                            ├── (course)/...      → consumption UI        │
│                                            └── api/...           → REST handlers         │
│                                                                                          │
│                                            Server Components & API routes                │
│                                            ┌──────────────────────────────────┐         │
│                                            │  actions/   reusable server fns  │         │
│                                            │  lib/       db, env, validations │         │
│                                            └──────────────────────────────────┘         │
│                                                          │                              │
└──────────────────────────────────────────────────────────┼──────────────────────────────┘
                                                          │
              ┌───────────────────────────────────────────┴────────────────────────────┐
              │                                                                        │
              ▼                ▼                ▼                ▼                ▼
        ┌─────────┐      ┌─────────┐      ┌─────────┐      ┌─────────┐     ┌──────────┐
        │ Clerk   │      │ MongoDB │      │   R2    │      │   Mux   │     │ Razorpay │
        │ (auth)  │      │ (data)  │      │ (files) │      │ (video) │     │ (pay)    │
        └─────────┘      └─────────┘      └─────────┘      └─────────┘     └──────────┘
```

## 3. Main "modules" (logical, not packages)

Although there are no separate services, the codebase is organised by **route groups**. Each behaves as a logical module with its own concerns and audience:

| Module                  | Code path                                       | Purpose                                                                                                         |
| ----------------------- | ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| **Public site**         | `app/(public)/`                                 | Marketing landing pages, public course catalog, public blog. No login. Server-rendered, SEO-tuned.              |
| **Auth**                | `app/(auth)/`                                   | Clerk-hosted sign-in/sign-up screens.                                                                           |
| **Student dashboard**   | `app/(dashboard)/(routes)/dashboard`, `/search` | Logged-in student home, course browse, purchase entry points.                                                   |
| **Course consumption**  | `app/(course)/courses/[id]/`                    | The "player". Watch videos, read PDFs/text, take quizzes, submit projects, mentor chat.                         |
| **Teacher mode**        | `app/(dashboard)/(routes)/teacher/`             | Course CRUD, learners, analytics, asset library, project review, pending approvals.                             |
| **Admin extras**        | inside `teacher/` (role-gated)                  | Manage users, manual enrolment, categories, course approvals — all live under `/teacher/...` but require ADMIN. |
| **Marketer**            | `app/(dashboard)/(routes)/marketer/`            | Lead pipeline (CRM-lite), blog management.                                                                      |
| **Blogger**             | `app/(dashboard)/(routes)/blogger/`             | Blog post creation/editing.                                                                                     |
| **REST API**            | `app/api/`                                      | All mutations + a few read endpoints called from client components.                                             |
| **Server-side helpers** | `actions/`, `lib/`                              | Reusable async functions used by server components and API routes.                                              |

Treat these route groups as the unit of "service" boundary. Each one has a clearly scoped audience and access policy.

## 4. How a request flows

### 4.1 Page request (Server Component)

1. Browser hits a path, e.g. `/courses/<id>/chapters/<id>`.
2. `middleware.ts` runs first. Clerk middleware decides if the route is public (matched by `isPublicRoute`) or protected. If protected and unauthenticated, it returns 401 and Clerk redirects to `/sign-in`.
3. Next.js App Router matches the route to a page (`app/(course)/courses/[courseId]/chapters/[chapterId]/page.tsx`).
4. The page is a **Server Component**: it `await`s `auth()`, then calls actions (e.g. `getChapter`, `getProgress`) that hit the DB via `lib/db.ts` (Prisma singleton).
5. The rendered HTML + RSC payload is streamed to the browser.
6. Client Components hydrate (e.g. `VideoPlayer`, `CourseEnrollButton`) and may call API routes from the browser.

### 4.2 Mutation (API route)

1. Client component issues `fetch`/`axios` to `/api/...`.
2. `middleware.ts` enforces auth on non-public API paths.
3. Route handler in `app/api/.../route.ts` follows the canonical pattern:
   1. `auth()` from Clerk → `userId`.
   2. Role / ownership check (e.g. `isTeacher()`, `checkCourseEdit()`, `currentProfile()`).
   3. `validateBody(schema, body)` from `lib/api-utils.ts` using a Zod schema in `lib/validations.ts`.
   4. Business logic (Prisma + optional 3rd-party SDK call).
   5. `NextResponse.json(...)` or `apiError(...)` / `handleApiError(...)`.
4. The client receives JSON, then often calls `router.refresh()` to re-render Server Components with new data.

### 4.3 The middleware contract

Defined in `middleware.ts`. Public routes (no Clerk auth required):

```
/                 /contact          /courses(.*)
/sign-in(.*)      /sign-up(.*)     /blog(.*)
/api/webhook(.*)  /api/files(.*)   /api/contact
/api/health       /api/public(.*)
```

Everything else requires a signed-in Clerk session. The matcher excludes static assets, image files, and `_next/*`.

> **Important:** `/api/files/*` is intentionally public at the middleware layer because the route itself does fine-grained access control: `private/*` keys do their own enrollment/role checks, `public/*` keys are open by design. See [R2-IMPLEMENTATION.md](./R2-IMPLEMENTATION.md).

## 5. Key dependencies between components

```
                        Server Components (pages) ───────────┐
                                  │                          │
                                  ▼                          │
                            actions/* ── readers             │
                                  │                          │
                                  ▼                          │
                              lib/db (Prisma) ◀──── lib/r2 (R2 keys)
                                  ▲                          │
                                  │                          │
                                  │                          ▼
        Client Components ── fetch ──▶ app/api/* ──▶  validations + auth helpers
                                                          │
                                                          ▼
                                                    third-party SDKs
                                                    (Mux, Razorpay, Clerk, R2)
```

- `lib/db.ts` is the **only** sanctioned `PrismaClient` instance (singleton). Never `new PrismaClient()` elsewhere.
- `lib/env.ts` validates env vars at startup with Zod and throws if invalid.
- `lib/validations.ts` is the **only** place new Zod request schemas should live.
- `lib/api-utils.ts` provides `apiError`, `validateBody`, `handleApiError` — every API route uses them.
- 3rd-party SDKs (Mux, Razorpay, R2 S3 client) are **always lazy-instantiated** via getter functions to avoid build-time crashes when env vars are missing.

## 6. Data stores, queues, caches

| Store             | What lives there                                                                                                                                 |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **MongoDB Atlas** | All structured data: profiles, courses, chapters, modules, purchases, quizzes, attempts, messages, leads, blog posts. Accessed via Prisma.       |
| **Cloudflare R2** | All app-uploaded files: images, PDFs, attachments, question images, blog images. Single bucket, prefix-based public/private split.               |
| **Mux**           | Video assets (uploaded by teachers, streamed via HLS to learners). YouTube videos are an alternative: stored as `youtubeVideoId`, embedded.      |
| **Clerk**         | All identity + sessions. We mirror a slim copy into `Profile` on first login (see `actions/get-safe-profile.ts`).                                |
| **Razorpay**      | Payment orders + completed payments. We never store card details. We persist a `Purchase` record after server-side signature verification.       |
| **In-memory map** | `lib/rate-limit.ts` is a single-process sliding window used only for the `/api/contact` endpoint. **Not** distributed — see "sharp edges" in 08. |

There are **no message queues, no Redis, no background workers, no cron jobs** in this codebase. The closest thing to "async" is:

- The Mux upload poller — the client polls `GET /api/admin/asset-library/mux-upload/[uploadId]` after a Mux Direct Upload to backfill `assetId` / `playbackId` once Mux finishes processing.
- The Razorpay flow — client opens Razorpay modal, server verifies signature on completion.

## 7. Synchronous vs asynchronous flows

**Synchronous (request/response in one HTTP round-trip):**

- All page renders.
- Course/chapter/module CRUD.
- Profile updates, category management.
- Marking chapter complete (`PUT /api/courses/.../progress`).
- Quiz save/submit.
- Mentor chat send/list.
- Razorpay verify (we wait for the signature check + DB write).
- File proxy reads from `/api/files/*`.

**Async / multi-step (require polling or callback):**

- **Mux video upload**: client → presigned URL from Mux → client `PUT`s file → client polls our backfill endpoint until `playbackId` appears.
- **Razorpay checkout**: server creates order → client opens modal → user pays → Razorpay callback fires `handler` in browser → client posts to `/api/razorpay/verify`.

There are no webhooks from Mux or Razorpay configured in this codebase. State convergence relies on client-side polling (Mux) and the verify-on-success handshake (Razorpay).

## 8. Deployment boundaries

There is **one** deployable: the Next.js app. Recommended host is Vercel (per the README). Required external services and their secrets are listed in [01-developer-guide.md](./01-developer-guide.md).

The application is stateless aside from the single in-memory rate limiter. All state is externalised. Horizontal scaling works out of the box.

## 9. Security headers and surface area

Set in `next.config.js`:

- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `poweredByHeader: false`

Allowed remote image hosts: `utfs.io` (legacy UploadThing), `img.clerk.com` (Clerk avatars). R2 files are served same-origin via `/api/files/...` so they don't need to be allow-listed here.

## 10. What the architecture is NOT

So you don't waste time looking for things that aren't there:

- No webhook receivers (no `/api/webhook/*` is implemented even though middleware allows the prefix).
- No email service. The contact form just creates a `Lead` row.
- No notifications. Mentor chat unread counts are computed by comparing `lastReadAt` timestamps server-side on each render.
- No background job runner. Mux processing convergence is client-poll based.
- No multi-tenancy. There is one logical "Edwhere" tenant.
- No feature flags or A/B framework.
- No GraphQL. Everything is REST over App Router route handlers.

## 11. Where to look next

- For "how do I run this locally?" → [01-developer-guide.md](./01-developer-guide.md).
- For "what does the data look like?" → [03-data-model.md](./03-data-model.md).
- For "what happens when a user clicks Enroll?" → [06-critical-paths.md](./06-critical-paths.md#payment--purchase).
