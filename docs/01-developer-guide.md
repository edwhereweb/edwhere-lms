# 01 — Developer Guide

Everything you need to get the app running on your machine and to work in the inner loop confidently.

## 1. Prerequisites

- **Node.js** — version pinned in `.nvmrc`. Run `nvm use` from the repo root if you have nvm.
- **npm** — comes with Node. The lockfile is `package-lock.json`; do **not** introduce yarn/pnpm.
- **MongoDB** — either a free cluster on [MongoDB Atlas](https://www.mongodb.com/atlas) (recommended; the schema is configured for `provider = "mongodb"`) or a local MongoDB replica set. Standalone mongod will not work because Prisma needs replica-set semantics for transactions.
- Accounts with the following SaaS providers (free tiers are enough for dev):
  - **Clerk** (auth)
  - **Cloudflare R2** (file storage)
  - **Mux** (video)
  - **Razorpay** (test mode for payments)

## 2. First-time setup

```bash
git clone <repo>
cd edwhere-lms
nvm use            # reads .nvmrc
npm install        # runs `prisma generate` via postinstall

cp .env.example .env
# fill in .env — see § 3 below
```

Then push the schema to MongoDB and seed categories:

```bash
npx prisma db push          # creates collections + indexes
node scripts/seed.cjs       # seeds default categories (CommonJS, runnable via plain node)
# OR, if you prefer the TS variant:
npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/seed-categories.ts
```

You're now ready to run the app:

```bash
npm run dev          # http://localhost:3000
```

The first time you sign up via Clerk, the app will lazily create a `Profile` row (see `actions/get-safe-profile.ts`). The first profile you create will have role `STUDENT`. To promote yourself to `ADMIN` for development, edit the role directly in MongoDB:

```js
// in MongoDB Atlas Compass or `mongosh`
db.Profile.updateOne({ email: 'you@example.com' }, { $set: { role: 'ADMIN' } });
```

## 3. Environment variables

The app validates env vars at startup via `lib/env.ts` (Zod). If anything is missing or invalid, the app refuses to boot with a clear error.

| Var                                   | Used by             | Notes                                                               |
| ------------------------------------- | ------------------- | ------------------------------------------------------------------- |
| `DATABASE_URL`                        | Prisma              | MongoDB connection string. Must point to a replica set.             |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`   | Clerk (browser)     | From Clerk dashboard → API Keys.                                    |
| `CLERK_SECRET_KEY`                    | Clerk (server)      | From Clerk dashboard → API Keys.                                    |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL`       | Clerk routing       | Should be `/sign-in`.                                               |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL`       | Clerk routing       | Should be `/sign-up`.                                               |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | Clerk routing       | Where users land after sign-in.                                     |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | Clerk routing       | Where users land after sign-up.                                     |
| `R2_ACCOUNT_ID`                       | R2 / S3 client      | Cloudflare account ID.                                              |
| `R2_ACCESS_KEY_ID`                    | R2 / S3 client      | R2 API token.                                                       |
| `R2_SECRET_ACCESS_KEY`                | R2 / S3 client      | R2 API token secret.                                                |
| `R2_BUCKET_NAME`                      | R2 / S3 client      | Single bucket name; CORS must allow your dev origin (PUT/GET/HEAD). |
| `MUX_TOKEN_ID`                        | Mux                 | From Mux dashboard → Settings → Access Tokens.                      |
| `MUX_TOKEN_SECRET`                    | Mux                 | Same as above.                                                      |
| `RAZORPAY_KEY_ID`                     | Razorpay (server)   | Use `rzp_test_*` for development.                                   |
| `RAZORPAY_KEY_SECRET`                 | Razorpay (server)   | Test mode secret.                                                   |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID`         | Razorpay (browser)  | Same as `RAZORPAY_KEY_ID`, exposed to the browser.                  |
| `NEXT_PUBLIC_APP_URL`                 | Metadata, callbacks | `http://localhost:3000` for dev.                                    |
| `NODE_ENV`                            | Standard            | `development` locally.                                              |
| `ENABLE_DEBUG_LOGS`                   | `lib/debug.ts`      | `"true"` to see `debug(tag, ...)` output in dev.                    |

> **Adding a new env var?** Per `AGENTS.md`, you must update **three** places:
>
> 1. `lib/env.ts` (Zod schema)
> 2. `.env.example`
> 3. `.github/workflows/ci.yml` (so CI doesn't break)

### Cloudflare R2 — extra setup

Your R2 API token must have **Object Read**, **Object Write**, and **Object Delete** on the bucket. Add a CORS policy on the bucket allowing your origin:

```json
[
  {
    "AllowedOrigins": ["http://localhost:3000", "https://your-prod-domain"],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedHeaders": ["Content-Type"],
    "MaxAgeSeconds": 3600
  }
]
```

Without this, browser uploads via presigned PUT will fail with CORS errors. See [R2-IMPLEMENTATION.md](./R2-IMPLEMENTATION.md) for the full picture.

## 4. The npm scripts

```bash
npm run dev          # next dev — local HTTP server with HMR
npm run build        # next build — full production build
npm run start        # next start — runs the prod build
npm run lint         # next lint (ESLint + next/core-web-vitals)
npm run lint:fix     # auto-fix lint issues
npm run format       # prettier --write .
npm run format:check # prettier --check .
npm run prepare      # husky setup (runs automatically on install)
```

Husky runs `lint-staged` on commit:

- `*.{ts,tsx}` → `prettier --write` then `eslint --fix`
- `*.{json,css,md}` → `prettier --write`

## 5. Type checking

There is no dedicated `npm run typecheck`. The TypeScript check runs as part of `npm run build` (Next.js typechecks during build), and incrementally in the editor via the TS server. To run a one-off typecheck without building:

```bash
npx tsc --noEmit
```

## 6. Tests

There is currently **no automated test suite** in this codebase — no Jest, no Vitest, no Playwright config. All verification is manual or via type/lint checks. If you add tests, document the framework here.

## 7. Database management

```bash
npx prisma db push           # apply schema changes (no migration files in MongoDB mode)
npx prisma studio            # open the Prisma data browser at http://localhost:5555
npx prisma generate          # regenerate the Prisma client (rerun after schema edits)
npx prisma migrate reset     # ⚠️ wipes everything; on Mongo it sometimes errors but still resets
```

> **MongoDB note:** Because the datasource is `mongodb`, there are no migration files. `db push` is the canonical way to converge the schema. `prisma migrate reset` may report a permissions error against MongoDB Atlas but typically still drops + recreates collections.

After a reset, re-seed:

```bash
node scripts/seed.cjs
node scripts/seed-blogs.js   # optional: sample blog posts
```

Other one-off scripts in `scripts/`:

- `backfill-messages.js` — one-shot data migration utility for `CourseMessage`.
- `clear-chat-reads.js`, `clear-messages.js` — dev cleanup helpers.

## 8. Linting & formatting

- ESLint config: `.eslintrc.json` extends `next/core-web-vitals`, `next/typescript`, `prettier`. Custom rules:
  - `@typescript-eslint/no-unused-vars` is `warn`, with `_`-prefixed names ignored. Prefix throwaways with `_`.
  - `@typescript-eslint/no-empty-object-type` is `off`.
- Prettier config: `.prettierrc` — single quotes, no trailing commas, 100-char width, 2-space indent.
- Pre-commit: `.husky/pre-commit` runs `npx lint-staged`.

If a commit is being rejected by the hook, run `npm run lint:fix && npm run format` and try again.

## 9. Debugging

There are three layers:

### 9.1 `debug(tag, ...args)` — gated logs

Use `debug` from `lib/debug.ts` instead of `console.log`. It only emits when `ENABLE_DEBUG_LOGS=true`, so production stays clean.

```ts
import { debug } from '@/lib/debug';
debug('CHECKOUT', 'order created', order.id);
```

`logError(tag, error)` is the companion for unconditional error logs (used inside `handleApiError` in `lib/api-utils.ts`).

### 9.2 Browser DevTools

- The Network tab is your friend for tracing client-issued mutations to `/api/...`.
- React DevTools work normally for client components.
- For server components, the only debugging surface is the terminal where `next dev` is running.

### 9.3 Common patterns

- **Auth not working?** Check that the `Profile` row exists for your Clerk userId. `actions/get-safe-profile.ts` lazily creates it; if `auth()` returns `userId` but no Profile exists yet, server components may render unexpected fallbacks.
- **API returning 401/403?** Re-read `app/api/.../route.ts`. Almost every handler does `auth()` → role check → validation in that order. Use the per-route tag in the error log to find which.
- **R2 upload failing?** First check the browser network tab — the `PUT` to R2 is a separate request. CORS errors here mean your bucket CORS isn't set right. See [R2-IMPLEMENTATION.md](./R2-IMPLEMENTATION.md).
- **Razorpay webhook?** There isn't one — verification is done client-driven via `/api/razorpay/verify`. Use Razorpay test mode card `4111 1111 1111 1111` with any CVV/expiry.
- **Mux video stuck on "processing"?** Open `/api/admin/asset-library/mux-upload/<uploadId>` directly in your browser to see the current status from Mux.

## 10. Local conveniences

- The app uses `dynamic = 'force-dynamic'` aggressively (e.g. `app/(dashboard)/layout.tsx`, `app/api/courses/route.ts`) to disable Next.js static optimisation for authenticated paths. Don't be surprised that there's no static caching of dashboard pages.
- `/api/health` returns `{ status: 'healthy' }` if MongoDB is reachable. Useful as a smoke test.
- `app/icon.png`, `public/edwhere-logo.png` — branding assets. Replace, don't add new ones.

## 11. Build / production caveats

- `next build` will fail if any required env var (per `lib/env.ts`) is missing.
- 3rd-party SDK clients (Mux, Razorpay, R2) are lazy-instantiated by design — adding any new SDK should follow the same pattern (see `lib/razorpay.ts`, `lib/r2.ts`). **Never** instantiate at module top-level.
- The TS build is `incremental: true`. The committed `tsconfig.tsbuildinfo` should normally be `.gitignore`d but currently isn't — don't worry about it.

## 12. Conventions you'll be expected to follow

These are enforced by `AGENTS.md` (read it before opening a PR):

- **No raw `console.log`** in committed code. Use `debug` / `logError`.
- **No `any`.** Use `unknown` and narrow.
- **No inline Zod schemas** in route files. All schemas live in `lib/validations.ts`.
- **No new `PrismaClient`.** Always import `db` from `lib/db.ts`.
- **No top-level 3rd-party SDK instantiation.** Lazy via getter.
- **kebab-case** filenames; `PascalCase` named exports.
- **Don't edit `components/ui/`** — those are shadcn/ui generated.
- **Don't add Dockerfiles, CI/CD configs, or new abstractions** unless explicitly requested.

## 13. Useful URLs locally

| Path                           | What it shows                                        |
| ------------------------------ | ---------------------------------------------------- |
| `/`                            | Landing page (currently routes via dashboard layout) |
| `/courses`                     | Public course catalog                                |
| `/blog`                        | Public blog index                                    |
| `/sign-in`, `/sign-up`         | Clerk auth pages                                     |
| `/dashboard`                   | Logged-in student dashboard                          |
| `/teacher/courses`             | Teacher mode landing                                 |
| `/teacher/analytics`           | Revenue chart                                        |
| `/teacher/users`               | Admin: manage roles                                  |
| `/teacher/pending-approvals`   | Admin: approve teacher-submitted courses             |
| `/teacher/asset-library`       | Reusable chapter content (admin/teacher)             |
| `/marketer`, `/marketer/blogs` | Marketer dashboards                                  |
| `/blogger/blogs`               | Blogger dashboard                                    |
| `/courses/<id>/start`          | Redirects to first published chapter                 |
| `/courses/<id>/chapters/<id>`  | Chapter player                                       |
| `/api/health`                  | Smoke test                                           |
