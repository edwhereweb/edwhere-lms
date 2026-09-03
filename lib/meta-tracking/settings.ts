import { db } from '@/lib/db';
import { logError } from '@/lib/debug';
import { MetaTrackingSettingsData, PublicMetaTrackingConfig, MetaStandardEventName } from './types';

export const DEFAULT_META_TRACKING_SETTINGS: MetaTrackingSettingsData = {
  metaTrackingEnabled: false,
  metaPixelId: null,
  metaAccessToken: null,
  metaTestEventCode: null,
  metaTrackingMode: 'OFF',
  trackPageView: false,
  trackViewContent: false,
  trackCompleteRegistration: false,
  trackInitiateCheckout: false,
  trackPurchase: false,
  trackSearch: false,
  trackLead: false,
  trackAddToCart: false,
  trackContact: false,
  advancedMatchingEnabled: false,
  consentRequired: false,
  debugEnabled: false,
  updatedByUserId: null,
  createdAt: null,
  updatedAt: null
};

export const maskAccessToken = (token: string | null | undefined): string | null => {
  if (!token) return null;
  const trimmed = token.trim();
  if (!trimmed) return null;
  if (trimmed.length <= 6) return '••••••';
  return `••••••••••••${trimmed.slice(-4)}`;
};

export async function getMetaTrackingSettings(): Promise<MetaTrackingSettingsData> {
  try {
    const settings = await db.metaTrackingSettings.findFirst({
      orderBy: { createdAt: 'desc' }
    });

    if (!settings) {
      return { ...DEFAULT_META_TRACKING_SETTINGS };
    }

    return {
      id: settings.id,
      metaTrackingEnabled: settings.metaTrackingEnabled,
      metaPixelId: settings.metaPixelId,
      metaAccessToken: settings.metaAccessToken,
      metaTestEventCode: settings.metaTestEventCode,
      metaTrackingMode: settings.metaTrackingMode as MetaTrackingSettingsData['metaTrackingMode'],
      trackPageView: settings.trackPageView,
      trackViewContent: settings.trackViewContent,
      trackCompleteRegistration: settings.trackCompleteRegistration,
      trackInitiateCheckout: settings.trackInitiateCheckout,
      trackPurchase: settings.trackPurchase,
      trackSearch: settings.trackSearch,
      trackLead: settings.trackLead,
      trackAddToCart: settings.trackAddToCart,
      trackContact: settings.trackContact,
      advancedMatchingEnabled: settings.advancedMatchingEnabled,
      consentRequired: settings.consentRequired,
      debugEnabled: settings.debugEnabled,
      updatedByUserId: settings.updatedByUserId,
      createdAt: settings.createdAt,
      updatedAt: settings.updatedAt
    };
  } catch (error) {
    logError('GET_META_TRACKING_SETTINGS', error);
    return { ...DEFAULT_META_TRACKING_SETTINGS };
  }
}

export function getPublicMetaTrackingConfig(
  settings: MetaTrackingSettingsData = DEFAULT_META_TRACKING_SETTINGS
): PublicMetaTrackingConfig {
  return {
    metaTrackingEnabled: settings.metaTrackingEnabled,
    metaPixelId: settings.metaPixelId,
    metaTrackingMode: settings.metaTrackingMode,
    trackPageView: settings.trackPageView,
    trackViewContent: settings.trackViewContent,
    trackCompleteRegistration: settings.trackCompleteRegistration,
    trackInitiateCheckout: settings.trackInitiateCheckout,
    trackPurchase: settings.trackPurchase,
    trackSearch: settings.trackSearch,
    trackLead: settings.trackLead,
    trackAddToCart: settings.trackAddToCart,
    trackContact: settings.trackContact,
    advancedMatchingEnabled: settings.advancedMatchingEnabled,
    consentRequired: settings.consentRequired,
    debugEnabled: settings.debugEnabled
  };
}

export function isEventTrackingEnabled(
  settings: MetaTrackingSettingsData | PublicMetaTrackingConfig,
  eventName: MetaStandardEventName | string
): boolean {
  if (!settings.metaTrackingEnabled) return false;
  if (settings.metaTrackingMode === 'OFF') return false;

  switch (eventName) {
    case 'PageView':
      return settings.trackPageView;
    case 'ViewContent':
      return settings.trackViewContent;
    case 'CompleteRegistration':
      return settings.trackCompleteRegistration;
    case 'InitiateCheckout':
      return settings.trackInitiateCheckout;
    case 'Purchase':
      return settings.trackPurchase;
    case 'Search':
      return settings.trackSearch;
    case 'Lead':
      return settings.trackLead;
    case 'AddToCart':
      return settings.trackAddToCart;
    case 'Contact':
      return settings.trackContact;
    default:
      return true;
  }
}

export function isPixelTrackingActive(
  settings: MetaTrackingSettingsData | PublicMetaTrackingConfig
): boolean {
  return (
    settings.metaTrackingEnabled &&
    Boolean(settings.metaPixelId) &&
    (settings.metaTrackingMode === 'PIXEL' || settings.metaTrackingMode === 'HYBRID')
  );
}

export function isCapiTrackingActive(settings: MetaTrackingSettingsData): boolean {
  return (
    settings.metaTrackingEnabled &&
    Boolean(settings.metaPixelId) &&
    Boolean(settings.metaAccessToken) &&
    (settings.metaTrackingMode === 'CAPI' || settings.metaTrackingMode === 'HYBRID')
  );
}
