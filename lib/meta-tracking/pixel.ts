'use client';

import {
  MetaCustomData,
  MetaRawUserData,
  MetaStandardEventName,
  PublicMetaTrackingConfig
} from './types';
import { isEventTrackingEnabled, isPixelTrackingActive } from './settings';

declare global {
  interface Window {
    fbq?: {
      (action: string, ...args: unknown[]): void;
      callMethod?: (...args: unknown[]) => void;
      queue?: unknown[];
      loaded?: boolean;
      version?: string;
      push?: (...args: unknown[]) => void;
    };
    _fbq?: Window['fbq'];
    __META_PIXEL_LOADED__?: boolean;
    __META_PIXEL_INITIALIZED_ID__?: string;
  }
}

const CONSENT_STORAGE_KEY = 'edwhere_meta_tracking_consent';

export function getStoredConsent(): boolean | null {
  if (typeof window === 'undefined') return null;
  try {
    const val = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (val === 'granted') return true;
    if (val === 'denied') return false;
    return null;
  } catch {
    return null;
  }
}

export function setStoredConsent(granted: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, granted ? 'granted' : 'denied');
    if (window.fbq) {
      window.fbq('consent', granted ? 'grant' : 'revoke');
    }
  } catch {
    // ignore storage errors
  }
}

export function isConsentSatisfied(config: PublicMetaTrackingConfig): boolean {
  if (!config.consentRequired) return true;
  return getStoredConsent() === true;
}

export function loadMetaPixelScript(): void {
  if (typeof window === 'undefined') return;
  if (window.__META_PIXEL_LOADED__ || window.fbq) return;

  try {
    /* eslint-disable */
    (function (f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
      if (f.fbq) return;
      n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = true;
      n.version = '2.0';
      n.queue = [];
      t = b.createElement(e);
      t.async = true;
      t.src = v;
      s = b.getElementsByTagName(e)[0];
      s?.parentNode?.insertBefore(t, s);
    })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    /* eslint-enable */

    window.__META_PIXEL_LOADED__ = true;
  } catch {
    // Fail-safe script injection
  }
}

export function initMetaPixel(
  config: PublicMetaTrackingConfig,
  userData?: MetaRawUserData
): boolean {
  if (typeof window === 'undefined') return false;
  if (!isPixelTrackingActive(config)) return false;

  const pixelId = config.metaPixelId?.trim();
  if (!pixelId) return false;

  try {
    loadMetaPixelScript();

    if (!window.fbq) return false;

    if (config.consentRequired) {
      const consent = getStoredConsent();
      if (consent === false) {
        window.fbq('consent', 'revoke');
      } else if (consent === true) {
        window.fbq('consent', 'grant');
      }
    }

    if (window.__META_PIXEL_INITIALIZED_ID__ !== pixelId) {
      const advancedMatchingData: Record<string, string> = {};
      if (config.advancedMatchingEnabled && userData) {
        if (userData.email) advancedMatchingData.em = userData.email.trim().toLowerCase();
        if (userData.phone) advancedMatchingData.ph = userData.phone.replace(/\D/g, '');
        if (userData.firstName) advancedMatchingData.fn = userData.firstName.trim().toLowerCase();
        if (userData.lastName) advancedMatchingData.ln = userData.lastName.trim().toLowerCase();
        if (userData.externalId) advancedMatchingData.external_id = userData.externalId.trim();
        if (userData.city) advancedMatchingData.ct = userData.city.trim().toLowerCase();
        if (userData.state) advancedMatchingData.st = userData.state.trim().toLowerCase();
        if (userData.zip) advancedMatchingData.zp = userData.zip.trim().toLowerCase();
        if (userData.country) advancedMatchingData.country = userData.country.trim().toLowerCase();
      }

      if (Object.keys(advancedMatchingData).length > 0) {
        window.fbq('init', pixelId, advancedMatchingData);
      } else {
        window.fbq('init', pixelId);
      }

      window.__META_PIXEL_INITIALIZED_ID__ = pixelId;
    }

    return true;
  } catch {
    return false;
  }
}

export function trackPixelEvent(
  config: PublicMetaTrackingConfig | null | undefined,
  eventName: MetaStandardEventName,
  customData?: MetaCustomData,
  options?: { eventId?: string }
): boolean {
  if (typeof window === 'undefined') return false;
  if (!config || !isPixelTrackingActive(config)) return false;
  if (!isConsentSatisfied(config)) return false;
  if (!isEventTrackingEnabled(config, eventName)) return false;
  if (!window.fbq) return false;

  try {
    const eventParams = customData ? { ...customData } : {};
    const eventOptions = options?.eventId ? { eventID: options.eventId } : undefined;

    if (eventOptions) {
      window.fbq('track', eventName, eventParams, eventOptions);
    } else {
      window.fbq('track', eventName, eventParams);
    }

    return true;
  } catch {
    return false;
  }
}

export function trackCustomPixelEvent(
  config: PublicMetaTrackingConfig | null | undefined,
  customEventName: string,
  customData?: MetaCustomData,
  options?: { eventId?: string }
): boolean {
  if (typeof window === 'undefined') return false;
  if (!config || !isPixelTrackingActive(config)) return false;
  if (!isConsentSatisfied(config)) return false;
  if (!window.fbq) return false;

  try {
    const eventParams = customData ? { ...customData } : {};
    const eventOptions = options?.eventId ? { eventID: options.eventId } : undefined;

    if (eventOptions) {
      window.fbq('trackCustom', customEventName, eventParams, eventOptions);
    } else {
      window.fbq('trackCustom', customEventName, eventParams);
    }

    return true;
  } catch {
    return false;
  }
}
