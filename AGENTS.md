# Edwhere LMS — Project Conventions

> This file defines coding standards for AI-assisted development tools (Cursor, GitHub Copilot, Windsurf, etc.) and for human contributors. Follow these conventions for all changes.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript (strict)
- **Database**: MongoDB via Prisma ORM
- **Auth**: Clerk (`@clerk/nextjs`)
- **Payments**: Razorpay (INR currency)
- **Video**: Mux (upload) + YouTube (embed)
- **Uploads**: Cloudflare R2 (S3-compatible, presigned URLs). See [docs/R2-IMPLEMENTATION.md](docs/R2-IMPLEMENTATION.md) for architecture, assumptions, and where to change for new upload types or access rules.
- **UI**: Tailwind CSS + shadcn/ui
- **Forms**: React Hook Form + Zod
- **State**: Zustand (client), React Context (theme)

## Project Structure

```
app/                    # Next.js App Router pages and API routes
  (course)/             # Course consumption layout group
  (dashboard)/          # Dashboard layout group (teacher + student)
  api/
    v1/                 # Versioned API route handlers (standard envelope)
    health/             # Health check (unversioned)
    files/              # Binary file serving (unversioned)
actions/                # Server-side data fetching functions
components/             # Shared React components
  ui/                   # shadcn/ui generated components — do NOT manually edit
  providers/            # Context providers
hooks/                  # Custom React hooks
lib/                    # Utilities, config, and shared logic
prisma/                 # Prisma schema and seed scripts
types/                  # Shared TypeScript type definitions
```

## Code Style

- Formatting: **Prettier** (config in `.prettierrc`) — single quotes, no trailing commas, 100 char print width.
- Linting: **ESLint** (config in `.eslintrc.json`) — extends `next/core-web-vitals`, `next/typescript`, `prettier`.
- Pre-commit: **Husky** + **lint-staged** run formatting and linting on staged files automatically.
- Never use `any`. Use `unknown` and narrow types, or define proper interfaces.
- Prefix intentionally unused variables with `_` (e.g., `_params`, `_event`).
- Use `import type` for type-only imports from Prisma and other libraries.
- Do NOT use raw `console.log` for debugging. Use `debug(tag, ...args)` from `lib/debug.ts` instead — it is gated behind the `ENABLE_DEBUG_LOGS` env var and outputs nothing in production.
- Do not add comments that merely narrate what the code does. Comments should explain _why_, not _what_.

## API Routes

All API route handlers live under `app/api/v1/` and use the standardized response envelope from `lib/api-response.ts`.

### Response envelope

Success: `{ data: T, meta?: PageMeta }` — returned via `apiOk(data, meta?)`.

Error: `{ error: { code: ErrorCode, message: string, details?: unknown } }` — returned via `apiErr(code, message, status, details?)`.

`ErrorCode` values: `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION`, `CONFLICT`, `RATE_LIMITED`, `INTERNAL`.

### Route handler pattern

1. **Auth check** first — `auth()` from Clerk.
2. **Validate request body** — Zod schemas from `lib/validations.ts`, validated via `validateRequest()` from `lib/api-response.ts`.
3. **Return errors** — `apiErr(code, message, status)` from `lib/api-response.ts`.
4. **Catch all** — `handleRouteError(tag, error)` from `lib/api-response.ts`.

```typescript
import { auth } from '@clerk/nextjs/server';
import { apiOk, apiErr, validateRequest, handleRouteError } from '@/lib/api-response';
import { mySchema } from '@/lib/validations';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return apiErr('UNAUTHORIZED', 'Unauthorized', 401);

    const body = await req.json();
    const validation = validateRequest(mySchema, body);
    if (!validation.success) return validation.response;

    // ... business logic ...

    return apiOk(result);
  } catch (error) {
    return handleRouteError('MY_ROUTE', error);
  }
}
```

- Add all new Zod schemas to `lib/validations.ts` — do not define inline schemas in route files.
- Unversioned routes (`/api/health`, `/api/files/...`) are exempt from the envelope — they serve infra checks and binary content.

### Frontend API client

All client-side HTTP calls use the shared `api` instance from `lib/api-client.ts`:

```typescript
import { api } from '@/lib/api-client';

const response = await api.post('/courses', values);
// response.data is the unwrapped entity (interceptor strips the { data } envelope)
```

- `api` is an axios instance with `baseURL: '/api/v1'`.
- The response interceptor unwraps `{ data: T }` so `response.data` gives the entity directly.
- Errors throw `ApiError` with `.code`, `.message`, `.httpStatus`, `.details`.
- Do NOT use raw `axios` for API calls — always use `import { api } from '@/lib/api-client'`.

## Client Components

- Error handling: use `toast.error("Something went wrong")` in generic catch blocks.
- Never swallow errors with `.catch(() => {})` — at minimum show a toast to the user.
- After mutations: call `router.refresh()` to revalidate server data.
- After delete + navigate: call `router.push()` _before_ `router.refresh()`.

## Database

- Always import the Prisma singleton from `lib/db.ts` — never instantiate `PrismaClient` elsewhere.
- Avoid N+1 queries: use `include`, `select`, or batch with `Promise.all`.
- Never instantiate third-party SDK clients (Mux, Razorpay, etc.) at the module top-level — use lazy initialization via a getter function. Top-level instantiation crashes the build when env vars are unavailable.

## Files and Naming

- React components: `kebab-case.tsx` files with `PascalCase` named exports.
- Page-specific components: colocate in a `_components/` subdirectory next to the page.
- Hooks: `use-kebab-case.ts` (e.g., `use-debounce.ts`).
- Lib modules: `kebab-case.ts` in `lib/`.
- Do NOT edit files in `components/ui/` — these are generated by shadcn/ui.

## Environment Variables

- All required env vars are validated at startup via `lib/env.ts` using Zod.
- When adding a new env var: update three places — `lib/env.ts`, `.env.example`, and `.github/workflows/ci.yml`.

## What NOT to Do

- Do not create Dockerfiles, CI/CD configs, or deployment infrastructure unless explicitly asked.
- Do not add rate limiting, caching layers, or abstractions that aren't immediately needed.
- Do not create README or documentation files unless explicitly asked.
- Do not refactor working code purely for style — only fix actual bugs or clear violations.
- Do not over-engineer. Keep things simple. If a pattern is only used once, don't abstract it.
