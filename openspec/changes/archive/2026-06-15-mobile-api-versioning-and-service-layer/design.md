## Context

The Edwhere LMS is a Next.js 14 monolith serving three clients:

1. **LMS Web** — the Next.js dashboard (`/api/*`), cookie-authenticated via Clerk
2. **Admin/Teacher App** — a React Native mobile app (`/api/mobile/admin/*`), ~78 route files
3. **Student App** — a React Native mobile app (`/api/mobile/*` non-admin), ~12 route files

All three surfaces live in the same codebase and share `lib/db.ts`, `lib/validations.ts`, and `lib/api-utils.ts`. However, business logic (Prisma queries, authorization, mutations) is duplicated across web and mobile route handlers — each route file contains its own inline implementation. The mobile design docs (`docs/mobile/02-backend-changes.md`) specified a versioned `/api/v1/` namespace with standardised envelopes, CORS, and `min-app-version`, but the implementation diverged to an unversioned `/api/mobile/` namespace without those mechanisms.

Key constraints:

- Mobile apps are deployed to app stores; old versions persist on user devices for weeks/months.
- The web surface must remain untouched during this change — no regressions.
- The project follows a "keep it simple" philosophy (AGENTS.md): no over-engineering, no abstractions that aren't immediately needed.
- All routes follow a strict pattern: auth → validate → business logic → response → catch.

## Goals / Non-Goals

**Goals:**

- Eliminate business-logic duplication between web and mobile route handlers so that bug fixes and feature changes propagate automatically to both surfaces.
- Establish a consistent, versioned response envelope for all `/api/mobile/*` routes that mobile clients can parse uniformly.
- Provide a backward-compatibility mechanism (`min-app-version`) so breaking API changes don't crash deployed mobile apps.
- Standardise authorization in mobile routes to use existing helpers (`isTeacher`, `isMarketer`, `currentProfile`) instead of inline `db.profile.findUnique` + manual role checks.
- Add CORS support for `/api/mobile/*` to handle WebView and API documentation tooling.

**Non-Goals:**

- Rewriting or restructuring existing web `/api/*` routes — they remain as-is. Web routes may optionally adopt service-layer calls over time, but this is not required by this change.
- Building a full OpenAPI spec or Swagger UI (documented separately).
- Implementing real-time push (WebSocket) for mobile — polling remains the approach.
- Adding rate limiting, caching, or API gateway abstractions.
- Changing the URL namespace from `/api/mobile/` to `/api/v1/` — we keep the current namespace and version via headers/envelope.

## Decisions

### D1: Service Layer Pattern — Function Modules, Not Classes

**Decision:** Create `lib/services/<domain>.ts` files exporting plain async functions, not class-based services.

**Rationale:** The codebase uses functional patterns throughout (`actions/*.ts`, `lib/*.ts`). Classes would introduce an unfamiliar pattern and require instantiation/DI patterns that conflict with the project's simplicity philosophy. Functions are tree-shakeable and directly testable.

**Structure:**

```
lib/services/
  batch-service.ts      — listBatches, createBatch, updateBatch, ...
  course-service.ts     — listCourses, createCourse, updateCourse, ...
  category-service.ts   — listCategories, createCategory, ...
  blog-service.ts       — listBlogs, createBlog, publishBlog, ...
  asset-service.ts      — listAssets, createAsset, bulkDelete, ...
  lead-service.ts       — listLeads, createLead, closeLead, ...
  payment-service.ts    — listPaymentEntries, markPaid, requestDeletion, ...
```

Each function takes explicit parameters (userId, role, data) rather than reading auth from context — this keeps them pure and testable. Route handlers remain responsible for auth and request parsing.

**Alternatives considered:**

- _Class-based service layer with DI_: Over-engineered for this codebase; no DI container exists.
- _Shared route handlers (re-export from web)_: Tightly couples response shapes across surfaces; mobile needs different envelopes.
- _Keep duplication, add tests_: Does not solve the drift problem; doubles maintenance cost as features grow.

### D2: Version Strategy — Header + Envelope, Not URL Path

**Decision:** Keep `/api/mobile/` as the namespace. Signal version via `X-API-Version: 1` response header and a standardised `{ data, meta } / { error }` envelope.

**Rationale:** The ~90 mobile route files already exist under `/api/mobile/`. Renaming to `/api/v1/` would be a massive churn with no functional benefit. Header-based versioning is simpler to implement and allows future v2 changes to be opt-in via request header (`Accept-Version: 2`). The envelope itself is the real contract — the URL is just a namespace.

**Alternatives considered:**

- _URL-based versioning (`/api/v1/`, `/api/v2/`)_: Requires duplicating all route files for each version; wasteful when most endpoints don't change between versions.
- _No versioning_: Current state; no way to make breaking changes safely.

### D3: Mobile Envelope — Wrap All Responses

**Decision:** Create `lib/api-mobile-utils.ts` with:

- `mobileSuccess(data, meta?)` → `{ data: T, meta: M | null }` with status 200
- `mobileCreated(data)` → `{ data: T, meta: null }` with status 201
- `mobileError(code, message, status, details?)` → `{ error: { code, message, details } }`

All `/api/mobile/*` routes use these instead of raw `NextResponse.json` or `apiError`.

**Rationale:** A uniform envelope lets the mobile app parse responses with a single generic handler. Error codes (UNAUTHORIZED, FORBIDDEN, NOT_FOUND, VALIDATION, INTERNAL) are machine-readable and let the app show appropriate UI without string-matching on human-readable messages.

**Alternatives considered:**

- _Keep current `apiError` as-is_: Returns `{ error: string }` — not machine-parseable, no error codes, inconsistent with success shape.
- _Modify existing `apiError` for everyone_: Risks breaking web clients that parse `{ error: string }`.

### D4: Auth Standardisation — Require `isTeacher`/`isMarketer` Helpers

**Decision:** All mobile admin routes SHALL use `isTeacher()` or `isMarketer()` from `lib/teacher.ts` / `lib/marketer.ts` for role checks. Inline `db.profile.findUnique` + manual role comparison is prohibited.

**Rationale:** The existing helpers already exist and encapsulate the logic. Inline checks are error-prone (some routes check `ADMIN && TEACHER`, others check only `ADMIN`) and add unnecessary DB roundtrips when `currentProfile()` has already been called.

Where a route needs both the profile object AND the role check (e.g., to read `profile.id` for scoping queries), use `currentProfile()` directly and check `profile.role` — but via a shared pattern, not ad-hoc inline queries.

### D5: CORS — Scoped to `/api/mobile/*` via `next.config.js`

**Decision:** Add CORS headers in `next.config.js` `headers()` scoped to `/api/mobile/:path*`. Handle OPTIONS preflight in `middleware.ts` before Clerk auth runs.

**Rationale:** Matches the approach documented in `docs/mobile/02-backend-changes.md` §3. `Access-Control-Allow-Origin: *` is acceptable because mobile routes use Bearer tokens (not cookies) for auth, and CORS is only needed for WebView scenarios.

### D6: Backward Compatibility — `min-app-version` + Deprecation Window

**Decision:** Implement `GET /api/mobile/meta/min-app-version` as a public endpoint (no auth). Backed by env vars (`MOBILE_MIN_IOS`, `MOBILE_MIN_ANDROID`, `MOBILE_LATEST_IOS`, `MOBILE_LATEST_ANDROID`, `MOBILE_FORCE_UPGRADE`). The mobile app calls this on launch and blocks if the running version is below `min*`.

For field-level changes: add new fields alongside old ones, annotate old fields with `@deprecated` in TypeScript types, wait 2 release cycles, then remove the old field and bump `min*` versions.

**Rationale:** This is the industry-standard approach (Uber, Airbnb, Stripe mobile SDKs). It gives a simple, non-intrusive escape hatch — bump `min*` to force old clients to upgrade before they hit breaking changes.

## Risks / Trade-offs

**[Risk] Service layer adds a call-stack layer** → Acceptable trade-off. Each service function is a straightforward extraction of existing inline code. No abstraction overhead, no generics gymnastics. The debugging cost of one extra function call is far lower than the cost of fixing bugs in two places.

\*\*[Risk] Migrating ~90 mobile routes to new envelope is high-effort] → Mitigated by doing it incrementally. Start with new routes using `mobileSuccess`/`mobileError`. Migrate existing routes domain-by-domain over multiple PRs. The mobile app should already handle both shapes during the transition (parse `data` if present, fall back to raw response).

**[Risk] Mobile app must be updated to parse the new envelope** → Mitigated by versioning. The first app release to use the new envelope ships with the parser. The `min-app-version` gate ensures no old-envelope client hits new-envelope routes.

**[Risk] CORS `Allow-Origin: *` is permissive** → Acceptable because all sensitive mobile routes require Bearer auth. No cookie-bearing endpoints exist under `/api/mobile/*`. If cookies are ever needed, switch to an explicit origin allowlist.

**[Risk] Env vars for version gating are static per deployment** → Acceptable for current scale. If dynamic version gating is needed later, move to a config record in MongoDB. But env vars are simpler and align with the project's pattern (`lib/env.ts`).

## Migration Plan

1. **Phase 1 — Foundation (non-breaking):** Create `lib/api-mobile-utils.ts`, `types/mobile-api.ts`, and the first 3 service modules (batch, course, category). Add CORS config. Add `min-app-version` endpoint. No existing routes change yet.

2. **Phase 2 — Adopt in new routes:** All new `/api/mobile/*` routes must use `mobileSuccess`/`mobileError` and service-layer functions.

3. **Phase 3 — Migrate existing routes:** Domain by domain, update existing mobile routes to use envelope helpers and service functions. Each domain is one PR.

4. **Phase 4 — Enforce:** Add a lint rule or PR review checklist item: "Mobile routes must not use raw `NextResponse.json` or inline Prisma queries for operations covered by a service function."

**Rollback:** Since web routes are untouched, rollback is git-revert of the mobile-specific changes. The `min-app-version` endpoint is additive and safe to remove.

## Open Questions

- **Q1:** Should the mobile app send an `Accept-Version` header to opt into specific API versions, or is the server-dictated `X-API-Version` header sufficient for now? (Recommendation: server-dictated is sufficient for Phase 1.)
- **Q2:** How many service modules should Phase 1 cover — just the top 3 most-duplicated domains, or all 7? (Recommendation: start with batch, course, category — highest duplication and usage.)
