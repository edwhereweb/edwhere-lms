import { JWT } from 'google-auth-library';

export const GOOGLE_SCOPES = {
  calendar: 'https://www.googleapis.com/auth/calendar.events',
  drive: 'https://www.googleapis.com/auth/drive',
  meetCreate: 'https://www.googleapis.com/auth/meetings.space.created',
  meetReadonly: 'https://www.googleapis.com/auth/meetings.space.readonly'
} as const;

export class GoogleConfigError extends Error {}

export class GoogleApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number
  ) {
    super(message);
  }
}

export function isGoogleMeetEnabled(): boolean {
  return process.env.GOOGLE_MEET_ENABLED === 'true';
}

export function getWorkspaceDomain(): string | undefined {
  return process.env.GOOGLE_WORKSPACE_DOMAIN?.toLowerCase() || undefined;
}

export function isWorkspaceEmail(email: string): boolean {
  const domain = getWorkspaceDomain();
  return !!domain && email.toLowerCase().endsWith(`@${domain}`);
}

const clients = new Map<string, JWT>();

/** Lazily builds a service-account client that impersonates GOOGLE_DELEGATED_SUBJECT. */
export function getDelegatedAuthClient(scopes: string[]): JWT {
  const key = [...scopes].sort().join(' ');
  const cached = clients.get(key);
  if (cached) return cached;

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  const subject = process.env.GOOGLE_DELEGATED_SUBJECT;
  if (!email || !privateKey || !subject) {
    throw new GoogleConfigError('Google service account is not configured');
  }

  const client = new JWT({
    email,
    key: privateKey.replace(/\\n/g, '\n'),
    subject,
    scopes
  });
  clients.set(key, client);
  return client;
}

export async function googleRequest<T>(opts: {
  url: string;
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  scopes: string[];
  data?: unknown;
  params?: Record<string, string | number | boolean>;
}): Promise<T> {
  const client = getDelegatedAuthClient(opts.scopes);
  try {
    const res = await client.request<T>({
      url: opts.url,
      method: opts.method ?? 'GET',
      data: opts.data,
      params: opts.params
    });
    return res.data;
  } catch (error) {
    const status = (error as { response?: { status?: number } }).response?.status;
    const message = error instanceof Error ? error.message : 'Google API request failed';
    throw new GoogleApiError(message, status);
  }
}
