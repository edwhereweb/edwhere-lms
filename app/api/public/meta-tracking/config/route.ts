import { NextResponse } from 'next/server';
import { getMetaTrackingSettings, getPublicMetaTrackingConfig } from '@/lib/meta-tracking/settings';
import { handleApiError } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const settings = await getMetaTrackingSettings();
    const publicConfig = getPublicMetaTrackingConfig(settings);

    return NextResponse.json(publicConfig, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
      }
    });
  } catch (error) {
    return handleApiError('PUBLIC_META_TRACKING_CONFIG', error);
  }
}
