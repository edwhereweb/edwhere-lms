import { redirect } from 'next/navigation';
import { Activity } from 'lucide-react';
import getSafeProfile from '@/actions/get-safe-profile';
import { getMetaTrackingSettings, maskAccessToken } from '@/lib/meta-tracking/settings';
import { MetaTrackingForm } from './_components/meta-tracking-form';

export const dynamic = 'force-dynamic';

const MetaTrackingPage = async () => {
  const profile = await getSafeProfile();
  if (!profile || profile.role !== 'ADMIN') {
    return redirect('/dashboard');
  }

  const settings = await getMetaTrackingSettings();

  const safeSettings = {
    ...settings,
    hasAccessToken: Boolean(settings.metaAccessToken),
    maskedAccessToken: maskAccessToken(settings.metaAccessToken),
    metaAccessToken: null
  };

  return (
    <div className="p-6">
      <div className="flex items-center gap-x-2 mb-2">
        <Activity className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Meta Tracking Settings</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Configure Meta Pixel and Conversions API (CAPI) for ads optimization and conversion
        tracking. Changes take effect immediately without redeployment.
      </p>

      <MetaTrackingForm initialSettings={safeSettings} />
    </div>
  );
};

export default MetaTrackingPage;
