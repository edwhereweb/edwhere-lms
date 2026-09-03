import { debug, logError } from '@/lib/debug';
import {
  MetaCapiEventPayload,
  MetaCapiSendResult,
  MetaCustomData,
  MetaRawUserData,
  MetaStandardEventName,
  MetaTrackingSettingsData
} from './types';
import { getMetaTrackingSettings, isCapiTrackingActive, isEventTrackingEnabled } from './settings';
import { buildCapiEventPayload } from './event-builder';

interface SendCapiEventParams {
  eventName: MetaStandardEventName | string;
  eventId?: string;
  eventTime?: number;
  eventSourceUrl?: string;
  actionSource?: MetaCapiEventPayload['action_source'];
  userData?: MetaRawUserData;
  customData?: MetaCustomData;
  testEventCode?: string | null;
  settingsOverride?: MetaTrackingSettingsData;
}

const META_GRAPH_API_VERSION = 'v19.0';
const DEFAULT_CAPI_TIMEOUT_MS = 4000;

export async function sendCapiEvent({
  eventName,
  eventId,
  eventTime,
  eventSourceUrl,
  actionSource = 'website',
  userData,
  customData,
  testEventCode,
  settingsOverride
}: SendCapiEventParams): Promise<MetaCapiSendResult> {
  try {
    const settings = settingsOverride ?? (await getMetaTrackingSettings());

    if (!settings.metaTrackingEnabled) {
      return { success: true, skipped: true, reason: 'Tracking disabled globally' };
    }

    if (!isCapiTrackingActive(settings)) {
      return {
        success: true,
        skipped: true,
        reason: 'CAPI tracking inactive (mode or credentials not configured)'
      };
    }

    if (!isEventTrackingEnabled(settings, eventName)) {
      return {
        success: true,
        skipped: true,
        reason: `Event "${eventName}" is disabled in tracking toggles`
      };
    }

    const pixelId = settings.metaPixelId?.trim();
    const accessToken = settings.metaAccessToken?.trim();
    const activeTestEventCode = (testEventCode ?? settings.metaTestEventCode)?.trim();

    if (!pixelId || !accessToken) {
      return { success: true, skipped: true, reason: 'Missing Pixel ID or Access Token' };
    }

    const payload = buildCapiEventPayload({
      eventName,
      eventId,
      eventTime,
      eventSourceUrl,
      actionSource,
      userData,
      customData,
      advancedMatchingEnabled: settings.advancedMatchingEnabled
    });

    const body: {
      data: MetaCapiEventPayload[];
      test_event_code?: string;
    } = {
      data: [payload]
    };

    if (activeTestEventCode) {
      body.test_event_code = activeTestEventCode;
    }

    const endpoint = `https://graph.facebook.com/${META_GRAPH_API_VERSION}/${pixelId}/events?access_token=${encodeURIComponent(
      accessToken
    )}`;

    if (settings.debugEnabled) {
      debug('META_CAPI_DISPATCH', {
        eventName,
        eventId: payload.event_id,
        testEventCode: activeTestEventCode || undefined,
        customData: payload.custom_data
      });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_CAPI_TIMEOUT_MS);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const result = (await response.json()) as {
        events_received?: number;
        fbtrace_id?: string;
        error?: { message: string; type: string; code: number };
      };

      if (!response.ok || result.error) {
        const errMsg = result.error?.message || `HTTP ${response.status}`;
        if (settings.debugEnabled) {
          logError('META_CAPI_RESPONSE_ERROR', {
            status: response.status,
            error: result.error
          });
        }
        return {
          success: false,
          error: errMsg,
          fbtraceId: result.fbtrace_id
        };
      }

      if (settings.debugEnabled) {
        debug('META_CAPI_SUCCESS', {
          eventName,
          eventsReceived: result.events_received,
          fbtraceId: result.fbtrace_id
        });
      }

      return {
        success: true,
        eventsReceived: result.events_received,
        fbtraceId: result.fbtrace_id
      };
    } catch (fetchError: unknown) {
      clearTimeout(timeoutId);
      const isAbort = (fetchError as Error)?.name === 'AbortError';
      const errorMessage = isAbort ? 'CAPI request timed out' : String(fetchError);

      if (settings.debugEnabled) {
        logError('META_CAPI_FETCH_ERROR', { error: errorMessage });
      }

      return {
        success: false,
        error: errorMessage
      };
    }
  } catch (outerError: unknown) {
    logError('META_CAPI_UNHANDLED_ERROR', outerError);
    return {
      success: false,
      error: String(outerError)
    };
  }
}
