## ADDED Requirements

### Requirement: Min-app-version endpoint exists

The system SHALL expose `GET /api/mobile/meta/min-app-version` as a public (no auth required) endpoint that returns the minimum and latest supported app versions per platform and a force-upgrade flag.

#### Scenario: Successful version check

- **WHEN** a client sends `GET /api/mobile/meta/min-app-version`
- **THEN** the response SHALL be HTTP 200 with body `{ "data": { "minIos": "<semver>", "minAndroid": "<semver>", "latestIos": "<semver>", "latestAndroid": "<semver>", "forceUpgrade": <boolean> }, "meta": null }` using the mobile success envelope

#### Scenario: Endpoint is publicly accessible

- **WHEN** a client sends the request without an Authorization header
- **THEN** the endpoint SHALL still return a 200 response (not 401)

### Requirement: Version values are sourced from environment variables

The endpoint SHALL read version values from environment variables: `MOBILE_MIN_IOS`, `MOBILE_MIN_ANDROID`, `MOBILE_LATEST_IOS`, `MOBILE_LATEST_ANDROID`, and `MOBILE_FORCE_UPGRADE`. These SHALL be registered in `lib/env.ts` with sensible defaults (all `"1.0.0"` and `forceUpgrade: false`) so the app deploys without requiring these env vars to be set immediately.

#### Scenario: Env vars are set

- **WHEN** the environment variables are configured (e.g., `MOBILE_MIN_IOS=1.2.0`)
- **THEN** the endpoint SHALL return those configured values

#### Scenario: Env vars are not set

- **WHEN** the environment variables are not configured
- **THEN** the endpoint SHALL return default values (`"1.0.0"` for all versions, `false` for forceUpgrade) without crashing

### Requirement: Public route matcher includes min-app-version

The `middleware.ts` public route matcher SHALL include `/api/mobile/meta/(.*)` so that the min-app-version endpoint does not require Clerk authentication.

#### Scenario: Middleware allows unauthenticated access

- **WHEN** a request is made to `/api/mobile/meta/min-app-version` without a Clerk session
- **THEN** the request SHALL pass through `clerkMiddleware` without triggering `auth.protect()`

### Requirement: Env var registration

The new environment variables SHALL be added to `lib/env.ts` (as optional with defaults), `.env.example` (with placeholder values and comments), and `.github/workflows/ci.yml` (if it exists, with dummy values for build).

#### Scenario: Env validation passes without mobile vars

- **WHEN** the application starts without `MOBILE_MIN_IOS` etc. set
- **THEN** `lib/env.ts` validation SHALL pass because the mobile version vars are optional with defaults
