# Meta Pixel + Meta Conversions API (CAPI) Integration

This document outlines the architecture, configuration, safe rollout sequence, and instant rollback procedures for Meta Pixel and Meta Conversions API (CAPI) tracking in Edwhere LMS.

---

## 1. Overview & Non-Breaking Architecture

The Meta Tracking integration is designed as a **strictly non-breaking, feature-flagged** system with zero external side effects when inactive.

- **Safe Defaults**: All tracking settings default to `OFF` (`metaTrackingEnabled: false`, mode: `'OFF'`).
- **Fail-Safe & Non-Blocking**: All client-side and server-side tracking operations are wrapped in safe handlers and timeouts (4s max on CAPI) — tracking failures or network timeouts can never disrupt core user flows (signup, login, checkout, payment verification, webhook ingestion).
- **Hybrid Deduplication**: Client Pixel and Server CAPI events share identical `event_id` keys (e.g. `purchase_${razorpayOrderId}` for purchases) ensuring Meta's deduplication system merges signals accurately with zero double counting.
- **Privacy & Compliance**: Advanced matching normalizes and hashes user identifiers (SHA-256) server-side and client-side before dispatch. Consent gating blocks pixel execution until user consent is granted when enabled.
- **Security**: Sensitive access tokens are never exposed to the client or returned in public API routes.

---

## 2. Configuration & Admin Dashboard

Admins can manage tracking configuration directly from **Admin Dashboard → Meta Tracking** (`/admin/meta-tracking`) without requiring a code deployment or restart:

| Field                    | Description                                                                                                  | Default            |
| ------------------------ | ------------------------------------------------------------------------------------------------------------ | ------------------ |
| **Enable Meta Tracking** | Master toggle to enable/disable all tracking                                                                 | `false` (Disabled) |
| **Tracking Mode**        | `OFF`, `PIXEL` (Browser only), `CAPI` (Server only), `HYBRID` (Both)                                         | `OFF`              |
| **Meta Pixel ID**        | Numeric dataset / pixel identifier from Meta Events Manager                                                  | `null`             |
| **Meta Access Token**    | System user access token generated in Meta Events Manager for CAPI                                           | `null` (Masked)    |
| **Test Event Code**      | Optional code from Meta Events Manager "Test Events" tab to verify CAPI                                      | `null`             |
| **Advanced Matching**    | Hash and match user email, phone, and name for higher match quality                                          | `false`            |
| **Consent Required**     | Gate Pixel loading until marketing consent is explicitly provided                                            | `false`            |
| **Debug Logging**        | Output tracking diagnostic logs using `debug('META_CAPI', ...)`                                              | `false`            |
| **Tracked Events**       | Per-event switches (`PageView`, `ViewContent`, `CompleteRegistration`, `InitiateCheckout`, `Purchase`, etc.) | All `false`        |

---

## 3. Supported Events & Deduplication Strategy

| Standard Event         | Trigger Location                                                                                           | Channel               | Deduplication `event_id`           |
| ---------------------- | ---------------------------------------------------------------------------------------------------------- | --------------------- | ---------------------------------- |
| `PageView`             | `MetaPixelProvider` (client page route change)                                                             | Browser Pixel         | Auto                               |
| `ViewContent`          | `CourseViewTracker` (course detail & preview pages)                                                        | Browser Pixel         | `course_view:${courseId}`          |
| `CompleteRegistration` | `getSafeProfile` (new user profile creation)                                                               | Server CAPI           | `reg_${profileId}`                 |
| `InitiateCheckout`     | Checkout start (`POST /api/courses/[courseId]/checkout` & `CheckoutClient`)                                | Hybrid (Pixel + CAPI) | `init_checkout_${checkoutOrderId}` |
| `Purchase`             | Authoritative payment verification (`/api/razorpay/verify`, `/api/webhook/razorpay`, and `CheckoutClient`) | Hybrid (Pixel + CAPI) | `purchase_${razorpayOrderId}`      |

---

## 4. Safe Rollout Sequence

To roll out Meta tracking safely into production:

### Step 1: Pre-launch Verification (Dark Launch)

1. Deploy the code with tracking **OFF** (the default state).
2. Navigate to **Admin Dashboard → Meta Tracking** (`/admin/meta-tracking`).
3. Enter your **Meta Pixel ID**, **Meta Access Token**, and a **Test Event Code** (from Meta Events Manager → Test Events tab).
4. Keep **Enable Meta Tracking** toggle `OFF` while verifying connection using the **"Send Test Event"** button on the settings page.
5. Confirm the test event appears in Meta Events Manager in real-time.

### Step 2: Staging / Pilot Activation

1. Set **Tracking Mode** to `HYBRID`.
2. Turn **ON** `PageView` and `ViewContent` first.
3. Switch **Enable Meta Tracking** to `ON`.
4. Inspect browser with Meta Pixel Helper extension to verify base pixel initialization and PageView / ViewContent signals.

### Step 3: Full Funnel & Conversion Activation

1. Turn **ON** `InitiateCheckout` and `Purchase` event switches.
2. Turn **ON** `Advanced Matching` for improved match quality.
3. Remove the **Test Event Code** field (or leave blank for production).
4. Perform a real or test checkout and verify both browser and server signals are captured and deduplicated into a single purchase event in Meta Events Manager.

---

## 5. Instant Rollback Procedure

If any issue arises or you need to immediately stop sending data to Meta:

1. Open **Admin Dashboard → Meta Tracking** (`/admin/meta-tracking`).
2. Toggle **"Enable Meta Tracking"** to **OFF** (or switch **Tracking Mode** to **"Disabled (OFF)"**).
3. Click **"Save Settings"**.

_Result: All client script injections and server CAPI dispatches instantly cease across all pages and API routes without requiring a redeploy or server restart._
