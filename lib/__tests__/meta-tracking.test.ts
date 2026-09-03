import {
  DEFAULT_META_TRACKING_SETTINGS,
  buildCapiEventPayload,
  buildCapiUserData,
  generateEventId,
  getPublicMetaTrackingConfig,
  isCapiTrackingActive,
  isEventTrackingEnabled,
  isPixelTrackingActive,
  maskAccessToken,
  normalizeAndHashEmail,
  normalizeAndHashPhone,
  sendCapiEvent,
  initMetaPixel,
  trackPixelEvent,
  trackCustomPixelEvent,
  getMetaTrackingSettings
} from '../meta-tracking';
import { db } from '../db';

jest.mock('../db', () => ({
  db: {
    metaTrackingSettings: {
      findFirst: jest.fn(),
      upsert: jest.fn()
    }
  }
}));

describe('Meta Tracking - Safe Inactive Defaults', () => {
  it('defaults to tracking disabled with mode OFF', () => {
    expect(DEFAULT_META_TRACKING_SETTINGS.metaTrackingEnabled).toBe(false);
    expect(DEFAULT_META_TRACKING_SETTINGS.metaTrackingMode).toBe('OFF');
    expect(DEFAULT_META_TRACKING_SETTINGS.metaPixelId).toBeNull();
    expect(DEFAULT_META_TRACKING_SETTINGS.metaAccessToken).toBeNull();
    expect(DEFAULT_META_TRACKING_SETTINGS.metaTestEventCode).toBeNull();
    expect(DEFAULT_META_TRACKING_SETTINGS.advancedMatchingEnabled).toBe(false);
    expect(DEFAULT_META_TRACKING_SETTINGS.consentRequired).toBe(false);
    expect(DEFAULT_META_TRACKING_SETTINGS.debugEnabled).toBe(false);
  });

  it('defaults all event toggles to false', () => {
    expect(DEFAULT_META_TRACKING_SETTINGS.trackPageView).toBe(false);
    expect(DEFAULT_META_TRACKING_SETTINGS.trackViewContent).toBe(false);
    expect(DEFAULT_META_TRACKING_SETTINGS.trackCompleteRegistration).toBe(false);
    expect(DEFAULT_META_TRACKING_SETTINGS.trackInitiateCheckout).toBe(false);
    expect(DEFAULT_META_TRACKING_SETTINGS.trackPurchase).toBe(false);
    expect(DEFAULT_META_TRACKING_SETTINGS.trackSearch).toBe(false);
    expect(DEFAULT_META_TRACKING_SETTINGS.trackLead).toBe(false);
    expect(DEFAULT_META_TRACKING_SETTINGS.trackAddToCart).toBe(false);
    expect(DEFAULT_META_TRACKING_SETTINGS.trackContact).toBe(false);
  });
});

describe('Meta Tracking - Mode & Event Activation Helpers', () => {
  it('evaluates pixel tracking active state correctly', () => {
    // Disabled globally
    expect(
      isPixelTrackingActive({
        ...DEFAULT_META_TRACKING_SETTINGS,
        metaTrackingEnabled: false,
        metaPixelId: '123456',
        metaTrackingMode: 'PIXEL'
      })
    ).toBe(false);

    // Enabled but missing Pixel ID
    expect(
      isPixelTrackingActive({
        ...DEFAULT_META_TRACKING_SETTINGS,
        metaTrackingEnabled: true,
        metaPixelId: null,
        metaTrackingMode: 'PIXEL'
      })
    ).toBe(false);

    // Enabled with Pixel ID in PIXEL mode
    expect(
      isPixelTrackingActive({
        ...DEFAULT_META_TRACKING_SETTINGS,
        metaTrackingEnabled: true,
        metaPixelId: '123456',
        metaTrackingMode: 'PIXEL'
      })
    ).toBe(true);

    // Enabled with Pixel ID in HYBRID mode
    expect(
      isPixelTrackingActive({
        ...DEFAULT_META_TRACKING_SETTINGS,
        metaTrackingEnabled: true,
        metaPixelId: '123456',
        metaTrackingMode: 'HYBRID'
      })
    ).toBe(true);

    // Enabled in CAPI only mode
    expect(
      isPixelTrackingActive({
        ...DEFAULT_META_TRACKING_SETTINGS,
        metaTrackingEnabled: true,
        metaPixelId: '123456',
        metaTrackingMode: 'CAPI'
      })
    ).toBe(false);
  });

  it('evaluates CAPI tracking active state correctly', () => {
    // Missing access token
    expect(
      isCapiTrackingActive({
        ...DEFAULT_META_TRACKING_SETTINGS,
        metaTrackingEnabled: true,
        metaPixelId: '123456',
        metaAccessToken: null,
        metaTrackingMode: 'CAPI'
      })
    ).toBe(false);

    // CAPI mode with token
    expect(
      isCapiTrackingActive({
        ...DEFAULT_META_TRACKING_SETTINGS,
        metaTrackingEnabled: true,
        metaPixelId: '123456',
        metaAccessToken: 'EAAB12345',
        metaTrackingMode: 'CAPI'
      })
    ).toBe(true);

    // HYBRID mode with token
    expect(
      isCapiTrackingActive({
        ...DEFAULT_META_TRACKING_SETTINGS,
        metaTrackingEnabled: true,
        metaPixelId: '123456',
        metaAccessToken: 'EAAB12345',
        metaTrackingMode: 'HYBRID'
      })
    ).toBe(true);

    // PIXEL only mode
    expect(
      isCapiTrackingActive({
        ...DEFAULT_META_TRACKING_SETTINGS,
        metaTrackingEnabled: true,
        metaPixelId: '123456',
        metaAccessToken: 'EAAB12345',
        metaTrackingMode: 'PIXEL'
      })
    ).toBe(false);
  });

  it('evaluates event toggles correctly', () => {
    const activeConfig = {
      ...DEFAULT_META_TRACKING_SETTINGS,
      metaTrackingEnabled: true,
      metaTrackingMode: 'HYBRID' as const,
      trackPurchase: true,
      trackPageView: false
    };

    expect(isEventTrackingEnabled(activeConfig, 'Purchase')).toBe(true);
    expect(isEventTrackingEnabled(activeConfig, 'PageView')).toBe(false);

    const disabledConfig = {
      ...activeConfig,
      metaTrackingEnabled: false
    };
    expect(isEventTrackingEnabled(disabledConfig, 'Purchase')).toBe(false);
  });
});

describe('Meta Tracking - Normalization, Hashing & Event IDs', () => {
  it('normalizes and hashes email using SHA-256', () => {
    const rawEmail = '  Test.Learner@Edwhere.com  ';
    const hashed = normalizeAndHashEmail(rawEmail);
    expect(hashed).toBeDefined();
    expect(typeof hashed).toBe('string');
    expect(hashed).toHaveLength(64);

    // Same normalized email produces identical hash
    const hashed2 = normalizeAndHashEmail('test.learner@edwhere.com');
    expect(hashed).toBe(hashed2);
  });

  it('normalizes and hashes phone numbers', () => {
    const phone1 = normalizeAndHashPhone('+91 98765-43210');
    const phone2 = normalizeAndHashPhone('919876543210');
    expect(phone1).toBe(phone2);
    expect(phone1).toHaveLength(64);
  });

  it('masks access tokens without leaking secrets', () => {
    expect(maskAccessToken(null)).toBeNull();
    expect(maskAccessToken(undefined)).toBeNull();
    expect(maskAccessToken('')).toBeNull();
    expect(maskAccessToken('short')).toBe('••••••');
    expect(maskAccessToken('EAABcd123456789xyz')).toBe('••••••••••••9xyz');
  });

  it('generates unique event IDs for deduplication with given prefix', () => {
    const id1 = generateEventId('purchase');
    const id2 = generateEventId('purchase');
    expect(id1.startsWith('purchase_')).toBe(true);
    expect(id2.startsWith('purchase_')).toBe(true);
    expect(id1).not.toBe(id2);
  });
});

describe('Meta Tracking - CAPI User Data and Payload Builder', () => {
  it('builds hashed user data when advanced matching is enabled', () => {
    const userData = buildCapiUserData(
      {
        email: 'Learner@edwhere.com',
        phone: '+91 9876543210',
        firstName: 'John',
        lastName: 'Doe',
        externalId: 'user_123',
        clientIpAddress: '1.2.3.4',
        clientUserAgent: 'Mozilla/5.0'
      },
      { advancedMatchingEnabled: true }
    );

    expect(userData.em).toBeDefined();
    expect(userData.em![0]).toHaveLength(64);
    expect(userData.ph).toBeDefined();
    expect(userData.fn).toBeDefined();
    expect(userData.ln).toBeDefined();
    expect(userData.external_id).toBeDefined();
    expect(userData.client_ip_address).toBe('1.2.3.4');
    expect(userData.client_user_agent).toBe('Mozilla/5.0');
  });

  it('builds CAPI event payload with custom data and test event code', () => {
    const payload = buildCapiEventPayload({
      eventName: 'Purchase',
      eventId: 'purchase_order_456',
      userData: {
        email: 'user@example.com',
        clientIpAddress: '127.0.0.1'
      },
      customData: {
        content_ids: ['course_xyz'],
        content_name: 'Next.js Mastery',
        value: 1999,
        currency: 'INR',
        order_id: 'order_456'
      },
      advancedMatchingEnabled: true
    });

    expect(payload.event_name).toBe('Purchase');
    expect(payload.event_id).toBe('purchase_order_456');
    expect(payload.action_source).toBe('website');
    expect(payload.custom_data?.value).toBe(1999);
    expect(payload.custom_data?.currency).toBe('INR');
    expect(payload.custom_data?.order_id).toBe('order_456');
    expect(payload.user_data.client_ip_address).toBe('127.0.0.1');
    expect(payload.user_data.em).toBeDefined();
  });
});

describe('Meta Tracking - Public Config Extraction', () => {
  it('strips sensitive access token and internal fields for public client delivery', () => {
    const settings = {
      ...DEFAULT_META_TRACKING_SETTINGS,
      id: 'settings_id_1',
      metaTrackingEnabled: true,
      metaPixelId: '9876543210',
      metaAccessToken: 'SECRET_ACCESS_TOKEN_DO_NOT_EXPOSE',
      metaTestEventCode: 'TEST1234',
      metaTrackingMode: 'HYBRID' as const,
      trackPageView: true,
      trackPurchase: true,
      advancedMatchingEnabled: true,
      consentRequired: false,
      debugEnabled: true
    };

    const publicConfig = getPublicMetaTrackingConfig(settings);
    expect(publicConfig.metaTrackingEnabled).toBe(true);
    expect(publicConfig.metaPixelId).toBe('9876543210');
    expect(publicConfig.metaTrackingMode).toBe('HYBRID');
    expect(publicConfig.trackPageView).toBe(true);
    expect(publicConfig.trackPurchase).toBe(true);
    expect(publicConfig.debugEnabled).toBe(true);

    // Verify sensitive secrets are never included
    expect((publicConfig as unknown as Record<string, unknown>).metaAccessToken).toBeUndefined();
    expect((publicConfig as unknown as Record<string, unknown>).metaTestEventCode).toBeUndefined();
    expect((publicConfig as unknown as Record<string, unknown>).id).toBeUndefined();
  });
});

describe('Meta Tracking - Database Settings & Fail-Safe Fallbacks', () => {
  it('falls back to DEFAULT_META_TRACKING_SETTINGS when db query returns null', async () => {
    (db.metaTrackingSettings.findFirst as jest.Mock).mockResolvedValueOnce(null);

    const settings = await getMetaTrackingSettings();
    expect(settings.metaTrackingEnabled).toBe(false);
    expect(settings.metaTrackingMode).toBe('OFF');
  });

  it('falls back to safe defaults if db throws an error', async () => {
    (db.metaTrackingSettings.findFirst as jest.Mock).mockRejectedValueOnce(
      new Error('DB Connection Failed')
    );

    const settings = await getMetaTrackingSettings();
    expect(settings.metaTrackingEnabled).toBe(false);
    expect(settings.metaTrackingMode).toBe('OFF');
  });
});

describe('Meta Tracking - Safe No-Throw Execution', () => {
  it('sendCapiEvent returns skipped when tracking is inactive without throwing', async () => {
    (db.metaTrackingSettings.findFirst as jest.Mock).mockResolvedValueOnce(null);

    const result = await sendCapiEvent({
      eventName: 'Purchase',
      customData: { value: 1000, currency: 'INR' }
    });

    expect(result.success).toBe(true);
    expect(result.skipped).toBe(true);
    expect(result.reason).toBeDefined();
  });

  it('trackPixelEvent does not throw in server or non-browser environments', () => {
    expect(() => {
      trackPixelEvent(
        {
          ...DEFAULT_META_TRACKING_SETTINGS,
          metaTrackingEnabled: true,
          metaPixelId: '123456',
          metaTrackingMode: 'PIXEL',
          trackPurchase: true
        },
        'Purchase',
        { value: 500 }
      );
    }).not.toThrow();
  });

  it('trackCustomPixelEvent does not throw in server or non-browser environments', () => {
    expect(() => {
      trackCustomPixelEvent(
        {
          ...DEFAULT_META_TRACKING_SETTINGS,
          metaTrackingEnabled: true,
          metaPixelId: '123456',
          metaTrackingMode: 'PIXEL'
        },
        'CustomCourseAction',
        { courseId: 'c1' }
      );
    }).not.toThrow();
  });

  it('initMetaPixel does not throw when pixel is unconfigured or in non-browser context', () => {
    expect(() => {
      initMetaPixel({
        ...DEFAULT_META_TRACKING_SETTINGS,
        metaTrackingEnabled: false,
        metaPixelId: null,
        metaTrackingMode: 'OFF'
      });
    }).not.toThrow();
  });
});
