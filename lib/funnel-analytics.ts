'use client';

type FunnelEventName =
  | 'course_view'
  | 'buy_click'
  | 'login_prompt_from_buy'
  | 'login_success_from_buy'
  | 'checkout_started'
  | 'payment_initiated'
  | 'payment_success'
  | 'payment_failed'
  | 'checkout_abandoned'
  | 'campaign_coupon_captured'
  | 'campaign_coupon_auto_applied'
  | 'dashboard_onboarding_impression'
  | 'dashboard_category_tile_click';

type TrackFunnelEventInput = {
  event: FunnelEventName;
  courseId?: string;
  categoryId?: string;
  amount?: number;
  currency?: string;
  source?: string;
  checkoutOrderId?: string;
  paymentOrderId?: string;
  dedupeKey?: string;
};

const SESSION_STORAGE_KEY = 'edwhere:funnel-events';
const sentEvents = new Set<string>();

function getDeviceType() {
  if (typeof window === 'undefined') return 'unknown';
  return window.matchMedia('(max-width: 768px)').matches ? 'mobile' : 'desktop';
}

function hasSent(dedupeKey: string) {
  if (sentEvents.has(dedupeKey)) return true;
  if (typeof window === 'undefined') return false;

  const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (!raw) return false;

  try {
    const parsed = JSON.parse(raw) as string[];
    return parsed.includes(dedupeKey);
  } catch {
    return false;
  }
}

function markSent(dedupeKey: string) {
  sentEvents.add(dedupeKey);
  if (typeof window === 'undefined') return;

  const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
  let parsed: string[] = [];
  if (raw) {
    try {
      parsed = (JSON.parse(raw) as string[]) ?? [];
    } catch {
      parsed = [];
    }
  }

  if (!parsed.includes(dedupeKey)) {
    parsed.push(dedupeKey);
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(parsed.slice(-200)));
  }
}

export async function trackFunnelEvent({
  event,
  courseId,
  categoryId,
  amount,
  currency = 'INR',
  source = 'web',
  checkoutOrderId,
  paymentOrderId,
  dedupeKey
}: TrackFunnelEventInput) {
  const eventKey =
    dedupeKey ??
    `${event}:${courseId ?? categoryId ?? 'none'}:${checkoutOrderId ?? paymentOrderId ?? 'none'}`;
  if (hasSent(eventKey)) return;
  markSent(eventKey);

  try {
    await fetch('/api/analytics/funnel', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        event,
        courseId,
        categoryId,
        amount,
        currency,
        source,
        device: getDeviceType(),
        dedupeKey: eventKey,
        checkoutOrderId,
        paymentOrderId
      })
    });
  } catch {
    // no-op; analytics should never block UX
  }
}
