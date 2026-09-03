import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateBody, apiError, handleApiError } from '@/lib/api-utils';
import { testMetaTrackingEventSchema } from '@/lib/validations';
import { getMetaTrackingSettings } from '@/lib/meta-tracking/settings';
import { sendCapiEvent } from '@/lib/meta-tracking/capi';
import { generateEventId } from '@/lib/meta-tracking/event-builder';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const profile = await db.profile.findUnique({ where: { userId } });
    if (!profile || profile.role !== 'ADMIN') {
      return apiError('Forbidden — only admins can trigger test events', 403);
    }

    const body = await req.json().catch(() => ({}));
    const validation = validateBody(testMetaTrackingEventSchema, body);
    if (!validation.success) return validation.response;

    const { eventName = 'PageView', testEventCode } = validation.data;
    const settings = await getMetaTrackingSettings();

    if (!settings.metaPixelId || !settings.metaAccessToken) {
      return apiError('Pixel ID and Access Token are required before testing', 400);
    }

    const eventId = generateEventId('test');

    const testSettings = {
      ...settings,
      metaTrackingEnabled: true,
      metaTrackingMode: 'HYBRID' as const,
      trackPageView: true,
      trackViewContent: true,
      trackCompleteRegistration: true,
      trackInitiateCheckout: true,
      trackPurchase: true,
      trackSearch: true,
      trackLead: true,
      trackAddToCart: true,
      trackContact: true
    };

    const result = await sendCapiEvent({
      eventName,
      eventId,
      testEventCode: testEventCode || settings.metaTestEventCode,
      userData: {
        email: profile.email,
        firstName: profile.name.split(' ')[0] || 'Admin',
        lastName: profile.name.split(' ').slice(1).join(' ') || 'User',
        clientUserAgent: req.headers.get('user-agent') ?? undefined
      },
      customData: {
        status: 'test_event',
        content_name: 'Meta Tracking Connection Test'
      },
      settingsOverride: testSettings
    });

    if (!result.success) {
      return apiError(result.error || 'Failed to dispatch test event', 502);
    }

    return NextResponse.json({
      success: true,
      message: `Test event "${eventName}" dispatched to Meta Conversions API successfully`,
      eventId,
      eventsReceived: result.eventsReceived,
      fbtraceId: result.fbtraceId
    });
  } catch (error) {
    return handleApiError('ADMIN_META_TRACKING_TEST', error);
  }
}
