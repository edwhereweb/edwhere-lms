import { env } from '@/lib/env';
import { debug, logError } from '@/lib/debug';
import { formatISTDate, formatISTTime } from '@/lib/format';

interface WebinarConfirmationOpts {
  // Full international phone number including country code (e.g. "919447861995" or "+919447861995")
  phone: string;
  name: string;
  webinarTitle: string;
  scheduledAt: Date;
  meetLink: string | null;
}

export interface WacrmResult {
  ok: boolean;
  /** HTTP status returned by WACRM (0 if a network/fetch error occurred) */
  status: number;
  /** Raw response body text from WACRM — useful for debugging */
  body: string;
}

/**
 * Extracts the meeting code from a Google Meet URL for use as the {{1}} button URL variable.
 * e.g. "https://meet.google.com/aas-sdsd-sds" → "aas-sdsd-sds"
 */
export function extractMeetCode(meetLink: string): string {
  if (!meetLink) return '';
  const trimmed = meetLink.trim();
  try {
    const withProto =
      trimmed.startsWith('http://') || trimmed.startsWith('https://')
        ? trimmed
        : `https://${trimmed}`;
    const url = new URL(withProto);
    const code = url.pathname.replace(/^\/+|\/+$/g, '');
    return code || trimmed;
  } catch {
    return trimmed;
  }
}

/**
 * Low-level helper — sends a single WACRM template message and returns the raw result.
 * Never throws; network errors are returned as { ok: false, status: 0, body: <error message> }.
 */
async function callWacrm(
  apiUrl: string,
  apiKey: string,
  payload: Record<string, unknown>
): Promise<WacrmResult> {
  try {
    const res = await fetch(`${apiUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });
    const body = await res.text().catch(() => '');
    return { ok: res.ok, status: res.status, body };
  } catch (err) {
    return { ok: false, status: 0, body: String(err) };
  }
}

/**
 * Builds the WACRM template payload.
 *
 * WACRM's /api/v1/messages endpoint accepts structured params:
 *   - params.body: string[] (positional values for {{1}}…{{N}} in the template body)
 *   - params.buttonParams: Record<number, string> (e.g. { 0: meetCode } for dynamic URL button #1)
 *
 * Phone numbers should follow E.164 (prefixed with '+' if not already present).
 */
function buildPayload(
  templateName: string,
  phone: string,
  bodyParams: string[],
  meetCode: string,
  contactName?: string
): Record<string, unknown> {
  const formattedPhone = phone.startsWith('+') ? phone : `+${phone}`;

  return {
    to: formattedPhone,
    type: 'template',
    ...(contactName ? { name: contactName } : {}),
    template: {
      name: templateName,
      language: 'en_US',
      params: {
        body: bodyParams,
        ...(meetCode ? { buttonParams: { 0: meetCode } } : {})
      }
    }
  };
}

// ─── Confirmation ─────────────────────────────────────────────────────────────

/**
 * Sends a WhatsApp confirmation message via WACRM when a user registers for a webinar.
 * Fire-and-forget — never throws; all errors are logged and swallowed so they don't
 * block the registration response.
 *
 * Silently skips if WACRM_API_URL / WACRM_API_KEY / WACRM_TEMPLATE_ID are not configured.
 *
 * Returns a WacrmResult so callers (e.g. the admin test endpoint) can inspect the outcome.
 */
export async function sendWebinarConfirmationWhatsApp(
  opts: WebinarConfirmationOpts
): Promise<WacrmResult> {
  const { WACRM_API_URL, WACRM_API_KEY, WACRM_TEMPLATE_ID } = env;

  if (!WACRM_API_URL || !WACRM_API_KEY || !WACRM_TEMPLATE_ID) {
    debug('WACRM', 'Skipping WhatsApp confirmation — WACRM env vars not configured');
    return { ok: false, status: 0, body: 'WACRM env vars not configured' };
  }

  const dateFormatted = formatISTDate(opts.scheduledAt);
  const timeFormatted = formatISTTime(opts.scheduledAt);
  const link = opts.meetLink || 'Link will be shared shortly!';
  // Meta template has dynamic button URL `https://meet.google.com/{{1}}` which requires
  // a button param value. If meetLink is missing, fallback to 'edwhere' to pass validation.
  const meetCode = opts.meetLink ? extractMeetCode(opts.meetLink) : 'edwhere';

  const payload = buildPayload(
    WACRM_TEMPLATE_ID,
    opts.phone,
    [opts.name, opts.webinarTitle, dateFormatted, timeFormatted, link],
    meetCode,
    opts.name
  );

  debug('WACRM', 'Sending confirmation payload:', JSON.stringify(payload));

  const result = await callWacrm(WACRM_API_URL, WACRM_API_KEY, payload);

  if (!result.ok) {
    logError('WACRM', `WhatsApp send failed (${result.status}): ${result.body}`);
  } else {
    debug('WACRM', `WhatsApp confirmation sent to ${opts.phone}. Response: ${result.body}`);
  }

  return result;
}

// ─── 24 h reminder ───────────────────────────────────────────────────────────

/**
 * Sends a 24h WhatsApp reminder via WACRM for an upcoming webinar.
 */
export async function sendWebinarReminderWhatsApp(opts: WebinarConfirmationOpts): Promise<void> {
  const { WACRM_API_URL, WACRM_API_KEY, WACRM_REMINDER_TEMPLATE_ID } = env;

  if (!WACRM_API_URL || !WACRM_API_KEY || !WACRM_REMINDER_TEMPLATE_ID) {
    debug('WACRM', 'Skipping WhatsApp reminder — WACRM reminder env vars not configured');
    return;
  }

  const dateFormatted = formatISTDate(opts.scheduledAt);
  const timeFormatted = formatISTTime(opts.scheduledAt);
  const link = opts.meetLink || 'Link will be shared shortly!';
  const meetCode = opts.meetLink ? extractMeetCode(opts.meetLink) : '';

  const payload = buildPayload(
    WACRM_REMINDER_TEMPLATE_ID,
    opts.phone,
    [opts.name, opts.webinarTitle, dateFormatted, timeFormatted, link],
    meetCode,
    opts.name
  );

  const result = await callWacrm(WACRM_API_URL, WACRM_API_KEY, payload);

  if (!result.ok) {
    logError('WACRM', `WhatsApp reminder send failed (${result.status}): ${result.body}`);
  } else {
    debug('WACRM', `WhatsApp reminder sent to ${opts.phone}`);
  }
}

// ─── 1 h reminder ────────────────────────────────────────────────────────────

/**
 * Sends a 1-hour WhatsApp reminder via WACRM for an upcoming webinar.
 */
export async function sendWebinarReminder1hWhatsApp(opts: WebinarConfirmationOpts): Promise<void> {
  const { WACRM_API_URL, WACRM_API_KEY, WACRM_REMINDER_1H_TEMPLATE_ID } = env;

  if (!WACRM_API_URL || !WACRM_API_KEY || !WACRM_REMINDER_1H_TEMPLATE_ID) {
    return;
  }

  const link = opts.meetLink || 'Link will be shared shortly!';
  const meetCode = opts.meetLink ? extractMeetCode(opts.meetLink) : '';

  const payload = buildPayload(
    WACRM_REMINDER_1H_TEMPLATE_ID,
    opts.phone,
    [opts.name, opts.webinarTitle, link],
    meetCode,
    opts.name
  );

  const result = await callWacrm(WACRM_API_URL, WACRM_API_KEY, payload);

  if (!result.ok) {
    logError('WACRM', `WhatsApp 1h reminder send failed (${result.status}): ${result.body}`);
  } else {
    debug('WACRM', `WhatsApp 1h reminder sent to ${opts.phone}`);
  }
}

// ─── 0 m reminder ────────────────────────────────────────────────────────────

/**
 * Sends a 0-minute (live) WhatsApp reminder via WACRM for an upcoming webinar.
 */
export async function sendWebinarReminder0mWhatsApp(opts: WebinarConfirmationOpts): Promise<void> {
  const { WACRM_API_URL, WACRM_API_KEY, WACRM_REMINDER_0M_TEMPLATE_ID } = env;

  if (!WACRM_API_URL || !WACRM_API_KEY || !WACRM_REMINDER_0M_TEMPLATE_ID) {
    return;
  }

  const link = opts.meetLink || 'Link will be shared shortly!';
  const meetCode = opts.meetLink ? extractMeetCode(opts.meetLink) : '';

  const payload = buildPayload(
    WACRM_REMINDER_0M_TEMPLATE_ID,
    opts.phone,
    [opts.name, opts.webinarTitle, link],
    meetCode,
    opts.name
  );

  const result = await callWacrm(WACRM_API_URL, WACRM_API_KEY, payload);

  if (!result.ok) {
    logError('WACRM', `WhatsApp 0m reminder send failed (${result.status}): ${result.body}`);
  } else {
    debug('WACRM', `WhatsApp 0m reminder sent to ${opts.phone}`);
  }
}
