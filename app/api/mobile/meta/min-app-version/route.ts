import { env } from '@/lib/env';
import { mobileSuccess, handleMobileApiError } from '@/lib/api-mobile-utils';

export async function GET() {
  try {
    return mobileSuccess({
      minIos: env.MOBILE_MIN_IOS,
      minAndroid: env.MOBILE_MIN_ANDROID,
      latestIos: env.MOBILE_LATEST_IOS,
      latestAndroid: env.MOBILE_LATEST_ANDROID,
      forceUpgrade: env.MOBILE_FORCE_UPGRADE
    });
  } catch (error) {
    return handleMobileApiError('MOBILE_META_MIN_APP_VERSION', error);
  }
}
