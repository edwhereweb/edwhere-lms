export type MetaTrackingMode = 'OFF' | 'PIXEL' | 'CAPI' | 'HYBRID';

export interface MetaTrackingSettingsData {
  id?: string;
  metaTrackingEnabled: boolean;
  metaPixelId: string | null;
  metaAccessToken: string | null;
  metaTestEventCode: string | null;
  metaTrackingMode: MetaTrackingMode;

  trackPageView: boolean;
  trackViewContent: boolean;
  trackCompleteRegistration: boolean;
  trackInitiateCheckout: boolean;
  trackPurchase: boolean;
  trackSearch: boolean;
  trackLead: boolean;
  trackAddToCart: boolean;
  trackContact: boolean;

  advancedMatchingEnabled: boolean;
  consentRequired: boolean;
  debugEnabled: boolean;

  updatedByUserId?: string | null;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
}

export interface PublicMetaTrackingConfig {
  metaTrackingEnabled: boolean;
  metaPixelId: string | null;
  metaTrackingMode: MetaTrackingMode;

  trackPageView: boolean;
  trackViewContent: boolean;
  trackCompleteRegistration: boolean;
  trackInitiateCheckout: boolean;
  trackPurchase: boolean;
  trackSearch: boolean;
  trackLead: boolean;
  trackAddToCart: boolean;
  trackContact: boolean;

  advancedMatchingEnabled: boolean;
  consentRequired: boolean;
  debugEnabled: boolean;
}

export type MetaStandardEventName =
  | 'PageView'
  | 'ViewContent'
  | 'Search'
  | 'AddToCart'
  | 'InitiateCheckout'
  | 'Purchase'
  | 'CompleteRegistration'
  | 'Lead'
  | 'Contact';

export interface MetaCustomData {
  currency?: string;
  value?: number;
  content_ids?: string[];
  content_name?: string;
  content_type?: string;
  content_category?: string;
  contents?: Array<{
    id: string;
    quantity?: number;
    item_price?: number;
    title?: string;
  }>;
  num_items?: number;
  search_string?: string;
  order_id?: string;
  status?: string;
  [key: string]: unknown;
}

export interface MetaRawUserData {
  email?: string | null;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  externalId?: string | null;
  clientIpAddress?: string | null;
  clientUserAgent?: string | null;
  fbp?: string | null;
  fbc?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  country?: string | null;
}

export interface MetaCapiEventPayload {
  event_name: string;
  event_time: number;
  event_id?: string;
  event_source_url?: string;
  action_source:
    | 'website'
    | 'email'
    | 'app'
    | 'phone_call'
    | 'chat'
    | 'physical_store'
    | 'system_generated'
    | 'other';
  user_data: {
    em?: string[];
    ph?: string[];
    fn?: string[];
    ln?: string[];
    external_id?: string[];
    client_ip_address?: string;
    client_user_agent?: string;
    fbp?: string;
    fbc?: string;
    ct?: string[];
    st?: string[];
    zp?: string[];
    country?: string[];
    [key: string]: unknown;
  };
  custom_data?: MetaCustomData;
  opt_out?: boolean;
}

export interface MetaCapiSendResult {
  success: boolean;
  skipped?: boolean;
  reason?: string;
  eventsReceived?: number;
  fbtraceId?: string;
  error?: string;
}
