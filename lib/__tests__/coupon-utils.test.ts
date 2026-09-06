import {
  CAMPAIGN_TOKEN_PARAM,
  buildCouponLandingUrl,
  calculateDiscountInPaise,
  getCouponStatus,
  normalizeCouponCode
} from '../coupon-utils';

describe('lib/coupon-utils', () => {
  describe('buildCouponLandingUrl', () => {
    const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL;

    afterEach(() => {
      process.env.NEXT_PUBLIC_APP_URL = originalAppUrl;
    });

    it('builds a course-specific URL with the campaign token query param', () => {
      process.env.NEXT_PUBLIC_APP_URL = 'https://learn.example.com';
      const url = buildCouponLandingUrl({ campaignToken: 'META_AWS_50', courseId: 'course123' });
      expect(url).toBe(
        `https://learn.example.com/courses/course123?${CAMPAIGN_TOKEN_PARAM}=META_AWS_50`
      );
    });

    it('falls back to the course catalog when no course is provided', () => {
      process.env.NEXT_PUBLIC_APP_URL = 'https://learn.example.com';
      const url = buildCouponLandingUrl({ campaignToken: 'META_AWS_50' });
      expect(url).toBe(`https://learn.example.com/courses?${CAMPAIGN_TOKEN_PARAM}=META_AWS_50`);
    });

    it('strips trailing slashes from the base URL and honors an explicit override', () => {
      const url = buildCouponLandingUrl({
        campaignToken: 'TOK',
        courseId: 'abc',
        baseUrl: 'https://custom.example.com/'
      });
      expect(url).toBe(`https://custom.example.com/courses/abc?${CAMPAIGN_TOKEN_PARAM}=TOK`);
    });

    it('falls back to the default app URL when none is configured', () => {
      delete process.env.NEXT_PUBLIC_APP_URL;
      const url = buildCouponLandingUrl({ campaignToken: 'TOK' });
      expect(url).toBe(`https://learn.edwhere.com/courses?${CAMPAIGN_TOKEN_PARAM}=TOK`);
    });
  });

  describe('normalizeCouponCode', () => {
    it('trims whitespace and uppercases the code', () => {
      expect(normalizeCouponCode('  save50 ')).toBe('SAVE50');
    });
  });

  describe('calculateDiscountInPaise', () => {
    it('computes a percentage discount clamped to the original amount', () => {
      expect(calculateDiscountInPaise({ type: 'PERCENT', value: 50 }, 10000)).toBe(5000);
      expect(calculateDiscountInPaise({ type: 'PERCENT', value: 150 }, 10000)).toBe(10000);
    });

    it('computes a fixed discount without exceeding the original amount', () => {
      expect(calculateDiscountInPaise({ type: 'FIXED', value: 20 }, 10000)).toBe(2000);
      expect(calculateDiscountInPaise({ type: 'FIXED', value: 500 }, 10000)).toBe(10000);
    });
  });

  describe('getCouponStatus', () => {
    const now = new Date('2024-06-01T00:00:00Z');

    it('returns inactive when the coupon is disabled', () => {
      expect(getCouponStatus({ isActive: false, startsAt: null, expiresAt: null }, now)).toBe(
        'inactive'
      );
    });

    it('returns expired when past the expiry date', () => {
      expect(
        getCouponStatus(
          { isActive: true, startsAt: null, expiresAt: new Date('2024-01-01T00:00:00Z') },
          now
        )
      ).toBe('expired');
    });

    it('returns scheduled when before the start date', () => {
      expect(
        getCouponStatus(
          { isActive: true, startsAt: new Date('2024-12-01T00:00:00Z'), expiresAt: null },
          now
        )
      ).toBe('scheduled');
    });

    it('returns active otherwise', () => {
      expect(getCouponStatus({ isActive: true, startsAt: null, expiresAt: null }, now)).toBe(
        'active'
      );
    });
  });
});
