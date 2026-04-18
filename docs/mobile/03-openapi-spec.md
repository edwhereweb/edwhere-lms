# 03 — OpenAPI / Swagger Plan

We need a machine-readable, browsable description of the v1 API. This doc lays out the approach, tooling, and where the spec lives.

## 1. Why OpenAPI is non-negotiable

- The mobile team needs a single source of truth for request/response shapes. Hand-written docs will drift.
- A typed mobile client (TypeScript fetch wrapper) can be **generated** from the spec — saves time and removes a class of bugs.
- The spec doubles as the contract for testing (request/response validation, contract tests).
- Future Phase 2 (teacher app) and any other consumers (partners, internal tools) reuse it.

## 2. Standard

- **OpenAPI 3.1** (recommended) or 3.0.x if any tool we want to use lacks 3.1 support.
- JSON or YAML — pick **YAML** for readability in PRs.
- Single document at `app/api/openapi.yaml` (or generated at build time — see § 4).

## 3. What gets documented

Every `/api/v1/*` endpoint listed in [02-backend-changes.md § 1](./02-backend-changes.md#v1-endpoint-inventory-student-only). Concretely:

- Path, method, operation id (e.g. `getCourseDetail`).
- Path / query / header parameters with types, examples, and constraints.
- Request body schema (refer to a `components.schemas.<Name>` block).
- Response shapes for all relevant status codes (200/201/400/401/403/404/409/422/429/500).
- Auth scheme: `bearerAuth` (JWT, Clerk-issued). Mark each operation as `security: [{ bearerAuth: [] }]` unless explicitly public.
- Tags for grouping in Swagger UI: `Meta`, `Profile`, `Catalog`, `MyCourses`, `Player`, `Quiz`, `Project`, `Chat`, `Payment`.
- Common error envelope schema (`ApiError`) and success envelope (`ApiOk<T>` via `oneOf` / `allOf` patterns).

We do **not** document `/api/*` (the existing web routes) in v1 of the spec. Only `/api/v1/*` and `/api/files/*` (because mobile reads files).

## 4. Source-of-truth: hand-written vs generated

Three viable approaches; pick one and commit:

### Option A — Hand-written YAML (recommended for v1)

- File: `app/api/openapi.yaml`, or split into `openapi/openapi.yaml` + `openapi/paths/*.yaml` + `openapi/components/*.yaml` if it grows.
- Pros: simple, readable, no build step, no library lock-in.
- Cons: easy to drift from code; requires PR discipline to keep in sync.
- Mitigation: add a CI check that runs the smoke-test script (§ 7) which validates real responses against the spec via a runtime validator (e.g. `openapi-backend` or `express-openapi-validator`). For Next.js, a custom Vitest/Jest harness is sufficient.

### Option B — Derive from Zod schemas

- Use `zod-to-openapi` or `@asteasolutions/zod-to-openapi`. Most of our request bodies are already Zod (in `lib/validations.ts`), so we can extract them into the OpenAPI components.
- Pros: request schema is single-sourced; never drifts.
- Cons: response schemas still need to be defined (Zod for responses isn't currently used). Decorating response shapes with Zod doubles the schema work.
- Mitigation: add response Zod schemas in `lib/validations.ts` under a clear naming convention (`courseListResponseSchema`).

### Option C — Generate from code via decorators

- `tsoa`, `tspec`, or similar. Tagged source files annotate handlers; spec is generated at build time.
- Pros: fully automated.
- Cons: invasive, requires re-platforming routes, and not idiomatic to Next.js App Router.
- Verdict: **rejected** for this codebase.

### Recommendation

Start with **Option A** for v1 (fastest to ship, easiest to review). Convert request bodies to Option B (Zod-derived) opportunistically as we touch each route. Response shapes stay hand-written until/unless we have a specific reason to invest.

## 5. Where the spec lives & how it's served

- File on disk: `openapi/openapi.yaml` at the repo root (or under `app/api/openapi.yaml` if we'd rather keep it next to the routes).
- Served at runtime:
  - `GET /api/openapi.yaml` and `GET /api/openapi.json` — simple Next.js route handlers that read and return the file. Public; no auth.
  - `GET /docs` — Swagger UI. Use `swagger-ui-react` or embed via CDN (a single `app/docs/page.tsx` that loads Swagger UI pointing at `/api/openapi.yaml`).
- Authentication for the docs UI:
  - **Internal-only access.** Either ship behind a Clerk auth gate (only `ADMIN` or `TEACHER` can see) or restrict via a basic-auth env-var pair, or mount only in non-prod. **Decision pending — see [open question Q3](./05-open-questions.md#q3-should-the-swagger-ui-be-publicly-accessible).**
- Add `/api/openapi.(json|yaml)` and `/docs` to the `isPublicRoute` matcher (or guard them — depending on the decision above).

## 6. Suggested file structure (Option A)

```
openapi/
├── openapi.yaml              entry point
├── paths/
│   ├── meta.yaml
│   ├── profile.yaml
│   ├── catalog.yaml
│   ├── my-courses.yaml
│   ├── player.yaml
│   ├── quiz.yaml
│   ├── project.yaml
│   ├── chat.yaml
│   └── payment.yaml
└── components/
    ├── schemas.yaml          Course, Chapter, Module, Quiz, Question, Purchase, ...
    ├── responses.yaml        ApiOk, ApiError, common error responses
    └── parameters.yaml       cursor, limit, courseId, chapterId
```

Use `$ref` to compose. CI bundles to a single `openapi.bundle.yaml` via `redocly bundle` or `swagger-cli bundle` for serving — keeps source readable while serving a single artefact.

## 7. CI / contract testing

To prevent drift between code and spec:

- A new `scripts/openapi-smoke.ts` that:
  1. Boots the Next.js app in test mode (or hits a deployed staging URL).
  2. For each operation in the spec, calls the endpoint with a representative payload (or a recorded fixture).
  3. Validates the response against the spec using `@apidevtools/swagger-parser` + `ajv` (or `openapi-response-validator`).
- Run this in CI (`.github/workflows/ci.yml`) on every PR.
- For requests requiring auth, use a long-lived Clerk test-account token stored as a CI secret.

This gives us a cheap regression net against accidental shape changes.

## 8. Mobile client generation

Once the spec is in place, generate a TypeScript SDK for the mobile app:

- **Tool**: `openapi-typescript` (types only) or `openapi-typescript-codegen` (full client). Recommend `openapi-typescript` + a thin hand-written fetch wrapper (e.g. `kyHooks` or our own `apiClient.ts` in the RN repo) for control.
- Output: `<rn-repo>/src/api/types.ts` and `<rn-repo>/src/api/client.ts`.
- Regenerate on every spec change in CI; fail the mobile PR if the checked-in file is out of date.

We get end-to-end type safety: spec → server response → mobile types → React Query cache → UI.

## 9. Schema conventions

To keep the spec coherent:

- Use `string` with `format: object-id` for Mongo ObjectIds (with a description, since OpenAPI doesn't formally know it).
- Dates as `string` `format: date-time` (ISO 8601). Server should always serialise via the same helper.
- `null` is allowed via `nullable: true` (OAS 3.0) or by `type: [string, "null"]` (OAS 3.1).
- Enums: define once in `components.schemas` and `$ref` everywhere (e.g. `MemberRole`, `ContentType`, `ProjectStatus`).
- Pagination: a single `components.schemas.PageMeta` reused everywhere.
- Errors: a single `components.schemas.ApiError` and a constant set of codes documented in `components.schemas.ErrorCode` (`enum`).

## 10. Versioning the spec

- The `info.version` field tracks the spec version (`1.0.0`, `1.1.0`, ...).
- **Additive changes** (new fields, new endpoints) bump the minor version.
- **Breaking changes** require a new path prefix (`/api/v2/...`) and a parallel spec, never overwriting v1.
- Mobile apps in the wild target a specific spec version; our `min-app-version` mechanism (see [02 § 10](./02-backend-changes.md#10-app-version-gating)) lets us force-upgrade clients tied to a deprecated version.

## 11. Examples & try-it-out

Swagger UI's "Try it out" is great for debugging. Make sure to include:

- `examples` blocks on every request body and response.
- A `securitySchemes.bearerAuth` setup so users can paste their Clerk token.
- A clear note in the docs page README that this is internal/staff use only and any test traffic hits real systems.

## 12. Deliverables checklist

- [ ] `openapi/openapi.yaml` (and split files under `paths/` and `components/`).
- [ ] `GET /api/openapi.yaml` and `GET /api/openapi.json` route handlers.
- [ ] `app/docs/page.tsx` with Swagger UI.
- [ ] Auth/visibility decision for `/docs` resolved.
- [ ] CI step running the contract validator.
- [ ] `openapi-typescript` generation wired in the mobile repo.
- [ ] An example `apiClient.ts` in the mobile repo demonstrating Bearer token + envelope unwrap.
- [ ] Update `AGENTS.md` to require: "if you add or change a `/api/v1/*` endpoint, update `openapi/...` in the same PR".
