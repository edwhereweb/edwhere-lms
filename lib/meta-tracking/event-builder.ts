import crypto from 'crypto';
import {
  MetaRawUserData,
  MetaCustomData,
  MetaCapiEventPayload,
  MetaStandardEventName
} from './types';

export function generateEventId(prefix = 'evt'): string {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(6).toString('hex');
  return `${prefix}_${timestamp}_${random}`;
}

export function hashString(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return crypto.createHash('sha256').update(trimmed).digest('hex');
}

export function normalizeAndHashEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;
  return hashString(normalized);
}

export function normalizeAndHashPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  if (!digits) return null;
  return hashString(digits);
}

export function normalizeAndHashName(name: string | null | undefined): string | null {
  if (!name) return null;
  const normalized = name.trim().toLowerCase();
  if (!normalized) return null;
  return hashString(normalized);
}

export function normalizeAndHashGeneric(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  return hashString(normalized);
}

export function buildCapiUserData(
  userData: MetaRawUserData = {},
  options?: { advancedMatchingEnabled?: boolean }
): MetaCapiEventPayload['user_data'] {
  const advancedMatching = options?.advancedMatchingEnabled ?? true;
  const data: MetaCapiEventPayload['user_data'] = {};

  if (userData.clientIpAddress) {
    data.client_ip_address = userData.clientIpAddress;
  }

  if (userData.clientUserAgent) {
    data.client_user_agent = userData.clientUserAgent;
  }

  if (userData.fbp) {
    data.fbp = userData.fbp;
  }

  if (userData.fbc) {
    data.fbc = userData.fbc;
  }

  if (userData.externalId) {
    const hashed = hashString(userData.externalId);
    if (hashed) data.external_id = [hashed];
  }

  if (advancedMatching) {
    if (userData.email) {
      const hashedEmail = normalizeAndHashEmail(userData.email);
      if (hashedEmail) data.em = [hashedEmail];
    }

    if (userData.phone) {
      const hashedPhone = normalizeAndHashPhone(userData.phone);
      if (hashedPhone) data.ph = [hashedPhone];
    }

    if (userData.firstName) {
      const hashedFn = normalizeAndHashName(userData.firstName);
      if (hashedFn) data.fn = [hashedFn];
    }

    if (userData.lastName) {
      const hashedLn = normalizeAndHashName(userData.lastName);
      if (hashedLn) data.ln = [hashedLn];
    }

    if (userData.city) {
      const hashedCity = normalizeAndHashGeneric(userData.city);
      if (hashedCity) data.ct = [hashedCity];
    }

    if (userData.state) {
      const hashedState = normalizeAndHashGeneric(userData.state);
      if (hashedState) data.st = [hashedState];
    }

    if (userData.zip) {
      const hashedZip = normalizeAndHashGeneric(userData.zip);
      if (hashedZip) data.zp = [hashedZip];
    }

    if (userData.country) {
      const hashedCountry = normalizeAndHashGeneric(userData.country);
      if (hashedCountry) data.country = [hashedCountry];
    }
  }

  return data;
}

export function buildCapiEventPayload({
  eventName,
  eventId,
  eventTime,
  eventSourceUrl,
  actionSource = 'website',
  userData,
  customData,
  advancedMatchingEnabled = true
}: {
  eventName: MetaStandardEventName | string;
  eventId?: string;
  eventTime?: number;
  eventSourceUrl?: string;
  actionSource?: MetaCapiEventPayload['action_source'];
  userData?: MetaRawUserData;
  customData?: MetaCustomData;
  advancedMatchingEnabled?: boolean;
}): MetaCapiEventPayload {
  const payload: MetaCapiEventPayload = {
    event_name: eventName,
    event_time: eventTime ?? Math.floor(Date.now() / 1000),
    action_source: actionSource,
    user_data: buildCapiUserData(userData, { advancedMatchingEnabled })
  };

  if (eventId) {
    payload.event_id = eventId;
  }

  if (eventSourceUrl) {
    payload.event_source_url = eventSourceUrl;
  }

  if (customData && Object.keys(customData).length > 0) {
    payload.custom_data = customData;
  }

  return payload;
}
