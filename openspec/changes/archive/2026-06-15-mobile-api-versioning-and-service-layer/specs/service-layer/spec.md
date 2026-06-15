## ADDED Requirements

### Requirement: Service modules encapsulate domain business logic

The system SHALL provide service modules in `lib/services/<domain>.ts` that encapsulate business logic (queries, mutations, authorization scoping) for domains currently duplicated across web and mobile route handlers. Each service module SHALL export plain async functions that accept explicit parameters (userId, role, validated data) and return domain objects or throw errors. Service functions SHALL NOT read auth context or parse HTTP requests — that remains the route handler's responsibility.

#### Scenario: Batch service replaces inline batch queries

- **WHEN** a route handler needs to list batches for a user
- **THEN** it SHALL call `listBatches(userId, role)` from `lib/services/batch-service.ts` instead of inlining a `db.batch.findMany` query

#### Scenario: Course service replaces inline course queries

- **WHEN** a route handler needs to list courses scoped by ownership
- **THEN** it SHALL call `listCourses(userId, role)` from `lib/services/course-service.ts` which applies the admin-sees-all vs teacher-sees-own scoping logic in one place

#### Scenario: Service function used by both web and mobile routes

- **WHEN** the same business operation exists in both `/api/teacher/offline-batches` and `/api/mobile/admin/batches`
- **THEN** both route handlers SHALL call the same service function, differing only in response formatting

### Requirement: Service modules cover the most-duplicated domains

The system SHALL provide service modules for at least these domains in Phase 1: `batch-service`, `course-service`, `category-service`. Additional modules (`blog-service`, `asset-service`, `lead-service`, `payment-service`) SHALL be added as those domains are migrated.

#### Scenario: Phase 1 service modules exist

- **WHEN** the Phase 1 implementation is complete
- **THEN** the files `lib/services/batch-service.ts`, `lib/services/course-service.ts`, and `lib/services/category-service.ts` SHALL exist and export functions covering the CRUD operations currently duplicated in web and mobile route handlers

### Requirement: Service functions are pure and testable

Each service function SHALL accept all required data as explicit parameters. No service function SHALL call `auth()` from Clerk or read from `req` / `NextResponse`. Service functions SHALL return plain objects (not HTTP responses) and throw typed errors for failure cases that the route handler catches and translates to the appropriate HTTP response.

#### Scenario: Service function signature

- **WHEN** a developer creates or modifies a service function
- **THEN** the function signature SHALL include only domain parameters (e.g., `userId: string`, `role: string`, `data: CreateBatchInput`) and SHALL NOT include `Request`, `NextResponse`, or Clerk types

#### Scenario: Service function error handling

- **WHEN** a service function encounters a not-found or forbidden condition
- **THEN** it SHALL throw a descriptive error (e.g., `new Error('Batch not found')`) that the route handler catches and maps to `mobileError('NOT_FOUND', ...)` or `apiError('Not found', 404)`
