# 04 — React Native App: Architecture & Execution Flow

This is the mobile-engineer-facing doc: stack choice, project layout, navigation, state management, key screens, and the start-to-finish execution flow.

## 1. Tech stack

| Concern              | Choice                                                                                                        | Why                                                                                    |
| -------------------- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Framework            | **React Native** (Expo, managed workflow)                                                                     | Fastest path to v1; OTA updates via EAS; covers our needs without ejecting.            |
| Language             | TypeScript (strict)                                                                                           | Same as the web codebase; types from the OpenAPI spec.                                 |
| Navigation           | `expo-router` (file-based) or `@react-navigation/native`                                                      | Either works; recommend `expo-router` for consistency with App Router mental model.    |
| Auth                 | `@clerk/clerk-expo`                                                                                           | Official Clerk RN/Expo SDK; integrates with `getToken()` for Bearer.                   |
| Networking           | `fetch` + a thin wrapper (`src/api/client.ts`) wrapping the Bearer + envelope unwrap                          | No need for axios in RN; native fetch + abort controllers is sufficient.               |
| Server state cache   | **TanStack Query (`@tanstack/react-query`)**                                                                  | Industry standard; handles caching, retry, focus refetch, optimistic updates.          |
| Local state          | `zustand` (matches web codebase) for tiny global stores                                                       | Familiar, minimal, no boilerplate.                                                     |
| Forms                | `react-hook-form` + `zod` (`@hookform/resolvers`)                                                             | Same as web; rules in the OpenAPI spec mirror to Zod schemas.                          |
| UI library           | **Native components + a small in-house design system**, OR `tamagui` / `nativewind` for Tailwind-like styling | Decision pending — see [Q4](./05-open-questions.md#q4-mobile-ui-library-choice).       |
| Icons                | `lucide-react-native` (mirrors web)                                                                           | Same icon set as web for visual consistency.                                           |
| Video                | `@mux/mux-player-react-native` (or `react-native-video` + HLS URL)                                            | Mux native player handles HLS, posters, controls.                                      |
| YouTube embed        | `react-native-youtube-iframe`                                                                                 | Wraps the YouTube iframe API.                                                          |
| PDF                  | `react-native-pdf`                                                                                            | Reliable PDF rendering with header support for auth-protected URLs.                    |
| HTML embed           | `react-native-webview` (sandboxed)                                                                            | For `HTML_EMBED` chapters.                                                             |
| Markdown / rich text | `react-native-markdown-display` (or `react-native-render-html`)                                               | For `TEXT` chapters with markdown.                                                     |
| Toast / snackbar     | `react-native-toast-message` or similar                                                                       | Match the toast UX from the web.                                                       |
| Payments             | `react-native-razorpay`                                                                                       | Native Razorpay SDK.                                                                   |
| Storage              | `expo-secure-store` (tokens), `@react-native-async-storage/async-storage` (cache)                             | Secure for tokens, plain async for non-sensitive cache.                                |
| Crash / analytics    | TBD — `Sentry` for crashes; analytics provider not yet decided.                                               | See [open question Q6](./05-open-questions.md#q6-analytics--crash-reporting-provider). |
| Build / OTA          | EAS Build + EAS Update                                                                                        | Standard Expo path; one config, two stores, OTA for hotfixes.                          |

> Recommend Expo (managed) over bare RN unless the team has strong native-module needs we don't currently see.

## 2. Repo layout

The mobile app should live in a **separate repository** (`edwhere-mobile`), not in the same monorepo as the web app. Rationale:

- Different deployment cadence, different CI, different store accounts.
- Clearer ownership.
- The contract between them is the OpenAPI spec, nothing else.

If a monorepo is preferred for any reason, see [Q7](./05-open-questions.md#q7-monorepo-or-separate-repos).

Suggested layout for `edwhere-mobile`:

```
edwhere-mobile/
├── app/                       expo-router screens (file-based routes)
│   ├── _layout.tsx            Root: providers (Clerk, QueryClient, Toast, Theme)
│   ├── (auth)/                Sign-in, sign-up screens
│   ├── (tabs)/                Bottom-tab nav: Home, Catalog, My Courses, Profile
│   ├── courses/[id]/          Course detail
│   │   ├── index.tsx
│   │   ├── chapters/[chapterId].tsx
│   │   └── chat.tsx
│   └── upgrade.tsx            Force-upgrade screen
├── src/
│   ├── api/                   Generated types + client + per-resource hooks
│   │   ├── types.ts           openapi-typescript output (generated)
│   │   ├── client.ts          fetch wrapper, Bearer + envelope unwrap
│   │   ├── queries.ts         React Query hooks (useCourses, useChapter, ...)
│   │   └── mutations.ts       useEnrollMutation, useSubmitQuiz, ...
│   ├── components/            Reusable UI (Button, Card, ChapterIcon, ...)
│   ├── components/players/    Video, YouTube, PDF, HTML, Quiz, Project, Gamified
│   ├── stores/                Zustand stores (small, e.g. theme, app-state)
│   ├── lib/                   utils, formatters
│   └── theme/                 colors, spacing, typography
├── assets/                    Logo, fonts, splash
├── app.config.ts              Expo config
├── eas.json                   Build profiles
└── package.json
```

## 3. Auth wiring

- Wrap the root with `<ClerkProvider tokenCache={...}>` from `@clerk/clerk-expo`.
- Use `expo-secure-store` for the Clerk token cache (the SDK ships a helper for this).
- Sign-in/sign-up screens use Clerk's prebuilt RN components or hand-roll using `useSignIn()` / `useSignUp()` for tighter design control.
- After sign-in, **before the first authenticated API call**, ensure `Profile` is created on the server. The simplest path: call `GET /api/v1/me` immediately after sign-in. The handler uses `currentProfile()` which lazy-creates the Profile if missing — same as web.

### The `apiClient` contract

`src/api/client.ts` exposes a single `request<T>(operationId, args)` function (or, simpler, hand-call helpers). Responsibilities:

- Read the Clerk token via `getToken()` from the `useAuth()` hook (or a non-hook helper Clerk provides).
- Add `Authorization: Bearer <token>`.
- Add `X-App-Version`, `User-Agent`.
- Serialise body as JSON; set `Content-Type: application/json`.
- Parse the response envelope: on 2xx, return `body.data`; on non-2xx, throw an `ApiError` instance carrying `code`, `message`, `details`, `httpStatus`.
- Handle 401 by triggering a Clerk re-auth (sign-out + redirect to sign-in).
- Handle 426 / "force upgrade" responses by routing to the upgrade screen.

Every React Query hook calls into this client.

## 4. Navigation map

Bottom-tab navigation when authenticated:

- **Home** — quick stats, continue-where-you-left-off, recent courses.
- **Catalog** — browse + search + category filter.
- **My Courses** — In Progress / Completed.
- **Profile** — name, image, settings, logout.

Stack navigation per tab; deep navigation flows to:

- `/courses/:id` (catalog detail OR enrolled view depending on purchase status).
- `/courses/:id/chapters/:chapterId` (player).
- `/courses/:id/chat` (mentor connect).
- Modal: payment in progress, upgrade required.

## 5. Screen catalog (Phase 1)

| Screen                        | Notes                                                                                          |
| ----------------------------- | ---------------------------------------------------------------------------------------------- |
| Splash                        | Brand splash; runs version check + auth check; routes to upgrade / sign-in / home.             |
| Sign in                       | Clerk-backed.                                                                                  |
| Sign up                       | Clerk-backed.                                                                                  |
| Forgot password               | Clerk-backed.                                                                                  |
| Home (tab)                    | Continue-where-you-left-off card, suggestions, optional carousel.                              |
| Catalog (tab)                 | Search bar, category filter chips, paginated grid/list of courses.                             |
| Course detail (catalog view)  | Description, image, price, instructors, curriculum (read-only), Enroll CTA OR "Continue".      |
| Course detail (enrolled view) | Curriculum with progress, "Continue" CTA, link to mentor chat.                                 |
| Chapter player                | Renders by `contentType`; mark-complete button; banners for free preview / locked / completed. |
| Mentor chat                   | List + send + last-read; pull-to-refresh + 10–15 s polling while foreground.                   |
| Project submission            | Form for Drive URL, current submission + status / review note.                                 |
| Quiz player                   | Question-by-question UI, save on change, submit, show result + per-question feedback.          |
| Profile (tab)                 | Name, image, sign out.                                                                         |
| Settings                      | Theme toggle, app version, "About", legal links.                                               |
| Upgrade required              | Hard-blocking screen with link to App Store / Play Store.                                      |
| Error / empty states          | Reusable components for "no courses yet", "no internet", "something went wrong".               |

## 6. Theming & visual parity

- Match the web's color tokens. Define them once in `src/theme/colors.ts` mirroring `app/globals.css`.
- Support light + dark mode (`useColorScheme()` from RN).
- Typography: pick one or two fonts that look good on both platforms; avoid web-only fonts unless we ship them as assets.

## 7. Execution flow — start to finish

This is the canonical sequence the app goes through, end to end, for a new user.

```
   Cold start
       │
       ▼
   Splash screen mounts
       │
       ▼
   Concurrent: GET /api/v1/meta/min-app-version  +  Clerk session check
       │
       ▼
   Version supported?  ──no──▶ Upgrade screen (terminal until update)
       │ yes
       ▼
   Clerk session valid?  ──no──▶ Sign-in screen ──▶ (sign-in) ──▶ getToken() warm-up
       │ yes
       ▼
   Hydrate "me": GET /api/v1/me  (lazily creates Profile server-side)
       │
       ▼
   Mount tabs (Home / Catalog / My Courses / Profile)
       │
       ▼
   User browses / interacts
```

### Sub-flows

#### 7.1 Catalog browse → Course detail

1. `GET /api/v1/categories` (cached for the session).
2. `GET /api/v1/courses?cursor=&limit=20&q=&categoryId=`.
3. Tap a card → `GET /api/v1/courses/:idOrSlug` (catalog detail).
4. UI shows price + Enroll CTA if not purchased; "Continue" if purchased.

#### 7.2 Purchase

1. User taps "Enroll".
2. `POST /api/v1/courses/:courseId/checkout` → `{ orderId, key, amount, currency }`.
3. `RazorpayCheckout.open({ key, order_id: orderId, amount, currency, prefill: { ... } })`.
4. On success callback, `POST /api/v1/razorpay/verify { razorpay_order_id, razorpay_payment_id, razorpay_signature }`.
5. On 200, invalidate React Query keys: `['me','courses']` and the course detail. UI shows the user as enrolled.
6. On failure, surface the Razorpay error code; suggest retry.

#### 7.3 Open chapter (player)

1. From course detail or My Courses, tap a chapter.
2. `GET /api/v1/courses/:courseId/chapters/:chapterId` → returns chapter, plus `playbackId` only if accessible (purchased / free / staff).
3. Render player based on `contentType`.
4. For Mux: pass `playbackId` to `MuxPlayer` (or compose the HLS URL `https://stream.mux.com/<playbackId>.m3u8` for `react-native-video`).
5. For YouTube: pass `youtubeVideoId` to the iframe wrapper.
6. For PDFs: pass the `/api/files/private/...` URL with `Authorization` header.
7. For HTML embed: render in WebView with the chapter's `htmlContent`.
8. For text: render markdown.
9. For project: show form (Drive URL).
10. For evaluation: render the quiz screen flow (§ 7.5).

#### 7.4 Mark complete

1. User taps "Mark complete".
2. `PUT /api/v1/courses/:courseId/chapters/:chapterId/progress { isCompleted: true }`.
3. Invalidate the course's progress + the chapter list cache.
4. If this was the last chapter, fire a celebratory animation (lightweight — no need to mirror confetti exactly).

#### 7.5 Quiz attempt

1. Open chapter → if quiz, navigate to quiz screen.
2. `GET /api/v1/courses/:courseId/chapters/:chapterId/quiz/start` to fetch existing attempts.
3. If there's an active attempt, resume; else show "Start" button.
4. `POST .../quiz/start` → returns attempt + (shuffled) questions.
5. Per question change: debounced `POST .../quiz/save { questionId, selectedOptions }`.
6. On Submit (or `timeLimit` expiry): `POST .../quiz/submit`.
7. Display score + per-question feedback. Invalidate `userProgress`.

#### 7.6 Project submission

1. Open chapter → render `ProjectSubmissionForm`.
2. Pre-fill from `GET .../project-submission`.
3. Submit → `POST .../project-submission { driveUrl }`.
4. UI shows status + review note (if any).

#### 7.7 Mentor chat

1. Open course → tap "Chat with mentor" (or chat tab inside the course).
2. `GET /api/v1/courses/:courseId/messages` (no `since` first time; `since=lastMessage.createdAt` after).
3. Poll every 10–15 s while foreground; pause on background (use AppState).
4. Send → `POST .../messages { content }` → optimistic append + invalidate.
5. On screen open and on new messages received, `PUT .../messages/read`.

#### 7.8 Sign out

1. `Clerk.signOut()`.
2. Clear React Query cache.
3. Route to sign-in.

## 8. Caching strategy (React Query)

- **Catalog**: `staleTime: 5 minutes`, `cacheTime: 30 minutes`. Pull-to-refresh forces a refetch.
- **My courses + progress**: `staleTime: 1 minute`. Refetch on focus.
- **Course detail**: `staleTime: 5 minutes`.
- **Chapter content**: `staleTime: Infinity` (it doesn't change while the user is reading) — but invalidate when teacher edits land. Since we don't get notified, fall back to `staleTime: 5 minutes`.
- **Mentor chat**: short `staleTime` (~10 s); use `refetchInterval` while screen mounted.
- **Profile**: `staleTime: 5 minutes`.

Always pass a stable, structured `queryKey`: e.g. `['courses', { q, categoryId, cursor }]`, `['me', 'courses']`, `['course', courseId]`, `['chapter', courseId, chapterId]`, `['quiz', 'attempts', chapterId]`, `['chat', courseId]`, `['me']`.

After each mutation, invalidate the keys that should update.

## 9. Offline behaviour (Phase 1 minimum)

- Show a friendly "You're offline" banner when network is unavailable (`@react-native-community/netinfo`).
- React Query already serves stale cache when offline — that's our offline read mode.
- No write-while-offline support in v1. Block mutations and show a toast.
- No video/PDF download for offline viewing in v1.

## 10. Push notifications (NOT in v1)

Out of scope. If/when added, use Expo Push Notifications + a backend endpoint to register device tokens.

## 11. Build & release pipeline

- **EAS Build** for both iOS and Android, three profiles: `development`, `preview` (internal testers), `production`.
- **EAS Update** for OTA JS bundle updates between store releases (subject to Apple review rules).
- Versioning: app version + build number bumped per release; `min-app-version` server config updated when we ship a breaking change.
- Code signing: stored in EAS; team manages App Store / Play Store accounts.

## 12. QA matrix

Manually verify before each release:

- iOS 14, 15, 16, 17 (latest two reasonably; older as best-effort).
- Android 8 → latest.
- Light + dark mode.
- WiFi + cellular.
- Logged-in fresh sign-up + existing user (web-enrolled) sign-in.
- Razorpay test card success + failure.
- Each `contentType` chapter renders and "mark complete" works.
- Quiz happy path + time-expiry.
- Project submission upload + status display.
- Chat send + receive (use a teacher account on the web to send a reply).
- Force-upgrade screen renders when min version bumped.

## 13. Phase-1 timeline rough estimate

| Track                                   | Estimate (engineer-weeks) |
| --------------------------------------- | ------------------------- |
| Backend v1 endpoints + envelope + CORS  | 2–3                       |
| OpenAPI spec + Swagger UI + CI          | 1                         |
| RN scaffolding + auth + nav             | 1                         |
| Catalog + My Courses + Profile          | 2                         |
| Player (all content types) + progress   | 3                         |
| Quiz player                             | 1.5                       |
| Project submission + chat               | 1.5                       |
| Razorpay integration + verify hardening | 1                         |
| Theming, polish, error/empty states     | 1.5                       |
| QA + bug fix + store submission         | 2                         |

Total rough order of magnitude: **~16–18 engineer-weeks** with one backend + two mobile engineers in parallel = ~6–8 calendar weeks. This is a planning estimate; refine after a design + spike sprint.
