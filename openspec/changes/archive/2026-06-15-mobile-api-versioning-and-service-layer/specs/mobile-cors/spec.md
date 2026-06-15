## ADDED Requirements

### Requirement: CORS headers on mobile API responses

The system SHALL add CORS headers to all responses from `/api/mobile/*` routes via `next.config.js` `headers()`. The headers SHALL include `Access-Control-Allow-Origin: *`, `Access-Control-Allow-Methods: GET,POST,PUT,PATCH,DELETE,OPTIONS`, `Access-Control-Allow-Headers: Content-Type, Authorization, X-App-Version`, and `Access-Control-Max-Age: 86400`.

#### Scenario: Mobile API response includes CORS headers

- **WHEN** a client makes any request to a `/api/mobile/*` endpoint
- **THEN** the response SHALL include `Access-Control-Allow-Origin: *` and the other CORS headers

#### Scenario: CORS does not apply to web API routes

- **WHEN** a client makes a request to a `/api/courses/*` or other non-mobile endpoint
- **THEN** the response SHALL NOT include the mobile CORS headers

### Requirement: OPTIONS preflight handling for mobile routes

The `middleware.ts` SHALL handle `OPTIONS` preflight requests to `/api/mobile/*` by returning HTTP 204 with the CORS headers before Clerk auth runs. This prevents preflight requests from being rejected by `auth.protect()`.

#### Scenario: Preflight request succeeds

- **WHEN** a browser or WebView sends an OPTIONS request to `/api/mobile/admin/courses`
- **THEN** the response SHALL be HTTP 204 with CORS headers and no body, without triggering Clerk authentication

#### Scenario: Non-OPTIONS requests are unaffected

- **WHEN** a GET or POST request is sent to `/api/mobile/*`
- **THEN** the request SHALL proceed through normal Clerk authentication and route handling (CORS headers are added by `next.config.js`, not middleware)
