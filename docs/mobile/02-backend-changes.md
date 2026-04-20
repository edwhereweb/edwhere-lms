# 02 — Backend Changes

This doc enumerates everything we have to change in the existing Next.js application to support a React Native client. The guiding principle: **add, don't rewrite**. The existing web surface keeps working; we layer a versioned, cross-origin, Bearer-auth API on top.

## 0. The non-changes (good news first)

- _Domain model, DB schema, and `lib/` helpers stay untouched.\*\* The mobile app talks to a new API surface that calls into the same `db`, `actions/`, and `lib/`_ helpers.
- **Razorpay verification logic stays identical.** The mobile flow uses the native Razorpay SDK but the server-side `POST /api/v1/razorpay/verify` is the same logic as today's `/api/razorpay/verify`.
- **R2 file proxy logic stays identical.** Just the auth source changes (cookie → Bearer).
- **Mux configuration stays identical.** The mobile player consumes the same `playbackId`.
- **Clerk roles, profiles, purchases — all the same.** No "mobile user" concept.

## 1. New `/api/v1/` namespace

We introduce a new top-level API prefix `/api/v1/` to hold every endpoint the mobile app calls. Why a new prefix:

- Lets us iterate on shape without breaking the web app's clients.
- Lets us version independently (`/api/v2/...` later if needed).
- Lets us make global cross-cutting decisions (CORS, response envelope, error shape) for mobile without touching web routes.

Most v1 endpoints will be **thin wrappers** over existing logic — they call the same helpers and `actions/`\* and return JSON.

### v1 endpoint inventory (student-only)

Grouped by lifecycle area. Detail (request/response shapes) belongs in the OpenAPI spec ([03-openapi-spec.md](./03-openapi-spec.md)).

| Group      | Method | Path                                                               | Purpose                                               |
| ---------- | ------ | ------------------------------------------------------------------ | ----------------------------------------------------- |
| Meta       | GET    | `/api/v1/meta/health`                                              | Lightweight liveness ping.                            |
| Meta       | GET    | `/api/v1/meta/min-app-version`                                     | Returns minimum supported app version.                |
| Profile    | GET    | `/api/v1/me`                                                       | Current user's `SafeProfile`.                         |
| Profile    | PATCH  | `/api/v1/me`                                                       | Update name, image.                                   |
| Profile    | POST   | `/api/v1/me/upload-url`                                            | Presigned R2 upload (profile image).                  |
| Catalog    | GET    | `/api/v1/courses`                                                  | Public catalog (search, category filter, pagination). |
| Catalog    | GET    | `/api/v1/courses/:idOrSlug`                                        | Course detail (chapters, modules, instructors).       |
| Catalog    | GET    | `/api/v1/categories`                                               | List categories.                                      |
| My courses | GET    | `/api/v1/me/courses`                                               | Enrolled courses + progress, split in/completed.      |
| My courses | GET    | `/api/v1/me/courses/:courseId`                                     | Course shell with full curriculum + progress.         |
| Player     | GET    | `/api/v1/courses/:courseId/chapters/:chapterId`                    | Chapter content (gated by access).                    |
| Player     | PUT    | `/api/v1/courses/:courseId/chapters/:chapterId/progress`           | Mark complete/incomplete.                             |
| Quiz       | GET    | `/api/v1/courses/:courseId/chapters/:chapterId/quiz/start`         | Get active or historical attempts.                    |
| Quiz       | POST   | `/api/v1/courses/:courseId/chapters/:chapterId/quiz/start`         | Create new attempt.                                   |
| Quiz       | POST   | `/api/v1/courses/:courseId/chapters/:chapterId/quiz/save`          | Save a question response.                             |
| Quiz       | POST   | `/api/v1/courses/:courseId/chapters/:chapterId/quiz/submit`        | Submit + grade.                                       |
| Project    | GET    | `/api/v1/courses/:courseId/chapters/:chapterId/project-submission` | Get current submission.                               |
| Project    | POST   | `/api/v1/courses/:courseId/chapters/:chapterId/project-submission` | Upsert submission.                                    |
| Gamified   | POST   | `/api/v1/courses/:courseId/chapters/:chapterId/submit-flag`        | Submit flag.                                          |
| Chat       | GET    | `/api/v1/courses/:courseId/messages`                               | List messages in this student's thread.               |
| Chat       | POST   | `/api/v1/courses/:courseId/messages`                               | Send message.                                         |
| Chat       | PUT    | `/api/v1/courses/:courseId/messages/read`                          | Mark thread as read (StudentLastRead).                |
| Payment    | POST   | `/api/v1/courses/:courseId/checkout`                               | Create Razorpay order; returns key + orderId.         |
| Payment    | POST   | `/api/v1/razorpay/verify`                                          | Verify payment + create Purchase.                     |

### Implementation strategy

For each v1 route:

1. Create the file under `app/api/v1/...`.
2. **Reuse** the existing helper / action wherever possible (e.g. `getDashboardCourses`, `getChapter`, `getProgress`).
3. Wrap with the canonical handler shape (auth + validate + body + try/catch + `handleApiError`).
4. Return a stable response envelope (see § 6).

In some cases the existing route is a perfect fit and we can simply re-export the same handler from `/api/v1/...`. In most cases we want a slimmer, mobile-friendly response shape, so a new handler is cleaner.

## 2. Authentication: Clerk Bearer tokens

The web app authenticates via Clerk session **cookies** managed by `clerkMiddleware()`. Mobile cannot share cookies cross-app, so we use Clerk session **JWT tokens** sent as `Authorization: Bearer <token>`.

### Mobile side

- Use `@clerk/clerk-expo` (or `@clerk/clerk-react-native` once stable).
- After sign-in, call `getToken()` to get a session JWT.
- Send `Authorization: Bearer <jwt>` on every API request.
- Refresh tokens automatically on expiry (Clerk SDK does this).

### Server side

**Good news**: `clerkMiddleware()` from `@clerk/nextjs/server` already accepts Bearer tokens out of the box for API routes. The current `auth()` helper in route handlers will return the same `userId` whether the request was authenticated via cookie or Bearer.

What we need to verify / change:

- **No code change required for `auth()` itself.** Clerk handles it.
- **Public route allowlist** in `middleware.ts` must include the new public v1 endpoints (`/api/v1/courses(.*)`, `/api/v1/categories`, `/api/v1/meta/(.*)`). All other v1 endpoints stay protected.
- **CORS headers** must be added for `/api/v1/`\* (see § 3).

Suggested update to `middleware.ts`:

```ts
const isPublicRoute = createRouteMatcher([
  // existing entries...
  '/api/v1/meta/(.*)',
  '/api/v1/courses', // catalog list
  '/api/v1/courses/(.*)', // catalog detail (NOTE: detail only — but my-courses paths overlap, see below)
  '/api/v1/categories'
]);
```

> **⚠ Careful with route overlap:** `GET /api/v1/courses/:idOrSlug` (catalog detail, public) and `GET /api/v1/me/courses/:courseId` (enrolled, private) intentionally live at different paths. **Do not** put `/api/v1/courses/(.*)` in the public list if you nest student-only routes under `/api/v1/courses/...`. Use `/api/v1/me/courses/...` for student-private surfaces and keep `/api/v1/courses` for public catalog only. The route table in § 1 is designed with this split.

Player-side endpoints (`/api/v1/courses/:courseId/chapters/...`, etc.) are private; do not put them under the public matcher. They remain auth-protected.

### Phase 2 note

For the future Teacher/Admin app, no auth changes needed — the same Bearer flow extends to staff users since role gating is in the handlers.

## 3. CORS for mobile clients

### Why

React Native's networking stack does not enforce browser CORS for native fetches, **but** any in-app browser/WebView (e.g. opening Razorpay's checkout fallback or a YouTube embed) does. Plus the OpenAPI Swagger UI (§ Doc 03) needs CORS to call the API for try-it-out.

### What to add

In `next.config.js` `headers()`, add a **scoped** rule for `/api/v1/(.*)` and `/api/openapi.(json|yaml)`:

```js
{
  source: '/api/v1/:path*',
  headers: [
    { key: 'Access-Control-Allow-Origin', value: '*' },
    { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,PATCH,DELETE,OPTIONS' },
    { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
    { key: 'Access-Control-Max-Age', value: '86400' },
  ],
},
```

And handle preflight `OPTIONS` in a small shared helper or via a Next.js middleware branch:

```ts
// in middleware.ts, before clerkMiddleware
if (req.method === 'OPTIONS' && req.nextUrl.pathname.startsWith('/api/v1/')) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      /* same as above */
    }
  });
}
```

> **Security note**: `*` for `Allow-Origin` is acceptable here because (a) mobile native fetches don't care, (b) the API requires Bearer tokens for any sensitive route, and (c) we don't use cookies on `/api/v1/`\*. If you ever add a cookie-bearing v1 endpoint, switch to a strict origin allowlist and `Allow-Credentials: true`.

`/api/files/...` also needs CORS for image/PDF rendering when accessed from native components that hit through a WebView. Same scope of headers.

## 4. R2 file proxy: Bearer auth compatibility

`app/api/files/[...path]/route.ts` uses `auth()` to read the Clerk session. Because `auth()` already supports Bearer tokens via `clerkMiddleware`, this works **as-is** for the mobile app — no code change needed.

What might need attention:

- The route returns the binary stream with `Cache-Control: private, max-age=3600`. For mobile, that's fine; the OS HTTP cache will reuse it.
- For PDFs: `react-native-pdf` can fetch a remote URL; pass the file URL with the `Authorization` header via the `source` prop. Verify in spike that it sends headers; some versions need a workaround.
- For images: pass the URL with `headers` to `<Image>` (RN supports `source={{ uri, headers: { Authorization: ... } }}`).

If header passing turns out to be flaky for some component, fallback options:

- **Time-limited signed URL endpoint**: add `GET /api/v1/files/sign?key=...` that returns a short-lived presigned R2 GET URL via `createPresignedGetUrl()` (already exists in `lib/r2.ts`). Mobile uses that URL directly without auth headers. This bypasses the access-control check — so the sign endpoint itself must enforce ACL using the same logic from `authorizePrivateAccess`. Recommended only as a fallback.

Decision pending — see [open question Q2](./05-open-questions.md#q2-private-file-access-from-rn-bearer-headers-or-presigned-urls).

## 5. Razorpay on mobile

### What changes

- Use the **Razorpay React Native SDK** (`react-native-razorpay`) instead of the web `checkout.js`.
- The native SDK opens its own modal and returns the same `{ razorpay_order_id, razorpay_payment_id, razorpay_signature }` triplet to the JS side.
- **Server-side `verify` logic is unchanged.** It's still HMAC + cross-check `notes.userId` and `notes.courseId` + amount cross-check.

### What we need server-side

- Expose `POST /api/v1/courses/:courseId/checkout` returning `{ orderId, amount, currency, key }` — exactly as today's web checkout route does.
- Expose `POST /api/v1/razorpay/verify` — exactly today's verify logic (we can reuse it directly).

### Razorpay key delivery

- The browser receives `NEXT_PUBLIC_RAZORPAY_KEY_ID` from the build. Mobile cannot read that env var.
- Solution: include `key` in the `/checkout` response (we already do this on the web). The mobile SDK uses it to open the modal.

### App-store compliance reminder

iOS / Play Store have rules about in-app purchases of "digital content". Razorpay payments for online learning courses generally fall under acceptable categories (services, not consumable in-app content), but **this needs legal/product confirmation**. See [open question Q1](./05-open-questions.md#q1-app-store-billing-rules-for-course-purchases).

## 6. Response envelope and error shape

The current API returns either bare entities (`NextResponse.json(course)`) or `{ error: '...' }` envelopes inconsistently. For the mobile API we should standardise.

### Proposed shape

Success:

```json
{
  "data": <payload>,
  "meta": { /* pagination, etc., when applicable */ }
}
```

Error:

```json
{
  "error": {
    "code": "FORBIDDEN" | "NOT_FOUND" | "VALIDATION" | "RATE_LIMITED" | "INTERNAL" | ...,
    "message": "Human readable message",
    "details": { /* optional, e.g. zod issues */ }
  }
}
```

### Implementation

- Add `lib/api-v1-utils.ts` with `apiV1Ok(data, meta?)`, `apiV1Error(code, message, status, details?)`.
- Replace `apiError`/raw `NextResponse.json` calls in `/api/v1/*` handlers with these.
- Keep existing `/api/*` (web) routes unchanged.
- Document the envelope in the OpenAPI spec.

[comment]: Think of introducing a standard api structure for both web and app, We can still use the v1, but that could be purely for api versioning, apart from that the web and app should use the same api, I think this is a good to have.

## 7. Pagination

The mobile catalog will need real pagination (the current web catalog isn't paginated server-side; it loads everything). For v1 endpoints that return collections:

- Add cursor- or offset-based pagination. Recommend cursor-based to avoid skip costs at scale.
- Pagination input: `?cursor=...&limit=20`.
- Pagination output: `meta: { nextCursor, hasMore, total? }`.

Affected endpoints: `GET /api/v1/courses`, `GET /api/v1/me/courses`, `GET /api/v1/courses/:id/messages`.

## 8. Chapter content gating: keep server-driven

`actions/get-chapter.ts` already nullifies sensitive fields (videoUrl, attachments) when the user lacks access. The mobile API should do the same — never expose `playbackId` for a paid chapter to a non-purchaser. Reuse `getChapter()` directly.

For Mux, `playbackId` itself is enough to play the video (HLS is open). If a `playbackId` leaks, anyone can stream it. Two mitigation paths:

- **Status quo**: rely on never-leak from API + Mux's URL signing being optional.
- **Signed playback** (Mux feature): generate signed playback URLs on the server (Mux supports JWT-signed URLs). The mobile player accepts these.

For Phase 1 we recommend status quo + an internal task to evaluate signed playback for Phase 1.5 if revenue grows.

## 9. Chat (Mentor Connect) on mobile

The chat endpoints are unchanged in semantics. For mobile:

- Polling vs WebSocket — Phase 1 is **polling**. The web app does the same (no real-time push exists today). Polling interval: 10–15 s while the chat screen is foreground; pause when backgrounded.
- Add a `since` parameter to `GET /api/v1/courses/:courseId/messages?since=<isoDate>` to fetch incremental messages. This is a minor change — add query parsing in the new handler.

## 10. App version gating

Add `GET /api/v1/meta/min-app-version` returning:

```json
{
  "data": {
    "minIos": "1.0.0",
    "minAndroid": "1.0.0",
    "latestIos": "1.2.0",
    "latestAndroid": "1.2.0",
    "forceUpgrade": false
  }
}
```

Behaviour:

- Backed by env vars or a config record (start with env vars: `MOBILE_MIN_IOS`, `MOBILE_MIN_ANDROID`, `MOBILE_LATEST_IOS`, `MOBILE_LATEST_ANDROID`).
- Public endpoint (no auth).
- Mobile app calls this on launch. If `forceUpgrade` or the running version is below `min*`, show a hard upgrade screen.

## 11. Telemetry hooks (optional, recommended)

For mobile-driven traffic we'll want to know what's hitting v1 endpoints. Two cheap additions:

- A `User-Agent` convention for the app: `EdwhereMobile/<version> (<platform>; <os version>)` — easy to grep in logs.
- An `X-App-Version` header sent by the mobile app on every request, validated server-side and persisted in the `Logging` collection (when logging is enabled for that route).

No code-side gating; just analytics-ready.

## 12. Summary checklist of backend tasks

- Create `app/api/v1/` directory and add the routes from § 1 (one PR per group is fine).
- Add `lib/api-v1-utils.ts` with the standard envelope helpers.
- Update `middleware.ts` to allow public v1 endpoints (catalog, meta) and to handle `OPTIONS` preflight on `/api/v1/*`.
- Update `next.config.js` `headers()` to add CORS for `/api/v1/*` and `/api/files/*`.
- Verify Clerk Bearer auth works against an example v1 route from a curl with an actual token (smoke test).
- Decide on private-file access strategy for mobile (headers vs signed URL) and implement.
- Add `since` query support to `messages` endpoint.
- Add `meta/min-app-version` route + env wiring.
- Generate or hand-write the OpenAPI spec (see [03-openapi-spec.md](./03-openapi-spec.md)).
- Mount Swagger UI at `/api/docs` (or `/docs`) for internal use.
- Update `lib/env.ts` with any new vars (mobile version pins, etc.).
- Update `.env.example`, `AGENTS.md` (add v1 conventions section), and add any new env to CI.
- Add a v1 smoke-test script under `scripts/` that hits each public v1 endpoint and asserts shape (cheap acceptance net).

Estimated backend effort, rough: **2–3 weeks for one engineer** including tests + docs.
