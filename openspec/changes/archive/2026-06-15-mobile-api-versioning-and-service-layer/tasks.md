## 1. Mobile Response Envelope & Types

- [x] 1.1 Create `types/mobile-api.ts` with `MobileSuccessResponse<T, M>`, `MobileErrorResponse`, and `MobileErrorCode` type definitions
- [x] 1.2 Create `lib/api-mobile-utils.ts` with `mobileSuccess(data, meta?)`, `mobileCreated(data)`, `mobileError(code, message, status, details?)`, `validateMobileBody(schema, data)`, and `handleMobileApiError(tag, error)` — all including `X-API-Version: 1` header
- [x] 1.3 Verify that `mobileSuccess`, `mobileCreated`, and `mobileError` produce the correct envelope shapes (`{ data, meta }` / `{ error: { code, message, details } }`)

## 2. CORS Configuration

- [x] 2.1 Add CORS headers block in `next.config.js` `headers()` scoped to `/api/mobile/:path*` with `Allow-Origin: *`, `Allow-Methods`, `Allow-Headers` (including `X-App-Version`), and `Max-Age: 86400`
- [x] 2.2 Add OPTIONS preflight handler in `middleware.ts` that returns 204 with CORS headers for `/api/mobile/*` requests before Clerk auth runs

## 3. App Version Gating

- [x] 3.1 Add optional env vars (`MOBILE_MIN_IOS`, `MOBILE_MIN_ANDROID`, `MOBILE_LATEST_IOS`, `MOBILE_LATEST_ANDROID`, `MOBILE_FORCE_UPGRADE`) to `lib/env.ts` with `"1.0.0"` / `false` defaults
- [x] 3.2 Add the new env vars to `.env.example` with placeholder values and comments
- [x] 3.3 Add `/api/mobile/meta/(.*)` to the `isPublicRoute` matcher in `middleware.ts`
- [x] 3.4 Create `app/api/mobile/meta/min-app-version/route.ts` with a GET handler returning the version data in the mobile success envelope

## 4. Service Layer — Phase 1 Domains

- [x] 4.1 Create `lib/services/batch-service.ts` — extract `listBatches(userId, role)` and `createBatch(userId, data)` from the inline Prisma queries in `/api/mobile/admin/batches/route.ts` and `/api/teacher/offline-batches/route.ts`
- [x] 4.2 Create `lib/services/course-service.ts` — extract `listCourses(userId, role)` and `createCourse(userId, data)` from the inline queries in `/api/mobile/admin/courses/route.ts` and equivalent web route
- [x] 4.3 Create `lib/services/category-service.ts` — extract `listCategories()` and `createCategory(userId, data)` from the inline queries in `/api/mobile/admin/categories/route.ts` and `/api/categories/route.ts`

## 5. Auth Standardisation — Mobile Admin Routes

- [x] 5.1 Audit all `/api/mobile/admin/*` routes and identify which ones use inline `db.profile.findUnique` + manual role check instead of `isTeacher()` / `isMarketer()`
- [x] 5.2 Replace inline role checks in batch routes (`/api/mobile/admin/batches/*`) with `isTeacher()` or `currentProfile()` calls
- [x] 5.3 Replace inline role checks in category routes (`/api/mobile/admin/categories/*`) with `isTeacher()` or `currentProfile()` calls
- [x] 5.4 Replace inline role checks in remaining mobile admin routes (blogs, leads, payments, asset-library, certificates, landing-pages, users, approvals, etc.) with the appropriate shared auth helpers

## 6. Migrate Mobile Routes to New Envelope

- [x] 6.1 Migrate `/api/mobile/admin/batches/*` routes to use `mobileSuccess` / `mobileError` / `validateMobileBody` / `handleMobileApiError` + service-layer functions
- [x] 6.2 Migrate `/api/mobile/admin/courses/*` routes to use the new envelope + service-layer functions
- [x] 6.3 Migrate `/api/mobile/admin/categories/*` routes to use the new envelope + service-layer functions
- [x] 6.4 Migrate remaining mobile admin routes (`blogs`, `leads`, `payments`, `asset-library`, `certificates`, `approvals`, `landing-pages`, `users`, `dashboard`, `analytics`, `reports`, `profile`, `enrolments`, `mentor-connect`, `project-submissions`, `session-uploads`) to use the new envelope helpers
- [x] 6.5 Migrate mobile student routes (`/api/mobile/courses/*`, `/api/mobile/batches/*`, `/api/mobile/dashboard/*`, `/api/mobile/profile/*`) to use the new envelope helpers

## 7. Verification

- [x] 7.1 Verify all mobile routes return the standardised envelope — no raw `NextResponse.json` or `apiError` calls remain in `/api/mobile/*`
- [x] 7.2 Verify `X-API-Version: 1` header is present on all mobile responses (success and error)
- [x] 7.3 Verify OPTIONS preflight to `/api/mobile/*` returns 204 with CORS headers without auth
- [x] 7.4 Verify `GET /api/mobile/meta/min-app-version` returns correct shape without auth
- [x] 7.5 Verify no inline `db.profile.findUnique` + manual role checks remain in mobile admin routes
