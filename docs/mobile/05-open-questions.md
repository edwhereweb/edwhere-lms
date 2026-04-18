# 05 — Open Questions & Concerns

These are decisions / clarifications we need before — or early into — the build. They are grouped by who needs to weigh in. The numbering is referenced from the other docs.

## Product / Business

### Q1. App store billing rules for course purchases

Apple App Store and Google Play have rules about whether digital goods sold inside an app must use the platform's IAP system (Apple IAP / Google Play Billing).

- For **online educational services consumed online** (which we are), most jurisdictions allow third-party payments (Razorpay). Apple's "Reader app" and "online services" carve-outs apply, and India specifically has a regulatory exemption.
- This still needs **explicit confirmation** by someone with App Store / Play Store policy literacy, ideally including any third-party payment-provider disclosure messaging the stores require.
- **Worst case**: if rejected, we'd have to either (a) remove paid enrolment from the app and force users to buy on web, or (b) switch the in-app purchase to platform IAP (which is a major project — different revenue share, new server-side flows, no Razorpay).

**Decision needed before**: store submission. Recommended: a short legal/compliance review during the build.

### Q2 (was Q3). Should the Swagger UI be publicly accessible?

The OpenAPI spec at `/api/openapi.yaml` and the Swagger UI at `/docs` could be:

- **Public** — easy for partners and consultants. Risk: enumerates the API surface for attackers; "Try it out" against prod is dangerous.
- **Internal only** — gated behind Clerk ADMIN role, basic auth, or restricted to non-prod environments. Safer; minor inconvenience.

**Recommendation**: internal-only. Mount in non-prod freely; in prod, require ADMIN role.

### Q3 (was Q4). Mobile UI library choice

Two reasonable paths:

- **`tamagui` or `nativewind`** — Tailwind/utility-first feel, matches the web codebase mental model. Slight build complexity.
- **In-house components on top of base RN primitives** — full control, no extra deps, but more code to write up front.

The mobile team should pick based on hands-on spike. Either keeps the web look-and-feel achievable.

**Decision needed by**: end of week 1 of mobile build.

### Q4 (was Q5). Do non-STUDENT roles get mobile access in v1?

Today's recommendation in [01-scope-and-mvp § 6](./01-scope-and-mvp.md#6-note-on-roles-inside-the-mobile-app) is: any role can sign in but only the student surface is shown.

Alternatives:

- **Hard block**: TEACHER/ADMIN/MARKETER/BLOGGER cannot sign in to v1 — show "use the web app" message.
- **Soft block**: same as recommendation, no UI for staff features.
- **Phase 2 setup**: if Phase 2 (teacher app) will be a separate app, hard block for staff in this app makes the line cleaner.

**Decision needed before**: store submission (the message shown affects review).

### Q5 (was Q6). Analytics & crash reporting provider

Pick one of each:

- **Crash reporting**: Sentry (recommended), Bugsnag, Crashlytics.
- **Analytics**: PostHog, Amplitude, Mixpanel, Firebase Analytics.

Both should be added early so we have data from day-one users. This affects env vars on both server and mobile, and SDKs to install.

**Decision needed by**: end of week 2 of mobile build.

### Q6 (was Q7). Monorepo or separate repo?

Recommendation in [04 § 2](./04-rn-architecture-and-flow.md#2-repo-layout) is **separate repo** (`edwhere-mobile`). Alternatives:

- **Same repo** with a `mobile/` workspace via npm workspaces or pnpm.
- **Two repos** with the OpenAPI types being the only shared artefact (recommended).

**Decision needed before**: mobile scaffolding starts.

### Q7. Push notifications scope for Phase 1.5

Phase 1 explicitly excludes push. But several screens benefit from it:

- Mentor chat replies.
- Project submission review (approved/rejected).
- New free chapters added.
- Teacher / mentor announcements.

**Decision needed**: when do we start Phase 1.5 push? What events trigger pushes? Where does the device-token registry live?

## Tech

### Q8. Private file access from RN — Bearer headers or presigned URLs?

`/api/files/private/...` requires auth. Two implementation choices:

- **Bearer headers everywhere** — pass `Authorization` in the header from `<Image>`, `<Pdf>`, etc. Works in modern RN but historically fragile across libraries.
- **Short-lived presigned R2 URLs** — add `GET /api/v1/files/sign?key=...` returning a 5-minute presigned R2 GET URL after running the same ACL check. Mobile uses the presigned URL directly, no headers needed.

Recommendation: **start with headers**, add the sign endpoint as a fallback only if header passing causes issues in PDF or video components.

**Decision needed by**: mid week-2 of player work.

### Q9. Mux signed playback?

Anyone with a Mux `playbackId` can play the stream. Mux supports JWT-signed playback URLs that expire and bind to a viewer. Worth turning on if revenue grows or piracy becomes a real concern.

**Status**: not in v1. Add as a Phase 1.5 task. Implementation lives entirely on the server (sign in `getChapter` action) and doesn't break existing players.

### Q10. Quiz auto-fail on tab switches

`Quiz.maxTabSwitches` is stored but not enforced. On mobile we can detect app backgrounding via `AppState`. Should backgrounding count as a "tab switch" and be enforced?

**Decision needed**: product call. If yes, add server enforcement on `quiz/submit` so it's consistent across web and mobile.

### Q11. Webhook receivers for Razorpay & Mux

Today both convergences are client-driven (mobile/web verifies; client polls Mux). Consequences:

- A user closing the app between Razorpay payment success and verify leaves an orphan paid order.
- A user closing the app during Mux processing means we don't backfill `playbackId` until the next page load.

For mobile, the orphan-payment risk is worse (mobile users background apps freely). Adding Razorpay webhooks is a worthwhile Phase 1.5 task:

- Add `POST /api/webhook/razorpay` that processes `payment.captured` events. Same verify logic; same `Purchase` upsert.
- Configure the webhook in Razorpay dashboard.
- Make the `Purchase` upsert idempotent on `(userId, courseId)` (already is, via the unique index).

**Recommendation**: include in Phase 1.5 hardening. Out of v1 to keep scope tight.

### Q12. Versioning of `/api/v1`

Once mobile users are in the wild, breaking changes to `/api/v1` are costly. Confirm the team agrees with the policy in [03 § 10](./03-openapi-spec.md#10-versioning-the-spec): additive only on v1; break = new v2.

### Q13. Rate limiting for authenticated endpoints

The current rate limiter only protects `/api/contact` and is in-memory (per-process). With mobile in the mix, we should consider per-user rate limits on at least:

- `POST /api/v1/razorpay/verify` (defence against signature-replay attempts).
- `POST /api/v1/courses/:id/chapters/:id/quiz/submit` (cheap server-side cap).
- `POST /api/v1/courses/:id/messages` (chat spam).

Implementing this properly requires a shared store (Redis, Atlas TTL collection, or Cloudflare WAF). **Decision needed**: build it before mobile launch, or accept the risk for v1?

### Q14. Logging volume

If we enable `logRequest()` for `/api/v1/*` traffic, the `Logging` collection will grow much faster than today (mobile clients generate more requests than web). Set a TTL index in Atlas before turning it on broadly.

### Q15. Testing strategy

The web codebase has **no automated tests**. Adding mobile makes this gap riskier. Minimum we should have before launch:

- The OpenAPI contract test (CI smoke test) from [03 § 7](./03-openapi-spec.md#7-ci--contract-testing).
- A handful of integration tests on the new `/api/v1/*` routes (auth, validation, happy path).
- Detox or Maestro end-to-end tests on the mobile app for sign-in → enroll → consume.

**Decision needed**: who owns the test setup? Estimate ~1 engineer-week to scaffold both.

### Q16. Token refresh & long sessions

Clerk session tokens are short-lived (~60s by default). The mobile app must call `getToken()` immediately before each request (or use the SDK's auto-refresh hook). Confirm:

- The SDK we use (`@clerk/clerk-expo`) handles refresh transparently.
- Our `apiClient` calls `getToken()` per request, not per app launch.
- We have a recovery flow for permanent token failure (e.g. revoked session).

### Q17. Account deletion (App Store requirement)

Apple now requires apps that allow sign-up to also allow in-app account deletion. We don't have an in-app or in-web account delete flow today. We must:

- Add a "Delete my account" UI in the mobile app.
- Add `DELETE /api/v1/me` that:
  1. Soft- or hard-deletes the local Profile and downstream data (decide policy).
  2. Calls Clerk to delete the user.
  3. Optional: emails confirmation.

**Decision needed before**: store submission. Soft delete is friendlier; hard delete is simpler.

### Q18. PII export (GDPR / DPDPA)

Similar in spirit to deletion: a user data export endpoint may be required depending on jurisdiction. Likely overkill for v1 if we are India-only, but worth noting.

## Operations

### Q19. Razorpay live keys for mobile builds

The mobile production build needs `RAZORPAY_KEY_ID` (the live one) baked in. Strategy:

- Don't bake at build time — fetch via `/api/v1/courses/:id/checkout` response (already proposed). This avoids storing prod keys in mobile config and lets us rotate without app updates.
- The Razorpay native SDK accepts the key per-call, not from app config — perfect.

### Q20. App Store accounts and signing

Who owns:

- Apple Developer Program account?
- Google Play Console account?
- Code-signing certificates?
- App store metadata (screenshots, descriptions, privacy policy URL)?

Get these answered before EAS Build production runs.

### Q21. Privacy policy URL

Both stores require a privacy policy. We don't have one published. Need:

- Privacy policy reviewed by counsel (covers Clerk, Razorpay, Mux, R2, MongoDB Atlas).
- Public URL to link from app store listing and in-app Settings.

### Q22. Beta testers

- iOS: TestFlight invite process.
- Android: Play Console internal track.

Plan a 1–2 week beta with a small student cohort before public launch.

## Summary — must-resolve-before-build

If we have to pick a minimal set to unblock kickoff, these are the **must-haves**:

1. **Q1** App-store billing rules (legal/compliance signoff).
2. **Q4** Non-STUDENT mobile access policy.
3. **Q6** Monorepo vs separate repo.
4. **Q17** Account deletion endpoint design.
5. **Q21** Privacy policy text.

The rest can be resolved during the build with low blast radius.

---

If you (the reader) want to weigh in on any of these, leave comments / decisions inline in this file or open a PR. Update the doc as decisions are made so future engineers don't re-litigate.
