## ADDED Requirements

### Requirement: Mobile admin routes use shared auth helpers for role checks

All `/api/mobile/admin/*` route handlers SHALL use `isTeacher()` from `lib/teacher.ts` or `isMarketer()` from `lib/marketer.ts` for role-based authorization. Inline patterns such as `const profile = await db.profile.findUnique({ where: { userId } }); if (profile.role !== 'ADMIN' && profile.role !== 'TEACHER')` SHALL be replaced with the shared helper calls.

#### Scenario: Batch route uses isTeacher

- **WHEN** `GET /api/mobile/admin/batches` checks authorization
- **THEN** the route handler SHALL call `isTeacher()` and return `mobileError('FORBIDDEN', 'Forbidden', 403)` if it returns false, instead of inlining a `db.profile.findUnique` query with manual role comparison

#### Scenario: Category admin route uses isTeacher

- **WHEN** `GET /api/mobile/admin/categories` checks authorization
- **THEN** the route handler SHALL call `isTeacher()` instead of inline `db.profile.findUnique` + role check

#### Scenario: Lead routes use isMarketer

- **WHEN** a `/api/mobile/admin/leads/*` route checks authorization
- **THEN** the route handler SHALL call `isMarketer()` for marketer-level access or `isTeacher()` for teacher-level access, consistent with how the corresponding web routes authorize

### Requirement: Profile data accessed via currentProfile when needed

When a mobile admin route handler needs the profile object (e.g., to read `profile.id` or `profile.role` for query scoping), it SHALL use `currentProfile()` from `lib/current-profile.ts` instead of a separate `db.profile.findUnique` call. This avoids redundant database queries since `isTeacher()` and `isMarketer()` already call `currentProfile()` internally.

#### Scenario: Route needs profile for scoping and auth

- **WHEN** a route handler needs both the role check and the profile object (e.g., to scope queries by `profile.id`)
- **THEN** it SHALL call `currentProfile()` once and use the returned profile for both the role check and the query scoping, rather than calling `isTeacher()` then `db.profile.findUnique` separately

### Requirement: Consistent auth pattern across all mobile routes

Every `/api/mobile/*` route handler (admin and student) SHALL follow this auth sequence:

1. `const { userId } = await auth()` — Clerk session check
2. `if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401)` — reject unauthenticated
3. Role check via `isTeacher()`, `isMarketer()`, or `currentProfile()` as appropriate — reject unauthorized
4. Business logic

No mobile route SHALL skip step 1 or perform auth checks in a different order.

#### Scenario: Student route follows auth pattern

- **WHEN** `GET /api/mobile/courses` handles a request
- **THEN** the handler SHALL call `auth()` first, check `userId`, then proceed to business logic (no role check needed for student routes — all authenticated users are students)

#### Scenario: Admin route follows auth pattern

- **WHEN** `POST /api/mobile/admin/batches` handles a request
- **THEN** the handler SHALL call `auth()` first, check `userId`, then call `isTeacher()` or the appropriate role helper, then proceed to business logic
