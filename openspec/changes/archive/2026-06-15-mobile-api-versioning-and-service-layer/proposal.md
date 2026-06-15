## Why

The project now serves three clients — the LMS web dashboard, the admin/teacher mobile app, and the student mobile app — each with its own API surface (`/api/*`, `/api/mobile/admin/*`, `/api/mobile/*`). Business logic is duplicated across these surfaces rather than shared, meaning bug fixes and feature changes must be applied in multiple places and are prone to drift. Additionally, there is no API versioning, no backward-compatibility mechanism, and no standardised response envelope for mobile clients. Since mobile apps cannot be force-updated instantly (users stay on old versions for weeks), any breaking API change risks crashing deployed apps with no recovery path.

## What Changes

- **Extract a service layer** (`lib/services/`) that encapsulates business logic (queries, authorization, mutations) currently duplicated across web and mobile route handlers. Both surfaces become thin wrappers calling shared services.
- **Introduce a mobile response envelope** via `lib/api-mobile-utils.ts` with `mobileSuccess(data, meta?)` and `mobileError(code, message, status, details?)` helpers. All `/api/mobile/*` routes adopt this consistent `{ data, meta }` / `{ error: { code, message, details } }` contract.
- **Add API version signaling** — responses include an `X-API-Version` header; mobile routes are grouped under a logical version so future breaking changes can be introduced as v2 while v1 remains stable.
- **Implement `GET /api/mobile/meta/min-app-version`** — a public endpoint returning minimum and latest app versions per platform plus a `forceUpgrade` flag. The mobile app checks this on launch and blocks outdated clients from hitting endpoints they can't understand.
- **Standardise mobile auth patterns** — replace inline `db.profile.findUnique` + manual role checks in mobile admin routes with existing helpers (`isTeacher()`, `isMarketer()`, `currentProfile()`).
- **Add CORS headers** for `/api/mobile/*` in `next.config.js` to support WebView and Swagger UI scenarios.
- **Define mobile response types** in `types/mobile-api.ts` for type-safe contracts between server and app, with a deprecation annotation convention for field removal.

## Capabilities

### New Capabilities

- `service-layer`: Shared service modules in `lib/services/` that encapsulate business logic (CRUD, authorization, queries) for domains currently duplicated across web and mobile route handlers (batches, courses, categories, blogs, asset-library, leads, payments).
- `mobile-api-envelope`: Standardised response envelope (`{ data, meta }` / `{ error }`) and version-aware helpers for all `/api/mobile/*` routes, including `lib/api-mobile-utils.ts` and `types/mobile-api.ts`.
- `mobile-app-version-gating`: `GET /api/mobile/meta/min-app-version` endpoint, env var wiring, and the backward-compatibility contract that lets the server force-upgrade outdated mobile clients.
- `mobile-cors`: CORS configuration scoped to `/api/mobile/*` in `next.config.js` and OPTIONS preflight handling in middleware.
- `mobile-auth-standardisation`: Migration of all mobile admin/student routes to use shared auth helpers (`isTeacher`, `isMarketer`, `currentProfile`) instead of inline role checks.

### Modified Capabilities

_(none — no existing specs to modify)_

## Impact

- **Route handlers** — Every existing `/api/mobile/**` route file (~90 files) will be modified to use the new envelope helpers and standardised auth. Web `/api/*` routes are untouched initially but will gradually migrate to service-layer calls.
- **New files** — `lib/api-mobile-utils.ts`, `lib/services/*.ts` (5–7 service modules), `types/mobile-api.ts`, `app/api/mobile/meta/min-app-version/route.ts`.
- **Config changes** — `next.config.js` (CORS headers), `middleware.ts` (OPTIONS preflight + public route for min-app-version), `lib/env.ts` + `.env.example` + CI workflow (new env vars for version pins).
- **Dependencies** — None new; leverages existing Prisma, Clerk, Zod, and Next.js APIs.
- **Mobile app** — Must adopt the new response envelope parsing, add startup version check against `min-app-version`, and send `X-App-Version` header on requests.
