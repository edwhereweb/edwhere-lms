import { z } from 'zod';

import { parseEnvBoolean } from '@/lib/parse-env-boolean';

const optionalString = z.preprocess(
  (v) => (v === '' ? undefined : v),
  z.string().min(1).optional()
);

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
  CLERK_SECRET_KEY: z.string().min(1),
  R2_ACCOUNT_ID: z.string().min(1),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
  R2_BUCKET_NAME: z.string().min(1),
  MUX_TOKEN_ID: z.string().min(1),
  MUX_TOKEN_SECRET: z.string().min(1),
  RAZORPAY_KEY_ID: z.string().min(1),
  RAZORPAY_KEY_SECRET: z.string().min(1),
  NEXT_PUBLIC_RAZORPAY_KEY_ID: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  ENABLE_DEBUG_LOGS: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  MOBILE_MIN_IOS: z.string().default('1.0.0'),
  MOBILE_MIN_ANDROID: z.string().default('1.0.0'),
  MOBILE_LATEST_IOS: z.string().default('1.0.0'),
  MOBILE_LATEST_ANDROID: z.string().default('1.0.0'),
  MOBILE_FORCE_UPGRADE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  // WACRM WhatsApp API — optional; webinar confirmations are skipped if unset
  WACRM_API_URL: z.preprocess((v) => (v === '' ? undefined : v), z.string().url().optional()),
  WACRM_API_KEY: z.preprocess((v) => (v === '' ? undefined : v), z.string().min(1).optional()),
  WACRM_TEMPLATE_ID: z.preprocess((v) => (v === '' ? undefined : v), z.string().min(1).optional()),
  WACRM_REMINDER_TEMPLATE_ID: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z.string().min(1).optional()
  ),
  WACRM_REMINDER_1H_TEMPLATE_ID: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z.string().min(1).optional()
  ),
  WACRM_REMINDER_0M_TEMPLATE_ID: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z.string().min(1).optional()
  ),
  // Template for post-enrollment notifications (course/webinar join confirmation)
  WACRM_ENROLLMENT_TEMPLATE_ID: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z.string().min(1).optional()
  ),
  // LMS → CRM enrollment sync (see docs/CRM-ENROLLMENT-SYNC.md)
  CRM_SYNC_MAX_ATTEMPTS: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z.coerce.number().int().min(1).optional()
  ),
  CRM_SYNC_BACKOFF_BASE_SECONDS: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z.coerce.number().int().min(1).optional()
  ),
  CRM_SYNC_BATCH_SIZE: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z.coerce.number().int().min(1).optional()
  ),
  CRM_SYNC_SECRET: z.preprocess((v) => (v === '' ? undefined : v), z.string().min(16).optional()),
  // Google Meet live sessions — credentials are only required when GOOGLE_MEET_ENABLED=true
  GOOGLE_MEET_ENABLED: z.unknown().transform((v) => parseEnvBoolean(v, false)),
  GOOGLE_MEET_STRICT_COHOST: z.unknown().transform((v) => parseEnvBoolean(v, true)),
  GOOGLE_WORKSPACE_DOMAIN: optionalString,
  GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL: optionalString,
  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: optionalString,
  GOOGLE_DELEGATED_SUBJECT: optionalString,
  GOOGLE_MEET_INTERNAL_SECRET: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z.string().min(16).optional()
  ),
  GOOGLE_MEET_RECONCILE_BATCH_SIZE: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z.coerce.number().int().min(1).max(100).default(20)
  ),
  GOOGLE_MEET_RECONCILE_MAX_RETRIES: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z.coerce.number().int().min(1).default(6)
  ),
  GOOGLE_MEET_RECONCILE_INITIAL_DELAY_MIN: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z.coerce.number().int().min(1).default(5)
  ),
  GOOGLE_MEET_RECONCILE_MAX_DELAY_MIN: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z.coerce.number().int().min(1).default(60)
  )
});

const GOOGLE_MEET_REQUIRED_WHEN_ENABLED = [
  'GOOGLE_WORKSPACE_DOMAIN',
  'GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL',
  'GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY',
  'GOOGLE_DELEGATED_SUBJECT',
  'GOOGLE_MEET_INTERNAL_SECRET'
] as const;

function validateEnv() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const formatted = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');

    console.error(`\n❌ Missing or invalid environment variables:\n${formatted}\n`);
    throw new Error('Invalid environment configuration. See above for details.');
  }

  if (parsed.data.GOOGLE_MEET_ENABLED) {
    const missing = GOOGLE_MEET_REQUIRED_WHEN_ENABLED.filter((k) => !parsed.data[k]);
    if (missing.length > 0) {
      console.error(`\n❌ GOOGLE_MEET_ENABLED=true but missing: ${missing.join(', ')}\n`);
      throw new Error('Invalid environment configuration. See above for details.');
    }
  }

  return parsed.data;
}

export const env = validateEnv();
