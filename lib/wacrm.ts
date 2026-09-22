import { env } from '@/lib/env';
import { debug, logError } from '@/lib/debug';
import { format } from 'date-fns';

interface WebinarConfirmationOpts {
  // Full international phone number including country code, digits only (e.g. "918138041614")
  phone: string;
  name: string;
  webinarTitle: string;
  scheduledAt: Date;
  meetLink: string | null;
}

/**
 * Sends a WhatsApp confirmation message via WACRM when a user registers for a webinar.
 * Fire-and-forget — never throws; all errors are logged and swallowed so they don't
 * block the registration response.
 *
 * Silently skips if WACRM_API_URL / WACRM_API_KEY / WACRM_TEMPLATE_ID are not configured.
 */
export async function sendWebinarConfirmationWhatsApp(
  opts: WebinarConfirmationOpts
): Promise<void> {
  const { WACRM_API_URL, WACRM_API_KEY, WACRM_TEMPLATE_ID } = env;

  if (!WACRM_API_URL || !WACRM_API_KEY || !WACRM_TEMPLATE_ID) {
    debug('WACRM', 'Skipping WhatsApp confirmation — WACRM env vars not configured');
    return;
  }

  const dateFormatted = format(opts.scheduledAt, 'MMMM d, yyyy');
  const timeFormatted = format(opts.scheduledAt, 'h:mm a');
  const link = opts.meetLink || 'Link will be shared shortly!';

  try {
    const res = await fetch(`${WACRM_API_URL}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${WACRM_API_KEY}`
      },
      body: JSON.stringify({
        to: opts.phone,
        type: 'template',
        template: {
          name: WACRM_TEMPLATE_ID,
          language: 'en_US',
          params: [opts.name, opts.webinarTitle, dateFormatted, timeFormatted, link]
        }
      })
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      logError('WACRM', `WhatsApp send failed (${res.status}): ${body}`);
    } else {
      debug('WACRM', `WhatsApp confirmation sent to ${opts.phone}`);
    }
  } catch (err) {
    logError('WACRM', err);
  }
}

/**
 * Sends a 24h WhatsApp reminder via WACRM for an upcoming webinar.
 */
export async function sendWebinarReminderWhatsApp(opts: WebinarConfirmationOpts): Promise<void> {
  const { WACRM_API_URL, WACRM_API_KEY, WACRM_REMINDER_TEMPLATE_ID } = env;

  if (!WACRM_API_URL || !WACRM_API_KEY || !WACRM_REMINDER_TEMPLATE_ID) {
    debug('WACRM', 'Skipping WhatsApp reminder — WACRM reminder env vars not configured');
    return;
  }

  const dateFormatted = format(opts.scheduledAt, 'MMMM d, yyyy');
  const timeFormatted = format(opts.scheduledAt, 'h:mm a');
  const link = opts.meetLink || 'Link will be shared shortly!';

  try {
    const res = await fetch(`${WACRM_API_URL}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${WACRM_API_KEY}`
      },
      body: JSON.stringify({
        to: opts.phone,
        type: 'template',
        template: {
          name: WACRM_REMINDER_TEMPLATE_ID,
          language: 'en_US',
          params: [opts.name, opts.webinarTitle, dateFormatted, timeFormatted, link]
        }
      })
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      logError('WACRM', `WhatsApp reminder send failed (${res.status}): ${body}`);
    } else {
      debug('WACRM', `WhatsApp reminder sent to ${opts.phone}`);
    }
  } catch (err) {
    logError('WACRM', err);
  }
}

/**
 * Sends a 1-hour WhatsApp reminder via WACRM for an upcoming webinar.
 */
export async function sendWebinarReminder1hWhatsApp(opts: WebinarConfirmationOpts): Promise<void> {
  const { WACRM_API_URL, WACRM_API_KEY, WACRM_REMINDER_1H_TEMPLATE_ID } = env;

  if (!WACRM_API_URL || !WACRM_API_KEY || !WACRM_REMINDER_1H_TEMPLATE_ID) {
    return;
  }

  const link = opts.meetLink || 'Link will be shared shortly!';

  try {
    const res = await fetch(`${WACRM_API_URL}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${WACRM_API_KEY}`
      },
      body: JSON.stringify({
        to: opts.phone,
        type: 'template',
        template: {
          name: WACRM_REMINDER_1H_TEMPLATE_ID,
          language: 'en_US',
          params: [opts.name, opts.webinarTitle, link]
        }
      })
    });

    if (!res.ok) {
      logError('WACRM', `WhatsApp 1h reminder send failed (${res.status})`);
    } else {
      debug('WACRM', `WhatsApp 1h reminder sent to ${opts.phone}`);
    }
  } catch (err) {
    logError('WACRM', err);
  }
}

/**
 * Sends a 0-minute (live) WhatsApp reminder via WACRM for an upcoming webinar.
 */
export async function sendWebinarReminder0mWhatsApp(opts: WebinarConfirmationOpts): Promise<void> {
  const { WACRM_API_URL, WACRM_API_KEY, WACRM_REMINDER_0M_TEMPLATE_ID } = env;

  if (!WACRM_API_URL || !WACRM_API_KEY || !WACRM_REMINDER_0M_TEMPLATE_ID) {
    return;
  }

  const link = opts.meetLink || 'Link will be shared shortly!';

  try {
    const res = await fetch(`${WACRM_API_URL}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${WACRM_API_KEY}`
      },
      body: JSON.stringify({
        to: opts.phone,
        type: 'template',
        template: {
          name: WACRM_REMINDER_0M_TEMPLATE_ID,
          language: 'en_US',
          params: [opts.name, opts.webinarTitle, link]
        }
      })
    });

    if (!res.ok) {
      logError('WACRM', `WhatsApp 0m reminder send failed (${res.status})`);
    } else {
      debug('WACRM', `WhatsApp 0m reminder sent to ${opts.phone}`);
    }
  } catch (err) {
    logError('WACRM', err);
  }
}
