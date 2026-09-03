'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useTransition,
  Suspense
} from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  PublicMetaTrackingConfig,
  MetaStandardEventName,
  MetaCustomData,
  MetaRawUserData
} from '@/lib/meta-tracking/types';
import {
  initMetaPixel,
  trackPixelEvent,
  trackCustomPixelEvent,
  setStoredConsent,
  getStoredConsent
} from '@/lib/meta-tracking/pixel';

interface MetaPixelContextType {
  config: PublicMetaTrackingConfig | null;
  track: (
    eventName: MetaStandardEventName,
    customData?: MetaCustomData,
    options?: { eventId?: string }
  ) => boolean;
  trackCustom: (
    eventName: string,
    customData?: MetaCustomData,
    options?: { eventId?: string }
  ) => boolean;
  setConsent: (granted: boolean) => void;
  consentGranted: boolean | null;
  isReady: boolean;
}

const MetaPixelContext = createContext<MetaPixelContextType>({
  config: null,
  track: () => false,
  trackCustom: () => false,
  setConsent: () => {},
  consentGranted: null,
  isReady: false
});

export const useMetaPixel = () => useContext(MetaPixelContext);

interface MetaPixelProviderProps {
  children: React.ReactNode;
  initialConfig?: PublicMetaTrackingConfig | null;
  initialUserData?: MetaRawUserData;
}

function PageViewTracker({ config }: { config: PublicMetaTrackingConfig | null }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!config || !config.metaTrackingEnabled || !config.trackPageView) return;
    const timer = setTimeout(() => {
      trackPixelEvent(config, 'PageView', {
        page_path: pathname,
        page_query: searchParams?.toString()
      });
    }, 100);

    return () => clearTimeout(timer);
  }, [pathname, searchParams, config]);

  return null;
}

export function MetaPixelProvider({
  children,
  initialConfig = null,
  initialUserData
}: MetaPixelProviderProps) {
  const [config, setConfig] = useState<PublicMetaTrackingConfig | null>(initialConfig);
  const [consentGranted, setConsentGrantedState] = useState<boolean | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [, startTransition] = useTransition();

  // Load initial consent state from localStorage on client mount
  useEffect(() => {
    setConsentGrantedState(getStoredConsent());
  }, []);

  // Fetch public config if not provided
  useEffect(() => {
    if (config) {
      setIsReady(true);
      return;
    }

    let isMounted = true;
    fetch('/api/public/meta-tracking/config')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: PublicMetaTrackingConfig | null) => {
        if (isMounted && data) {
          startTransition(() => {
            setConfig(data);
            setIsReady(true);
          });
        }
      })
      .catch(() => {
        // Safe failover: config remains null, no tracking fires
        if (isMounted) setIsReady(true);
      });

    return () => {
      isMounted = false;
    };
  }, [config]);

  // Initialize pixel when config is available
  useEffect(() => {
    if (!config || !config.metaTrackingEnabled) return;
    initMetaPixel(config, initialUserData);
  }, [config, initialUserData]);

  const track = (
    eventName: MetaStandardEventName,
    customData?: MetaCustomData,
    options?: { eventId?: string }
  ): boolean => {
    if (!config) return false;
    return trackPixelEvent(config, eventName, customData, options);
  };

  const trackCustom = (
    eventName: string,
    customData?: MetaCustomData,
    options?: { eventId?: string }
  ): boolean => {
    if (!config) return false;
    return trackCustomPixelEvent(config, eventName, customData, options);
  };

  const setConsent = (granted: boolean) => {
    setStoredConsent(granted);
    setConsentGrantedState(granted);
    if (config && granted) {
      initMetaPixel(config, initialUserData);
    }
  };

  return (
    <MetaPixelContext.Provider
      value={{
        config,
        track,
        trackCustom,
        setConsent,
        consentGranted,
        isReady
      }}
    >
      <Suspense fallback={null}>
        <PageViewTracker config={config} />
      </Suspense>
      {children}
    </MetaPixelContext.Provider>
  );
}
