import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateBody, apiError, handleApiError } from '@/lib/api-utils';
import { updateMetaTrackingSettingsSchema } from '@/lib/validations';
import {
  DEFAULT_META_TRACKING_SETTINGS,
  getMetaTrackingSettings,
  maskAccessToken
} from '@/lib/meta-tracking/settings';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const profile = await db.profile.findUnique({ where: { userId } });
    if (!profile || profile.role !== 'ADMIN') {
      return apiError('Forbidden — only admins can view tracking settings', 403);
    }

    const settings = await getMetaTrackingSettings();

    return NextResponse.json({
      ...settings,
      hasAccessToken: Boolean(settings.metaAccessToken),
      maskedAccessToken: maskAccessToken(settings.metaAccessToken),
      metaAccessToken: undefined // Never send raw token to client
    });
  } catch (error) {
    return handleApiError('ADMIN_META_TRACKING_GET', error);
  }
}

export async function PATCH(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const profile = await db.profile.findUnique({ where: { userId } });
    if (!profile || profile.role !== 'ADMIN') {
      return apiError('Forbidden — only admins can update tracking settings', 403);
    }

    const body = await req.json();
    const validation = validateBody(updateMetaTrackingSettingsSchema, body);
    if (!validation.success) return validation.response;

    const data = validation.data;

    const existing = await db.metaTrackingSettings.findFirst({
      orderBy: { createdAt: 'desc' }
    });

    let newAccessToken = existing?.metaAccessToken ?? null;
    if (data.metaAccessToken !== undefined) {
      if (data.metaAccessToken === null || data.metaAccessToken.trim() === '') {
        newAccessToken = null;
      } else if (!data.metaAccessToken.startsWith('•••')) {
        newAccessToken = data.metaAccessToken.trim();
      }
    }

    const updatePayload = {
      metaTrackingEnabled:
        data.metaTrackingEnabled ??
        existing?.metaTrackingEnabled ??
        DEFAULT_META_TRACKING_SETTINGS.metaTrackingEnabled,
      metaPixelId:
        data.metaPixelId !== undefined
          ? data.metaPixelId?.trim() || null
          : (existing?.metaPixelId ?? null),
      metaAccessToken: newAccessToken,
      metaTestEventCode:
        data.metaTestEventCode !== undefined
          ? data.metaTestEventCode?.trim() || null
          : (existing?.metaTestEventCode ?? null),
      metaTrackingMode:
        data.metaTrackingMode ??
        existing?.metaTrackingMode ??
        DEFAULT_META_TRACKING_SETTINGS.metaTrackingMode,

      trackPageView:
        data.trackPageView ??
        existing?.trackPageView ??
        DEFAULT_META_TRACKING_SETTINGS.trackPageView,
      trackViewContent:
        data.trackViewContent ??
        existing?.trackViewContent ??
        DEFAULT_META_TRACKING_SETTINGS.trackViewContent,
      trackCompleteRegistration:
        data.trackCompleteRegistration ??
        existing?.trackCompleteRegistration ??
        DEFAULT_META_TRACKING_SETTINGS.trackCompleteRegistration,
      trackInitiateCheckout:
        data.trackInitiateCheckout ??
        existing?.trackInitiateCheckout ??
        DEFAULT_META_TRACKING_SETTINGS.trackInitiateCheckout,
      trackPurchase:
        data.trackPurchase ??
        existing?.trackPurchase ??
        DEFAULT_META_TRACKING_SETTINGS.trackPurchase,
      trackSearch:
        data.trackSearch ?? existing?.trackSearch ?? DEFAULT_META_TRACKING_SETTINGS.trackSearch,
      trackLead: data.trackLead ?? existing?.trackLead ?? DEFAULT_META_TRACKING_SETTINGS.trackLead,
      trackAddToCart:
        data.trackAddToCart ??
        existing?.trackAddToCart ??
        DEFAULT_META_TRACKING_SETTINGS.trackAddToCart,
      trackContact:
        data.trackContact ?? existing?.trackContact ?? DEFAULT_META_TRACKING_SETTINGS.trackContact,

      advancedMatchingEnabled:
        data.advancedMatchingEnabled ??
        existing?.advancedMatchingEnabled ??
        DEFAULT_META_TRACKING_SETTINGS.advancedMatchingEnabled,
      consentRequired:
        data.consentRequired ??
        existing?.consentRequired ??
        DEFAULT_META_TRACKING_SETTINGS.consentRequired,
      debugEnabled:
        data.debugEnabled ?? existing?.debugEnabled ?? DEFAULT_META_TRACKING_SETTINGS.debugEnabled,

      updatedByUserId: userId
    };

    let updated;
    if (existing) {
      updated = await db.metaTrackingSettings.update({
        where: { id: existing.id },
        data: updatePayload
      });
    } else {
      updated = await db.metaTrackingSettings.create({
        data: updatePayload
      });
    }

    return NextResponse.json({
      ...updated,
      hasAccessToken: Boolean(updated.metaAccessToken),
      maskedAccessToken: maskAccessToken(updated.metaAccessToken),
      metaAccessToken: undefined
    });
  } catch (error) {
    return handleApiError('ADMIN_META_TRACKING_PATCH', error);
  }
}
