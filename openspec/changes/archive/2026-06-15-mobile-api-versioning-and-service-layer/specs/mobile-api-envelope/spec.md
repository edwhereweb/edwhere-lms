## ADDED Requirements

### Requirement: Standardised success envelope for mobile responses

All `/api/mobile/*` route handlers SHALL return success responses using the envelope `{ data: T, meta: M | null }`. A helper function `mobileSuccess(data, meta?)` in `lib/api-mobile-utils.ts` SHALL produce this response with status 200 and include an `X-API-Version` response header.

#### Scenario: Success response with data only

- **WHEN** a mobile route handler returns a successful response without pagination
- **THEN** the response body SHALL be `{ "data": <payload>, "meta": null }` with HTTP status 200 and header `X-API-Version: 1`

#### Scenario: Success response with pagination metadata

- **WHEN** a mobile route handler returns a paginated collection
- **THEN** the response body SHALL be `{ "data": [<items>], "meta": { "nextCursor": "...", "hasMore": true } }` with HTTP status 200

### Requirement: Standardised created envelope for mobile responses

A helper function `mobileCreated(data)` in `lib/api-mobile-utils.ts` SHALL produce responses with the same `{ data, meta: null }` envelope but HTTP status 201, for use in POST handlers that create resources.

#### Scenario: Created response for new resource

- **WHEN** a mobile route handler successfully creates a resource
- **THEN** the response body SHALL be `{ "data": <created-resource>, "meta": null }` with HTTP status 201 and header `X-API-Version: 1`

### Requirement: Standardised error envelope for mobile responses

All `/api/mobile/*` route handlers SHALL return error responses using the envelope `{ error: { code: string, message: string, details: unknown | null } }`. A helper function `mobileError(code, message, status, details?)` in `lib/api-mobile-utils.ts` SHALL produce this response.

#### Scenario: Validation error response

- **WHEN** a mobile route handler receives an invalid request body
- **THEN** the response body SHALL be `{ "error": { "code": "VALIDATION", "message": "Validation failed", "details": ["field: message", ...] } }` with HTTP status 400

#### Scenario: Unauthorized error response

- **WHEN** a mobile route handler receives a request without valid auth
- **THEN** the response body SHALL be `{ "error": { "code": "UNAUTHORIZED", "message": "Unauthorized", "details": null } }` with HTTP status 401

#### Scenario: Forbidden error response

- **WHEN** an authenticated user lacks the required role
- **THEN** the response body SHALL be `{ "error": { "code": "FORBIDDEN", "message": "Forbidden", "details": null } }` with HTTP status 403

#### Scenario: Not found error response

- **WHEN** the requested resource does not exist
- **THEN** the response body SHALL be `{ "error": { "code": "NOT_FOUND", "message": "...", "details": null } }` with HTTP status 404

#### Scenario: Internal server error response

- **WHEN** an unhandled exception occurs in a mobile route handler
- **THEN** the response body SHALL be `{ "error": { "code": "INTERNAL", "message": "Internal Server Error", "details": null } }` with HTTP status 500

### Requirement: Mobile validation helper wraps Zod with mobile envelope

A helper function `validateMobileBody(schema, data)` in `lib/api-mobile-utils.ts` SHALL validate the request body against a Zod schema and return a `mobileError` response on failure (instead of the web-style `apiError` response from `lib/api-utils.ts`).

#### Scenario: Validation success

- **WHEN** `validateMobileBody` is called with valid data
- **THEN** it SHALL return `{ success: true, data: <parsed> }`

#### Scenario: Validation failure

- **WHEN** `validateMobileBody` is called with invalid data
- **THEN** it SHALL return `{ success: false, response: <mobileError VALIDATION response> }` using the mobile error envelope format

### Requirement: Mobile error handler wraps exceptions with mobile envelope

A helper function `handleMobileApiError(tag, error)` in `lib/api-mobile-utils.ts` SHALL log the error via `logError` and return a `mobileError('INTERNAL', ...)` response, replacing `handleApiError` in mobile route catch blocks.

#### Scenario: Catch block uses mobile error handler

- **WHEN** an exception is caught in a mobile route handler's catch block
- **THEN** the handler SHALL call `handleMobileApiError('ROUTE_TAG', error)` which returns `{ "error": { "code": "INTERNAL", "message": "Internal Server Error", "details": null } }` with HTTP status 500

### Requirement: API version header on all mobile responses

Every response from `/api/mobile/*` routes (both success and error) SHALL include the `X-API-Version` response header. The initial version value SHALL be `"1"`.

#### Scenario: Version header present on success

- **WHEN** a mobile route returns a success response
- **THEN** the response SHALL include header `X-API-Version: 1`

#### Scenario: Version header present on error

- **WHEN** a mobile route returns an error response
- **THEN** the response SHALL include header `X-API-Version: 1`

### Requirement: Mobile response type definitions

The file `types/mobile-api.ts` SHALL export TypeScript interfaces for the mobile response envelope (`MobileSuccessResponse<T, M>`, `MobileErrorResponse`) and the error code union type (`MobileErrorCode`). These types SHALL be used by both the server-side helpers and can be shared with the mobile app codebase.

#### Scenario: Type definitions are importable

- **WHEN** a developer imports from `@/types/mobile-api`
- **THEN** the types `MobileSuccessResponse`, `MobileErrorResponse`, and `MobileErrorCode` SHALL be available

### Requirement: Deprecation annotation convention for mobile response fields

When a field in a mobile API response needs to be removed, the field SHALL first be annotated with `@deprecated` in its TypeScript interface in `types/mobile-api.ts`, including the target removal version. The field SHALL remain present for at least 2 mobile app release cycles before removal. Upon removal, `MOBILE_MIN_*` versions SHALL be bumped to exclude app versions that depend on the removed field.

#### Scenario: Deprecating a response field

- **WHEN** a response field needs to be replaced (e.g., `imageUrl` → `thumbnailUrl`)
- **THEN** the new field SHALL be added alongside the old field, the old field SHALL be marked `@deprecated` with a note like `"Use thumbnailUrl instead. Remove after app v1.3.0"`, and the old field SHALL remain present until `min-app-version` is bumped past the version that introduced the replacement
