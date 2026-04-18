# Mobile App — Implementation Plan

This folder is the implementation plan for the upcoming **Edwhere Student** mobile app, built in **React Native**.

The plan is intentionally split into focused docs so the team can read what's relevant to them in any order. The mobile app is **API-only** — it does **not** access MongoDB, R2, or any 3rd-party SDK directly except where unavoidable (Razorpay native modal, Mux player). All business logic stays in the existing Next.js app.

## Reading order

| #   | Doc                                                         | Audience                                               |
| --- | ----------------------------------------------------------- | ------------------------------------------------------ |
| 01  | [Scope & MVP](./01-scope-and-mvp.md)                        | Everyone. What's in v1, what's deferred.               |
| 02  | [Backend Changes](./02-backend-changes.md)                  | Backend engineers. The contract changes.               |
| 03  | [OpenAPI / Swagger](./03-openapi-spec.md)                   | Backend + mobile engineers. The API surface.           |
| 04  | [App Architecture & Flow](./04-rn-architecture-and-flow.md) | Mobile engineers. Stack, screens, flows.               |
| 05  | [Open Questions](./05-open-questions.md)                    | Product + tech leads. Decisions needed before kickoff. |

## High-level summary

- **Phase 1 (this plan)**: a Student-only React Native app. No teacher/admin/marketer/blogger surface.
- **No business logic in the app.** All reads/writes go through new versioned REST endpoints (`/api/v1/...`) which we'll add to the existing Next.js app and document via OpenAPI.
- **Auth**: Clerk's React Native SDK (`@clerk/clerk-expo`). Mobile sends a Clerk Bearer token on every request; the Next.js API verifies it.
- **Payments**: Razorpay React Native SDK. Server-side order creation + verification stays unchanged.
- **Video**: Mux Player React Native (`@mux/mux-player-react-native` style) using the same `playbackId` we already store.
- **Files**: existing `/api/files/...` proxy reused, but updated to accept Bearer auth in addition to cookies.

> Phase 2 (Teacher / Admin app) is **out of scope**. Wherever a decision in Phase 1 makes Phase 2 easier later, it's noted in the relevant doc.

## What this plan does NOT cover

- Push notifications infrastructure (deferred).
- Offline mode beyond simple read caching (deferred).
- Deep linking design (basic deep links to a course/chapter only).
- App Store / Play Store submission process.
- Analytics SDK selection.
- Crash reporting tool selection (left as a Phase-1 minor decision).

These are explicitly listed in [05-open-questions.md](./05-open-questions.md) as items requiring product input.
